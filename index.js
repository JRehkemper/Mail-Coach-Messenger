const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const { disconnect } = require('process');
var usercount = 0;

app.use(express.static(path.join(__dirname, '/public')));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});

io.on('connection', (socket) => {
  socket.join("main");
  console.log('a user connected');
  io.sockets.in("main").emit('connection');
  usercount++;
  io.sockets.in("main").emit('usercount', usercount);
  socket.on('disconnect', (socket) => {
    console.log('a user left');
    io.sockets.in("main").emit('disconnected');
    usercount--;
    io.sockets.in("main").emit('usercount', usercount);
  })
  
  /*socket.on('refresh', (socket) => {
    console.log('a user left');
    io.emit('disconnected');
    usercount--;
    io.emit('usercount', usercount);
  });*/

  socket.on('chat message', (msg, username) => {
    io.sockets.in("main").emit('chat message', msg, username);
    console.log('chat message: ' + msg);
  });

  socket.on('newRoomCreate', (roomName) => {
    socket.leave("main");
    socket.join(roomName);
    io.socket.in(roomName).emit('connection');
  });
  
});










