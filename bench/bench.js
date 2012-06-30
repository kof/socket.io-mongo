/**
 * Pubsub bench should show how much and how fast events can be published and received comparing redis and mongo.
 * Store bench should show how much and how fast key/value can be get, set and del comparing redis and mongo.
 */

var Mongo = require('../'),
    Redis = require('socket.io').RedisStore;

function getType() {
    var type = process.argv[2];

    if (type != 'mongo' && type != 'redis') {
        console.log('node bench mongo|redis');
        process.exit(1);
    }

    return type;
}

function create() {
    var store,
        type = getType();

    if (type == 'mongo') {
        store = new Mongo({
            url: 'mongodb://localhost:27017/socketio',
            size: 1000000
        });

        store.on('error', console.error);
    } else if (type == 'redis') {
        store = new Redis();
    }

    return store;
}

function pubsub(amount, data, callback) {
    var sub = create(),
        pub = create(),
        i = 0,
        received = 0;

    sub.subscribe('myevent', function() {
        received++;
        if (received == amount) {
            callback();
        }
    });

    (function publish() {
        pub.publish('myevent', data);
        if (i < amount) {
            process.nextTick(publish);
        }
    }())
};

function storage(amount, data, callback) {
    var client = create().client(Date.now());

    (function run() {
        client.set('a', data, function() {
            client.get('a', function(err, val) {
                if (val != data) {
                    console.error('Failed');
                    process.exit(1);
                }
                client.del('a', function() {
                    if (amount--) {
                        run();
                    } else {
                        callback();
                    }
                });
            });
        });

    }());
}

var EVENTS = 50000;
var DATA = 'mydata'
var DOCS = 10000;

var type = getType();

console.error('Testing pubsub, using', type, ', events:', EVENTS, ', data:', DATA);
console.time('pubsub');
pubsub(EVENTS, DATA, function() {
    console.timeEnd('pubsub');
    console.error('Testing storage, using', type, ', docs:', DOCS, ', data:', DATA);
    console.time('storage', '123');
    storage(DOCS, DATA, function() {
        console.timeEnd('storage');
        process.exit();
    });
});
