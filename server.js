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

var mysql =require('mysql');

var con = mysql.createConnection({
  host:"192.168.0.215",
  user: "dbuser",
  password: "chat123",
  database: "chatdb",
	insecureAuth : true
});

con.connect(function(err) {
  if (err) throw err;
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
  if(reqRoom == null)
  {
    reqRoom = "main";
  }
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});

io.on('connection', (socket) => {
  socket.join(reqRoom);
  console.log('a user connected');
  io.sockets.in(reqRoom).emit('connection', username, reqRoom);

  var sql = "CREATE TABLE IF NOT EXISTS chatdb.? (ID int NOT NULL auto_increment, Timestamp timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP', Messages varchar(1024) NOT NULL, PRIMARY KEY (ID))";
  var valRoom = reqRoom + "Messages";
  var val = [valRoom];

  con.query(sql, val, function(err, results)
  {

  });

  var sql = "Insert INTO chatdb.Rooms (Room) Values (?);";
  var valRoom = reqRoom;
  var val = [valRoom];
	console.log(val);

  con.query(sql, val, function(err, results)
  {

  });
  

  //roomlist
  var roomlist = socket.rooms;
  var roomSet = [];
  roomlist.forEach(print);
  function print(values) {
    printValues(values);
  };
  console.log("roomSet " + roomSet);
  io.emit('roomSet', roomSet);
  
  //usercount
  usercount++;
  io.sockets.in(reqRoom).emit('usercount', usercount);
  
  //disconnect
  socket.on('disconnect', (socket) => {
    console.log('a user left');
    io.sockets.in(reqRoom).emit('disconnected', username, reqRoom);
    usercount--;
    io.sockets.in(reqRoom).emit('usercount', usercount);
  })
  
  /*socket.on('refresh', (socket) => {
    console.log('a user left');
    io.emit('disconnected');
    usercount--;
    io.emit('usercount', usercount);
  });*/

  socket.on('chat message', (msg, username, proomname) => {
    //roomlist
    var roomlist = socket.rooms;
    var roomSet = [];
    roomlist.forEach(print);
    function print(values) {
      printValues(values);
    }
    console.log("roomSet " + roomSet);
    io.emit('roomSet', roomSet);
    
    //chat Message
    io.sockets.in(proomname).emit('chat message', msg, username, proomname);
    console.log('chat message: ' + proomname +" "+ msg + " ");
  });

  socket.on('newRoomCreate', (roomName) => {
    socket.leave("main");
    socket.join(roomName);
    socket.in(roomName).emit('connection');
    console.log("New Room created "+roomName);
  });

  socket.on('joinRoom', (roomName) => {
    socket.join(roomName);
    socket.in(roomName).emit('connection');
    console.log("Room joind");
  });

  function printValues(values) {
    if(values != null) {
      if(values.length != 20)
      {
        values = values.replace(' ', '');
        console.log(values);
        roomSet.push(values);
      }
    }
  }
  
});










