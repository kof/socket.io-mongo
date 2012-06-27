var util = require('util'),
    _ = require('underscore'),
    mubsub = require('mubsub'),
    Store = require('socket.io').Store;

var noop = function() {},
    msgpack,
    stringify = JSON.stringify,
    parse = JSON.parse,
    connected = false,
    instances = 0;

try {
    msgpack = require('msgpack');
    stringify = msgpack.pack;
    parse = msgpack.unpack;
} catch(e) {}

/**
 * Mongo store constructor.
 *
 * @api public
 */
function Mongo(options) {
    var self = this;

    options = _.extend({
        collectionPrefix: 'socket.io.',
        streamCollection: 'stream',
        storageCollection: 'storage'
    }, options);

    // Node id to uniquely identify this node.
    this._nodeId = options.nodeId || Math.round(Math.random() * Date.now());
    this._subscriptions = {};
    this._channel = mubsub.channel(options.collectionPrefix + options.streamCollection, options);

    mubsub.connection.db.then(function(err, db) {
        self.emit('connect', err, db);
    });

    // all instances share one connection
    if (!connected) {
        connected = true;
        mubsub.connect(options);
    }

    instances++;
    this.setMaxListeners(0);
    Store.call(this, options);
}

util.inherits(Mongo, Store);

module.exports = exports = Mongo;
exports.Mongo = Mongo;

/**
 * Publishes a message.
 * Everything after 1. param will be published as a data.
 *
 * @param {String} event name.
 * @param {Mixed} any data.
 * @api public
 */
Mongo.prototype.publish = function(name) {
    this._channel.publish({
        name: name,
        nodeId: this._nodeId,
        date: new Date,
        args: stringify([].slice.call(arguments, 1))
    }, this._error.bind(this));

    return this;
};

/**
 * Subscribes to a channel.
 *
 * @param {String} event name.
 * @param {Function} callback.
 * @api public
 */
Mongo.prototype.subscribe = function(name, callback) {
    var self = this,
        // we check that the message consumed wasn't emitted by this node
        query = {name: name, nodeId: {$ne: this._nodeId}};

    this._subscriptions[name] = this._channel.subscribe(query, function(err, doc) {
        if (err) {
            return self._error(err);
        }

        callback.apply(null, parse(doc.args));
    });

    return this;
};

/**
 * Unsubscribes.
 *
 * @param {String} [name] event name, if no name passed - all subscriptions
 *     will be unsubscribed.
 * @api public
 */
Mongo.prototype.unsubscribe = function(name) {
    if (this._subscriptions[name]) {
        this._subscriptions[name].unsubscribe();
        delete this._subscriptions[name];
    } else {
        this._channel.close();
        this._subscriptions = {};
    }

    return this;
};

/**
 * Destroy the store. Close connection.
 *
 * @api public
 */
Mongo.prototype.destroy = function() {
    var self = this;

    Store.prototype.destroy.call(this);
    this.removeAllListeners();
    instances--;

    // only close db connection if this is the only instance, because
    // all instances sharing the same connection
    if (instances > 0) {
        connected = false;
        instances = 0;
        mubsub.connection.close();
    }

    return this;
};

/**
 * Emit error, create Error instance if error is a string.
 *
 * @param {String|Error} err.
 * @api private
 */
Mongo.prototype._error = function(err) {
    if (!err) {
        return this;
    }

    if (typeof err == 'string') {
        err = new Error(err);
    }

    this.emit('error', err);
    return this;
};

/**
 * Get a collection for persistent data.
 *
 * @param {Function} callback.
 * @api protected
 */
Mongo.prototype.getPersistentCollection_ = function(callback) {
    var self = this,
        opts = this.options;

    if (this._persistentCollection) {
        return callback(null, this._persistentCollection);
    }

    mubsub.connection.db.then(function(err, db) {
        var collectionName = opts.collectionPrefix + opts.storageCollection;

        if (err) {
            return callback(err);
        }

        db.collection(collectionName, function(err, collection) {
            if (err) {
                return callback(err);
            }

            self._persistentCollection = collection;

            collection.ensureIndex({key: 1, clientId: 1}, function(err) {
                if (err) {
                    return callback(err);
                }

                callback(null, collection);
            });
        });
    });

    return this;
};

/**
 * Client constructor
 *
 * @api private
 */
function Client () {
    Store.Client.apply(this, arguments);
}

util.inherits(Client, Store.Client);

Mongo.Client = Client;

/**
 * Gets a key.
 *
 * @param {String} key.
 * @param {Function} callback.
 * @api public
 */
Client.prototype.get = function(key, callback) {
    var query = {clientId: this.id, key: key};

    this.store.getPersistentCollection_(function(err, collection) {
        if (err) {
            return callback(err);
        }

        collection.findOne(query, function(err, data) {
            if (err) {
                return callback(err);
            }

            callback(null, data ? data.value : null);
        });
    });

    return this;
};

/**
 * Sets a key
 *
 * @param {String} key.
 * @param {Mixed} value.
 * @param {Function} [callback]
 * @api public
 */
Client.prototype.set = function(key, value, callback) {
    var query = {clientId: this.id, key: key};

    callback || (callback = noop);

    this.store.getPersistentCollection_(function(err, collection) {
        if (err) {
            return callback(err);
        }

        collection.update(query, {$set: {value: value}}, {upsert: true}, callback);
    });

    return this;
};

/**
 * Has a key
 *
 * @param {String} key.
 * @param {Function} callback.
 * @api public
 */
Client.prototype.has = function(key, callback) {
    var query = {clientId: this.id, key: key};

    this.store.getPersistentCollection_(function(err, collection) {
        if (err) {
            return callback(err);
        }

        collection.findOne(query, {_id: 1}, function(err, data) {
            if (err) {
                return callback(err);
            }

            callback(null, Boolean(data));
        });
    });

    return this;
};

/**
 * Deletes a key
 *
 * @param {String} key.
 * @param {Function} [callback].
 * @api public
 */
Client.prototype.del = function(key, callback) {
    var query = {clientId: this.id, key: key};

    callback || (callback = noop);

    this.store.getPersistentCollection_(function(err, collection) {
        if (err) {
            return callback(err);
        }

        collection.remove(query, function(err, data) {
            if (err) {
                return callback(err);
            }

            callback(null);
        });
    });

    return this;
};

/**
 * Destroys the client.
 *
 * @param {Number} [expiration] number of seconds to expire data
 * @param {Function} [callback].
 * @api public
 */
Client.prototype.destroy = function(expiration, callback) {
    var self = this;

    callback || (callback = noop);

    if (typeof expiration == 'number') {
        setTimeout(function() {
            self.destroy(null, callback);
        }, expiration * 1000);

        return this;
    }

    this.store.getPersistentCollection_(function(err, collection) {
        if (err) {
            return callback(err);
        }

        collection.remove({clientId: self.id}, callback);
    });

    return this;
};