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

var mysql = require('mysql');
const { exec } = require('child_process');

var con = mysql.createConnection({
  host: "192.168.0.215",
  user: "dbuser",
  password: "chatroom.bigos21",
  database: "chatdb",
  insecureAuth: true
});

con.connect(function (err) {
  if (err);
  console.log("Connected to Database!");
});

app.use(express.static(path.join(__dirname, '/public')));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
  console.log("recieved Get Request");
  //console.log(document.cookie);
  console.log(req.cookies['username']);
  reqRoom = req.cookies['room'];
  username = req.cookies['username'];
  console.log(reqRoom);
  if (reqRoom == null) {
    reqRoom = "main";
  }
});

app.get('/m/:room', function(req, res) {
  try {
    var sql = "SELECT Message, User FROM chatdb.?? ORDER BY Timestamp1 DESC LIMIT 100;";
    var val = [req.params.room+"Message"];
    var messageArr = [];
    var userArr = [];
    var resArr = [];
    var counter = 0;
    //resArr.push(req.params.room);
    con.query(sql, val, function (err, rows, fields) {
      if(err) {console.log("Api Error: "+err);}
      else {
        Object.keys(rows).forEach(function(key) {
          var row = rows[key];
          //console.log("Object.key "+row.Room);
          messageArr.push(row.Message);
          userArr.push(row.User);
          //var str = row.User+": "+row.Message;
          //resArr.push(str);
          
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
  console.log('listening on *:3000');
});

io.on('connection', (socket) => {
  socket.join(reqRoom);
  console.log('a user connected');
  io.sockets.in(reqRoom).emit('connection', username, reqRoom);

  joinRoomSQL(reqRoom);

  //roomlist
  roomSet();

  //usercount
  usercount++;
  io.sockets.in(reqRoom).emit('usercount', usercount);

  //disconnect
  socket.on('disconnect', (socket) => {
    console.log('a user left');
    io.sockets.in(reqRoom).emit('disconnected', username, reqRoom);
    usercount--;
    io.sockets.in(reqRoom).emit('usercount', usercount);
  });


  socket.on('chat message', (msg, username, proomname) => {
    //roomlist
    roomSet();

    //chat Message
    io.sockets.in(proomname).emit('chat message', msg, username, proomname);
    console.log('chat message: ' + proomname + " " + msg + " ");
    MesseageSQL(username, msg, proomname);

  });

  socket.on('newRoomCreate', (roomName, logging, password) => {
    socket.leave("main");
    socket.join(roomName);
    socket.in(roomName).emit('connection');
    console.log("New Room created " + roomName);
    joinRoomSQL(roomName, logging, password);
    roomSet();
  });

  //join Room
  socket.on('joinRoom', (roomName) => {
    socket.join(roomName);
    socket.in(roomName).emit('connection');
    console.log("Room joined");
    joinRoomSQL(roomName);
  });

  function executeSQL(sql, val, column) {
    con.query(sql, val, function (err, results) {
      if(err)
      {
        if (err.code != "ER_DUP_ENTRY")
        {
          console.log("execute sql error:", err);
        }
      }
    });
  };

  function joinRoomSQL(room, logging, password) {
    try {
      var sql = "INSERT INTO chatdb.Rooms (Room, Logging, Password) VALUES (?,?,?);";
      var val = [room, logging, password];
      executeSQL(sql, val);
    }
    catch {
      //nothing
    }
    if(logging == true) {
      var sql = "CREATE TABLE IF NOT EXISTS chatdb.?? (ID int NOT NULL auto_increment, Timestamp1 timestamp DEFAULT CURRENT_TIMESTAMP,User varchar(256) NOT NULL , Message varchar(1024) NOT NULL, PRIMARY KEY (ID))";
      var val = [room + "Message"];
      executeSQL(sql, val);
    }
  };

  function MesseageSQL(user, message, room) {
    var sql = "SELECT Logging from Rooms WHERE Room = ?;";
    var val = [room];
    var returnValue;
    con.query(sql, val, function (err, rows) {
      if(err)
      {
        console.log("execute sql error:", err);
      };
      console.log("BooleanSQL Result:");
      console.log(rows);

      Object.keys(rows).forEach(function(key) {
        var row = rows[key];
        console.log("Row.result "+row.Logging);
        returnValue = row.Logging;
      });
    });

    if(returnValue == 1)
    {
      var sql = "INSERT INTO ?? (User, Message) VALUES (?, ?);";
      var val = [room+"Message", user, message];
      executeSQL(sql, val);
    };
  };

  function roomSet() {
    sql = "SELECT Room FROM chatdb.Rooms;";
    var roomArr = [];
    con.query(sql, function (err, rows, fields) {
      Object.keys(rows).forEach(function(key) {
        var row = rows[key];
        //console.log("Object.key "+row.Room);
        roomArr.push(row.Room);
      });
      //console.log("roomSet " + roomArr[0]);
      io.emit('roomSet', roomArr);
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
        console.log("execute sql error:", err);
      };
      console.log("BooleanSQL Result:");
      console.log(rows);

      Object.keys(rows).forEach(function(key) {
        var row = rows[key];
        console.log("Row.result "+row.result);
        result.push(row.result);
        returnValue = row.result;
      });
      if (returnValue == 1)
      {
        console.log("Boolean True");
        return true;
      }
      else
      {
        console.log("Boolean False");
        return false;
      }
    });
    
  };


});