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

app.use(express.static(path.join(__dirname, '/public')));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
  console.log("recieved Get Request");
  //console.log(document.cookie);
  console.log(req.cookies['username']);
  reqRoom = req.cookies['room'];
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
  io.sockets.in(reqRoom).emit('connection');
  usercount++;
  io.sockets.in(reqRoom).emit('usercount', usercount);
  socket.on('disconnect', (socket) => {
    console.log('a user left');
    io.sockets.in(reqRoom).emit('disconnected');
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
    /*if(proomname == "") {
      roomname = "main";
    }
    else {
      roomname = proomname;
    }*/
    //roomname = reqRoom;
    var roomlist = io.sockets.adapter.rooms; // liste aller Räume
    console.log(roomlist); //log aller Räume

    io.sockets.in(proomname).emit('chat message', msg, username);
      console.log('chat message: ' + proomname +" "+ msg + " ");
  });

  socket.on('newRoomCreate', (roomName) => {
    socket.leave("main");
    socket.join(roomName);
    socket.in(roomName).emit('connection');
    console.log("New Room created "+roomName);
  });
  
});










