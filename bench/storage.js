exports.run = function(amount, data, create, callback) {
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
};