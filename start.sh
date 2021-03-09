#!/bin/bash

pm2 start /home/jannik/chatroom/Chatroom_socket.io/server.js --watch
#pm2 logs server &>> /home/jannik/chatroom/Chatroom_socket.io/chatlog.log
