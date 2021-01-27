const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, '/public')));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

/*io.on('connection', (socket) => {
  console.log('a user connected');
});*/

http.listen(3000, () => {
  console.log('listening on *:3000');
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
    io.emit('test', "hallo");
    console.log('chat message: ' + msg);
    
  });
});



