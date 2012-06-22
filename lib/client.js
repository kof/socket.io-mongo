var util = require('util'),
    EventEmmiter = require('events').EventEmitter,
    mongoose = require('mongoose');

function Client(connection) {
    this._connection = connection;
}

util.inherits(Client, EventEmmiter);

exports.Client = Client;

Client.prototype.publish = function() {

};

Client.prototype.subscribe = function() {

};

Client.prototype.unsubscribe = function() {

};

Client.prototype.end = function() {

};

Client.prototype.hset = function() {

};

Client.prototype.hget = function() {

};

Client.prototype.hdel = function() {

};

Client.prototype.hexists = function() {

};

Client.prototype.del = function() {

};

Client.prototype.expire = function() {

};

exports.createClient = function(opts) {
    var connection = opts;

    if (typeof opts == 'string') {
        connection = mongoose.connect(opts).connection;
    }

    return new Client(connection);
};
