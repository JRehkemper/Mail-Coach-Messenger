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
* Update your System(`apt update; apt upgrade -y`)
* Install NodeJS(`apt install nodejs`) 
* Install NPM(`apt install npm`) 
* Install PM2(`npm install pm2 -g`)
* Clone Git Repository
* Prepare MySQL Server (Look at MySQL-Server script)
* Copy or Rename `database.conf.example` to `database.conf` and add Credentials for your Database User
* Start Mail Coach server with `node server.js` for development or `pm2 start server` for production use
* Start using Mail Coach with all your Friends on `http://Server-IP:3000`
* You can monitor your System with `pm2 monit`

### Reverse Proxy
If you want to make your Mail Coach Server available to the Internet, you should use a NGINX Reverse Proxy to redirect the traffic to port 3000. This can be done on the same host or on another server in the network.
