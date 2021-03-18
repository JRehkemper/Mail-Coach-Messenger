const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
app.use(cookieParser());
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const { disconnect } = require('process');
var usercount = 0;
var reqRoom;
var username;
const lineReader = require('line-reader');

var mysql = require('mysql');
const { exec } = require('child_process');

const bcrypt = require('bcrypt');
const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const fs = require('fs');
var creds = [];

//Add CurrentTimestamp for Logging
function currentTimestamp()
{
  let varArr = [];
  varArr.push(new Date().getFullYear());
  varArr.push(new Date().getMonth());
  varArr.push(new Date().getDate());
  varArr.push(new Date().getHours());
  varArr.push(new Date().getMinutes());
  varArr.push(new Date().getSeconds());
  for (i = 0; i < varArr.length; i++)
  {
    //Add leading Zero if smaller than 10
    if (varArr[i] < 10)
    {
      varArr[i] = "0"+varArr[i];
    }
  }
  let str = varArr[0] + "-" + varArr[1] + "-" + varArr[2] + " - " + varArr[3] + ":" + varArr[4] + ":" + varArr[5] + " - ";
  return str;
}

//Read Credentials for Database connection from File
function readCreds()
  {
    var str = "";
    str = fs.readFileSync('database.conf', 'utf-8');
    creds = str.split("\n");
  }


readCreds();
//Prepare Database connection
var con = mysql.createConnection({
  host: creds[0],
  user: creds[1],
  password: creds[2],
  database: creds[3],
  charset: 'utf8mb4',
  insecureAuth: false
});

//Create Database connection
con.connect(function (err) {
  if (err);
  console.log(currentTimestamp() + "INFO - Connected to Database!");
});

//Serve content of Publi Filder
app.use(express.static(path.join(__dirname, '/public')));

//Return HTML to Reqeusts
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
  console.log(currentTimestamp() + "INFO - recieved Get Request");
  console.log(currentTimestamp() + "INFO - "+req.cookies['username']);
  reqRoom = req.cookies['room'];
  username = req.cookies['username'];
  console.log(currentTimestamp() + "INFO - "+reqRoom);
  if (reqRoom == null) {
    reqRoom = "main";
  }
});

//Return Chatmessage of requested Room
app.get('/m/:room', function(req, res) {
  try {
    var sql = "SELECT Message, User FROM ?? ORDER BY Timestamp1 DESC LIMIT 100;";
    var val = [req.params.room+"Message"];
    var messageArr = [];
    var userArr = [];
    var resArr = [];
    con.query(sql, val, function (err, rows, fields) {
      if(err) {console.log(currentTimestamp() + "ERROR - Api Error: "+err);}
      else {
        Object.keys(rows).forEach(function(key) {
          var row = rows[key];
          messageArr.push(row.Message);
          userArr.push(row.User);
          resArr.push(row.User);
          resArr.push(row.Message);
        });
      }
      res.send(resArr);
    });
  }
  catch{
    resArr.push("System");
    resArr.push("This Room is not logging any Messages");
    res.send(resArr);
  }
});

//Start Webserver on Port 3000
http.listen(3000, () => {
  console.log(currentTimestamp() + 'INFO - listening on *:3000');
});

//Listen for connection Event
io.on('connection', (socket) => {
  //Join User in Requested Room from Cookie
  socket.join(reqRoom);
  console.log(currentTimestamp() + 'INFO - '+username+' connected ' + socket.id);
  //Emit connection event to all others in the room
  io.sockets.emit('connection', username, reqRoom);
  //Insert User in Usertable
  var sql = "INSERT INTO User (Name, SocketID, Room) VALUES (?,?,?);"  ;
  var val = [username, socket.id, reqRoom];
  executeSQL(sql, val);

  //Create Room if not yet exists
  joinRoomSQL(reqRoom);

  //Send updated Roomlist to all Users
  roomSet();

  //Listen for disonnect Events
  socket.on('disconnect', (reason) => {
    console.log(currentTimestamp() + 'INFO - a user left ' +socket.id + ' ' +reason);
    //Emit disconnect Event to all others in Room
    io.sockets.in(reqRoom).emit('disconnected', username, reqRoom);
    //Delete User from Usertable
    var sql = "DELETE FROM User WHERE SocketID = ?;";
    var val = [socket.id]
    executeSQL(sql,val);
    roomSet();
  });

  //Listen for Chat message Events
  socket.on('chat message', (msg, username, proomname) => {
    roomSet();

    //Emit Message to Users in Room
    io.sockets.in(proomname).emit('chat message', msg, username, proomname);
    console.log(currentTimestamp() + 'INFO - chat message: ' + proomname + " " + msg + " " + socket.id);
    //SQL Prevention (optional)
    if(msg.toLowerCase().includes("delete") || msg.toLowerCase().includes("remove"))
    {

    }
    else {
      //Insert Message into Database
      MesseageSQL(username, msg, proomname);
    }

  });

  //Create new Room
  socket.on('newRoomCreate', (roomName, logging, ppassword) => {
    //leave old Room and join new one
    socket.leave("main");
    socket.join(roomName);
    //Inform others in room about connection
    socket.in(roomName).emit('connection');
    console.log(currentTimestamp() + "INFO - New Room created " + roomName);
    //SQL prevention
    if (roomName.toLowerCase().includes("delete") || roomName.toLowerCase().includes("remove"))
    {
      console.log(currentTimestamp() + "WARNING - Injection detected");
    }
    else
    {
      //Create Password hash
      bcrypt.hash(ppassword, 5, (err, hash) => {
        if(err) {
          console.log(currentTimestamp() + "ERROR - "+err);
        }
        //Create Room in Database if not exists
        joinRoomSQL(roomName, logging, hash);
        roomSet();
      })
    }
  });

  //join Room
  socket.on('joinRoom', (roomName, username, oldRoom) => {
    //Check Password of Room in Database
    var sql = "SELECT Password, Users FROM Rooms WHERE Room = ?;";
    var val = [roomName];
    var password;
    var counter = 0;
    var newUsercount = 0;
    //SQL Prevention
    if (roomName.toLowerCase().includes("remove") || roomName.toLowerCase().includes("remove"))
    {
      console.log(currentTimestamp() + "WARNING - Injection detected");
    }
    else
    {
      con.query(sql, val, function (err, rows, fields) {
        if(err) {console.log(currentTimestamp() + "ERROR - "+err);}
        else {
          //Extract Password from SQL Result
          Object.keys(rows).forEach(function(key) {
            var row = rows[key];
            password = row.Password;
            newUsercount = row.Users;
          });
        } 
        //If no password -> Join the Room
        if(password == null)
        {
          //Inform old room of disconnect adn join new Room
          socket.in(oldRoom).emit('disconnected', username, oldRoom);
          socket.join(roomName);
          //Inform Client about successful join
          socket.emit("joinRoomSuccess", roomName);
          socket.in(roomName).emit('connection', username, roomName);
          console.log(currentTimestamp() + "INFO - Room joined");
          //Update Database with new room
          joinRoomSQL(roomName);
          var sql = "UPDATE User SET Room = ? WHERE SocketID = ?;";
          var val = [roomName, socket.id];
          executeSQL(sql,val);
          roomSet()
        }
        //Room has Password
        else 
        {
          //Request Password from Client
          socket.emit("joinRoomPasswordReq");
          socket.on('joinRoomPasswordAns', function(ppassword) {
            //Compare Client Password with hash of Roompassword
            bcrypt.compare(ppassword, password, function(err, result) {
              if (err) { console.log(currentTimestamp() + "ERROR - "+err) }
              //right password -> Join
              if (result == true)
              {
                socket.join(roomName);
                socket.emit("joinRoomSuccess", roomName);
                socket.in(roomName).emit('connection', roomName, username);
                console.log(currentTimestamp() + "INFO - Room joined Successful");
                var sql = "UPDATE User SET Room = ? WHERE SocketID = ?;";
                var val = [roomName, socket.id];
                executeSQL(sql,val);
                roomSet();
              }
              //wrong password -> Inform client
              else if (result == false)
              {
                //Prevent Event from triggering multiple times
                if (counter == 0)
                {
                  socket.emit("joinRoomFailed");
                  counter ++;
                  console.log(currentTimestamp() + "WARNING - Wrong Password for Room "+roomName);
                }
              }
            })
          })
        }    
      });
    }
  });

  //Get Connected Users in the Room from Database
  function userCountSQL(room)
  {
    var sql = "SELECT Count(Room) AS result FROM User Where Room = ?;";
    var val = [room];
    var usercount;
    con.query(sql, val, function (err, rows) {
      if(err)
      {
        
      }
      Object.keys(rows).forEach(function(key) {
        var row = rows[key];
        usercount = row.result;
      });
      io.emit('usercount', usercount, room);
    });
    
  };

  //execute sql statements
  function executeSQL(sql, val) {
    con.query(sql, val, function (err) {
      if(err)
      {
        //Prevent common Error from logging
        if (err.code != "ER_DUP_ENTRY")
        {
	  console.log(currentTimestamp() + "ERROT - at ", sql, " ", val);
          console.log(currentTimestamp() + "ERROR - execute sql error:", err);
        }
      }
    });
  };


  function joinRoomSQL(room, logging, password) {
    if(room != null)
    {
      try {
        //Insert Room into Rooms Table
        var sql = "INSERT INTO chatdb.Rooms (Room, Logging, Password) VALUES (?,?,?);";
        if(logging == null)
        {
          logging = 1;
        }
        var val = [room, logging, password];
        executeSQL(sql, val);
      }
      catch {
        //nothing
      }
      //Create Table for Chatmessages
      if(logging == true) {
        var sql = "CREATE TABLE IF NOT EXISTS chatdb.?? (ID int NOT NULL auto_increment, Timestamp1 timestamp DEFAULT CURRENT_TIMESTAMP,User varchar(256) NOT NULL , Message varchar(1024) NOT NULL, PRIMARY KEY (ID)) CHARACTER SET=utf8mb4 COLLATE utf8mb4_unicode_ci;";
        var val = [room + "Message"];
        executeSQL(sql, val);
      }
    }
  };


  function MesseageSQL(user, message, room) {
    //Check if logging is enabled on this room
    var sql = "SELECT Logging from Rooms WHERE Room = ?;";
    var val = [room];
    var returnValue;
    con.query(sql, val, function (err, rows) {
      if(err)
      {
        console.log(currentTimestamp() + "ERROR - execute sql error:", err);
      };

      Object.keys(rows).forEach(function(key) {
        var row = rows[key];
        console.log(currentTimestamp() + "DEBUG - Row.result "+row.Logging);
        returnValue = row.Logging;
      });
      //logging enabled -> Insert message into Database
      if(returnValue == 1)
      {
        var sql = "INSERT INTO ?? (User, Message) VALUES (?, ?);";
        var val = [room+"Message", user, message];
        executeSQL(sql, val);
      };
    });
  };

  //Names of existing Rooms
  function roomSet() {
    //Select from Database
    sql = "SELECT Room, Password FROM chatdb.Rooms;";
    var roomArr = [];
    var passArr = [];
    con.query(sql, function (err, rows, fields) {
      Object.keys(rows).forEach(function(key) {
        var row = rows[key];
        roomArr.push(row.Room);
        passArr.push(row.Password)
      });
      //Emit Array of Roomnames to Clients
      io.emit('roomSet', roomArr, passArr);
      //Go through every room and emit current amount of connected Users
      for (var i = 0; i < roomArr.length; i++)
      {
        userCountSQL(roomArr[i]);
      }
    });
  };
});
