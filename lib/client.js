var util = require('util'),
    EventEmmiter = require('events').EventEmitter,
    mubsub = require('mubsub'),
    _ = require('underscore');


function Client(port, host, options) {
    EventEmmiter.call(this);
    this.options = options = _.defaults(options || {}, {
        channel: 'pubsub',
        host: host,
        port: port
    });

    mubsub.connect(options);
    this.channel = mubsub.channel(options.channel, options);
    this._subscriptions = {};
}

util.inherits(Client, EventEmmiter);

module.exports = Client;

Client.prototype.publish = function(name, data) {
    this.channel.publish({
        name: name,
        data: data
    });

    return this;
};

Client.prototype.subscribe = function(name) {
    var self = this;

    this._subscriptions[name] = this.channel.subscribe({name: name}, function(err, doc) {
        if (err) {
            return self.emit('error', err);
        }

        self.emit('message', doc.name, doc.data);
    });

    this.emit('subscribe', name);

    return this;
};

Client.prototype.unsubscribe = function(name) {
    if (this._subscriptions[name]) {
        this._subscriptions[name].unsubscribe();
        this.emit('unsubscribe', name);
    }

    return this;
};

Client.prototype.end = function() {
    var self = this;

    this.channel.collection.then(function(err, collection) {
        if (err) {
            return self.emit('error', err);
        }

        collection.db.close();
    });

    return this;
};

['hset', 'hget', 'hdel', 'hexists', 'del', 'expire'].forEach(function(method) {
    Client.prototype[method] = function() {
        throw new Error('Method "' + method + '" is not implemented.');
    };
});

