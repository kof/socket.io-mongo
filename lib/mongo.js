var util = require('util'),
    _ = require('underscore'),
    mubsub = require('mubsub'),
    Store = require('socket.io').Store;

var noop = function() {},
    msgpack,
    stringify = JSON.stringify,
    parse = JSON.parse;

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
    this._nodeId = options.nodeId || this._generateId();
    this._channel = mubsub.channel(options.collectionPrefix + options.streamCollection, options);
    this._subscriptions = {};

    mubsub.connect(options);
    this.setMaxListeners(0);
    Store.call(this, options);
}

util.inherits(Mongo, Store);

module.exports = Mongo;

/**
 * Publishes a message.
 *
 * @param {String} event name.
 * @api public
 */
Mongo.prototype.publish = function(name) {
    this._channel.publish({
        name: name,
        nodeId: this._nodeId,
        date: new Date,
        args: stringify([].slice.call(arguments, 1))
    });

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
        query = {name: name, nodeId: {$ne: self._nodeId}};

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
 * @param {String} event name.
 * @api public
 */
Mongo.prototype.unsubscribe = function(name) {
    if (this._subscriptions[name]) {
        this._subscriptions[name].unsubscribe();
        delete this._subscriptions[name];
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

    this._channel.collection.then(function(err, collection) {
        if (err) {
            return self._error(err);
        }

        collection.db.close();
    });

    return this;
};

/**
 * Generate a random id.
 *
 * @return {Number}
 * @api private
 */
Mongo.prototype._generateId = function() {
    return Math.round(Math.random() * Date.now());
};

/**
 * Emit error, create Error instance if error is a string.
 *
 * @param {String|Error} err.
 * @api private
 */
Mongo.prototype._error = function(err) {
    if (typeof err == 'string') {
        err = new Error(err);
    }

    this.emit('error', err);
    return this;
};

/**
 * Emit error, create Error instance if error is a string.
 *
 * @param {Function} callback.
 * @api private
 */
Mongo.prototype._getPersistentCollection = function(callback) {
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

    this.storage._getPersistentCollection(function(err, collection) {
        if (err) {
            return callback(err);
        }

        collection.findOne(query, function(err, data) {
            if (err) {
                return callback(err);
            }

            callback(null, data.value);
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

    this.storage._getPersistentCollection(function(err, collection) {
        if (err) {
            return callback(err);
        }

        collection.update(query, {$set: {value: value}}, callback);
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

    this.storage._getPersistentCollection(function(err, collection) {
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

    this.storage._getPersistentCollection(function(err, collection) {
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
        });

        return this;
    }

    this.storage._getPersistentCollection(function(err, collection) {
        if (err) {
            return callback(err);
        }

        collection.remove({clientId: self.id}, callback);
    });

    return this;
};