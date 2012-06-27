## Socket.io store implementation backed by mongodb.

This store is for people who is already using mongodb and don't want to add redis. Pubsub is implemented via "mubsub" module, which is using capped collections and tailable cursors.

Any benches or experiences in comparison to redis are welcome.

### Install

If "msgpack" is installed, it will be used instead of JSON.stringify/parse.

    npm i socket.io-mongo

### Usage example

    var socketio = require('socket.io'),
        express = require('express'),
        MongoStore = require('socket.io-mongo'),
        app = express.createServer(),
        io = io.listen(app);

    app.listen(8000);

    io.configure(function() {
        var store = new MongoStore({url: 'mongodb://localhost:27017/yourdb'});
        store.on('error', console.error);
        io.set('store', store);
    });

    io.sockets.on('connection', function (socket) {
        socket.emit('news', { hello: 'world' });
        socket.on('my other event', function (data) {
            console.log(data);
        });
    });

### Options

You can set everything you would be able to set in mongodb-native driver. Additionally you can set "size" and/or "max" for capped collection, which is used by mubsub then.

    new MongoStore(options);

### Run tests

    npm i
    make test

