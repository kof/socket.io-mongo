exports.run = function(amount, data, create, callback) {
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
    }());
};