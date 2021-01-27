const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');


/*
Possible Bootstrap fix
https://www.educative.io/edpresso/how-to-add-bootstrap-to-your-nodejs-project
*/
/*
app.use(
  "/css",
  express.static(path.join(__dirname, "node_modules/bootstrap/dist/css"))
);

app.use(
  "/js",
  express.static(path.join(__dirname, "node_modules/bootstrap/dist/js"))
);

app.use("/js", 
  express.static(path.join(__dirname, "node_modules/jquery/dist"))
);

app.use("/js",
  express.static(path.join(__dirname, "node_modules/popper.js"))
);

global.jQuery = require('jquery');
require('bootstrap');*/

/*
End of Fix
*/

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('a user connected');
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});

io.on('connection', (socket) => {
  socket.on('chat message', (msg) => {
    console.log('message: ' + msg);
  });
});



