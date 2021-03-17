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
    if (varArr[i] < 10)
    {
      varArr[i] = "0"+varArr[i];
    }
  }
  let str = varArr[0] + "-" + varArr[1] + "-" + varArr[2] + " - " + varArr[3] + ":" + varArr[4] + ":" + varArr[5] + " - ";
  return str;
}

function sleep(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}

function readCreds()
  {
    var str = "";
    str = fs.readFileSync('database.conf', 'utf-8');
    console.log(str);
    creds = str.split("\n");
    
  }

readCreds();
var con = mysql.createConnection({

  host: creds[0],
  user: creds[1],
  password: creds[2],
  database: creds[3],
  charset: 'utf8mb4',
  insecureAuth: true
});
console.log(con);

con.connect(function (err) {
  if (err);
  console.log(currentTimestamp() + "INFO - Connected to Database!");
});

app.use(express.static(path.join(__dirname, '/public')));

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

app.get('/m/:room', function(req, res) {
  try {
    var sql = "SELECT Message, User FROM ?? ORDER BY Timestamp1 DESC LIMIT 100;";
    var val = [req.params.room+"Message"];
    var messageArr = [];
    var userArr = [];
    var resArr = [];
    var counter = 0;
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

http.listen(3000, () => {
  console.log(currentTimestamp() + 'INFO - listening on *:3000');
});

io.on('connection', (socket) => {
  socket.join(reqRoom);
  console.log(currentTimestamp() + 'INFO - '+username+' connected ' + socket.id);
  io.sockets.emit('connection', username, reqRoom);
  var sql = "INSERT INTO User (Name, SocketID, Room) VALUES (?,?,?);"  ;
  var val = [username, socket.id, reqRoom];
  executeSQL(sql, val);

  joinRoomSQL(reqRoom);

  //roomlist
  roomSet();

  //usercount
  //usercount++;
  //io.sockets.in(reqRoom).emit('usercount', usercount);

  //disconnect
  socket.on('disconnect', (reason) => {
    console.log(currentTimestamp() + 'INFO - a user left ' +socket.id + ' ' +reason);
    io.sockets.in(reqRoom).emit('disconnected', username, reqRoom);
    var sql = "DELETE FROM User WHERE SocketID = ?;";
    var val = [socket.id]
    executeSQL(sql,val);
    //usercount--;
    //io.sockets.in(reqRoom).emit('usercount', usercount);
    roomSet();
  });

  socket.on('chat message', (msg, username, proomname) => {
    //roomlist
    roomSet();

    //chat Message
    io.sockets.in(proomname).emit('chat message', msg, username, proomname);
    console.log(currentTimestamp() + 'INFO - chat message: ' + proomname + " " + msg + " " + socket.id);
    if(msg.toLowerCase().includes("delete") || msg.toLowerCase().includes("remove"))
    {

    }
    else {
      MesseageSQL(username, msg, proomname);
    }

  });

  socket.on('newRoomCreate', (roomName, logging, ppassword) => {
    socket.leave("main");
    socket.join(roomName);
    socket.in(roomName).emit('connection');
    console.log(currentTimestamp() + "INFO - New Room created " + roomName);
    if (roomName.toLowerCase().includes("delete") || roomName.toLowerCase().includes("remove"))
    {
      console.log(currentTimestamp() + "WARNING - Injection detected");
    }
    else
    {
      bcrypt.hash(ppassword, 5, (err, hash) => {
        if(err) {
          console.log(currentTimestamp() + "ERROR - "+err);
        }
        joinRoomSQL(roomName, logging, hash);
        roomSet();
      })
    }
  });

  //join Room
  socket.on('joinRoom', (roomName, username, oldRoom) => {
    var sql = "SELECT Password, Users FROM Rooms WHERE Room = ?;";
    var val = [roomName];
    var password;
    var counter = 0;
    var newUsercount = 0;
    if (roomName.toLowerCase().includes("remove") || roomName.toLowerCase().includes("remove"))
    {
      console.log(currentTimestamp() + "WARNING - Injection detected");
    }
    else
    {
      con.query(sql, val, function (err, rows, fields) {
        if(err) {console.log(currentTimestamp() + "ERROR - "+err);}
        else {
          Object.keys(rows).forEach(function(key) {
            var row = rows[key];
            password = row.Password;
            newUsercount = row.Users;
          });
        } 
        if(password == null)
        {
          socket.in(oldRoom).emit('disconnected', username, oldRoom);
          socket.join(roomName);
          socket.emit("joinRoomSuccess", roomName);
          socket.in(roomName).emit('connection', username, roomName);
          console.log(currentTimestamp() + "INFO - Room joined");
          joinRoomSQL(roomName);
          var sql = "UPDATE User SET Room = ? WHERE SocketID = ?;";
          var val = [roomName, socket.id];
          executeSQL(sql,val);
          roomSet()
        }
        else 
        {
          socket.emit("joinRoomPasswordReq");
          socket.on('joinRoomPasswordAns', function(ppassword) {
            bcrypt.compare(ppassword, password, function(err, result) {
              if (err) { console.log(currentTimestamp() + "ERROR - "+err) }
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
              else if (result == false)
              {
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
        //console.log(currentTimestamp() + "DEBUG - Row.result "+row.result);
        usercount = row.result;
      });
      //console.log("DEBUG - ExecuteSQL SQL: "+sql);
      //console.log("DEBUG - ExecuteSQL VAL: "+val);
      //console.log(currentTimestamp()+"UsercountSQL "+room);
      io.emit('usercount', usercount, room);
    });
    
  };

  function executeSQL(sql, val, column) {
    con.query(sql, val, function (err, results) {
      if(err)
      {
        if (err.code != "ER_DUP_ENTRY")
        {
          console.log(currentTimestamp() + "ERROR - execute sql error:", err);
        }
      }
      //console.log("DEBUG - ExecuteSQL SQL: "+sql);
      //console.log("DEBUG - ExecuteSQL VAL: "+val);
    });
  };

  function joinRoomSQL(room, logging, password) {
    if(room != null)
    {
      try {
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
      if(logging == true) {
        var sql = "CREATE TABLE IF NOT EXISTS chatdb.?? (ID int NOT NULL auto_increment, Timestamp1 timestamp DEFAULT CURRENT_TIMESTAMP,User varchar(256) NOT NULL , Message varchar(1024) NOT NULL, PRIMARY KEY (ID)) CHARACTER SET=utf8mb4 COLLATE utf8mb4_unicode_ci;";
        var val = [room + "Message"];
        executeSQL(sql, val);
      }
    }
  };

  function MesseageSQL(user, message, room) {
    var sql = "SELECT Logging from Rooms WHERE Room = ?;";
    var val = [room];
    var returnValue;
    //console.log("DEBUG - Message for Room "+room);
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
      if(returnValue == 1)
      {
        //console.log("DEBUG - Logging True");
        var sql = "INSERT INTO ?? (User, Message) VALUES (?, ?);";
        var val = [room+"Message", user, message];
        executeSQL(sql, val);
      };
    });
  };

  function roomSet() {
    sql = "SELECT Room, Password FROM chatdb.Rooms;";
    var roomArr = [];
    var passArr = [];
    con.query(sql, function (err, rows, fields) {
      Object.keys(rows).forEach(function(key) {
        var row = rows[key];
        //console.log("Object.key "+row.Room);
        roomArr.push(row.Room);
        passArr.push(row.Password)
      });
      //console.log("roomSet " + roomArr[0]);
      io.emit('roomSet', roomArr, passArr);
      for (var i = 0; i < roomArr.length; i++)
      {
        //console.log(roomArr[i]);
        userCountSQL(roomArr[i]);
        //console.log(currentTimestamp()+"Usercount für "+ roomArr[i]);
      }
    });
  };


  function booleanSQL(table, column, value) {
    //var sql = "SELECT IF (EXISTS(SELECT ? FROM chatdb.?? WHERE ? = ?),'true','false' )AS result;";
    var val = [column, table, column, value];
    //var sql = "SELECT ? FROM chatdb.?? WHERE ? = ?;";
    var sql = "SELECT EXISTS(SELECT ? from ?? where ? = ?) as result;";
    var result = [];
    var returnValue;

    con.query(sql, val, function (err, rows) {
      if(err)
      {
        console.log(currentTimestamp() + "ERROR - execute sql error:", err);
      };

      Object.keys(rows).forEach(function(key) {
        var row = rows[key];
        console.log(currentTimestamp() + "INFO - Row.result "+row.result);
        result.push(row.result);
        returnValue = row.result;
      });
      if (returnValue == 1)
      {
        console.log(currentTimestamp() + "INFO - Boolean True");
        return true;
      }
      else
      {
        console.log(currentTimestamp() + "INFO - Boolean False");
        return false;
      }
    });
  };


});
