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

    // Default options
    {
        // collection name is prefix + name
        collectionPrefix: 'socket.io.',
        // capped collection name
        streamCollection: 'stream',
        // collection name used for key/value storage
        storageCollection: 'storage',
        // id that uniquely identifies this node
        nodeId: null,
        // max size in bytes for capped collection
        size: 100000,
        // max number of documents inside of capped collection
        num: null,
        // db url e.g. "mongodb://localhost:27017/yourdb"
        url: null,
        // optionally you can pass everything separately
        host: 'localhost',
        port: 27017,
        db: 'socketio'
    }

    new MongoStore(options);

### Benchmarks

On my mb air with locally installed db's, using absolutely the same code, only different storages. Testing pubsub means each event is published and received, testing storage means every key is set, read and deleted.

    node bench --db mongo --test pubsub --amount 50000
    Testing pubsub , using mongo , amount: 50000 , data: mytestdata
    pubsub: 5772ms

    node bench --db redis --test pubsub --amount 50000
    Testing pubsub , using redis , amount: 50000 , data: mytestdata
    pubsub: 5106ms

    node bench --db mongo --test storage --amount 20000
    Testing storage , using mongo , amount: 20000 , data: mytestdata
    storage: 10147ms

    node bench --db redis --test storage --amount 20000
    Testing storage , using redis , amount: 20000 , data: mytestdata
    storage: 6134ms

### Run tests

    npm i
    make test

