exports.Client = require('./lib/client');

exports.createClient = function(port, host, options) {
    return new exports.Client(port, host, options);
};
