/**
 * Pubsub bench should show how much and how fast events can be published and received comparing redis and mongo.
 * Store bench should show how much and how fast key/value can be get, set and del comparing redis and mongo.
 */

var Mongo = require('../'),
    Redis = require('socket.io').RedisStore,
    opts = require('argsparser').parse();

if (!opts['--db'] || !opts['--test']) {
    console.error('Usage: node bench --db redis|mongo --test pubsub|storage');
    process.exit(1);
}

var db = opts['--db'],
    test = opts['--test'],
    amount = opts['--amount'] || 15000,
    data = opts['--data'] || 'mytestdata';

console.error('Testing', test, ', using', db, ', amount:', amount, ', data:', data);
console.time(test);
require('./' + test).run(amount, data, create, function() {
    console.timeEnd(test);
    process.exit();
});

function create() {
    var store;

    if (db == 'mongo') {
        store = new Mongo({
            url: 'mongodb://localhost:27017/socketio',
            size: 1000000
        });

        store.on('error', console.error);
    } else if (db == 'redis') {
        store = new Redis();
    }

    return store;
}


