# Mail Coach | Messanger for the Web
Mail Coach is an Open Source Messanger based on Socket.IO and Node JS. You can run the Server on a small host, like a Raspberry Pi and use it with every Webbrowser.

## Features
* Login with Username
* Send Messages to all Users in your Room
* Create new Room
* Disable logging of Messages in a Room for better privacy
* Secure your Room with a Password
* User Simley Picker for better Communitcation
* Usable in Webbrowser on PC and Mobile
* Process Management with PM2

## Requirements
* Linux Server with root access
* MySQL Server (on the same host or network)

## Installation
* Update your System
* Install NodeJS/NPM
* Clone Git Repository
* Prepare MySQL Server (Look at MySQL-Server script)
* Start Mail Coach server with `node server.js` for development or `pm2 start server` for production use
* Start using Mail Coach on `Server-IP:3000`
