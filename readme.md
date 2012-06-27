## Socket.io store implementation backed by mongodb.

## Usage example

var socketio = require('socket.io'),
    express = require('express'),
    MongoStore = require('socket.io-mongo'),
    app = express.createServer(),
    io = io.listen(app);

app.listen(8000);

io.configure(function() {
    var store = MongoStore({url: 'mongodb://localhost:27017/yourdb'});
    store.on('error', console.error);
    io.set('store', store);
});

io.sockets.on('connection', function (socket) {
    socket.emit('news', { hello: 'world' });
    socket.on('my other event', function (data) {
        console.log(data);
    });
});

