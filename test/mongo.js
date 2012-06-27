function create() {
    var store;

    store = new Mongo({
        url: 'mongodb://localhost:27017/socketio'
    });

    store.on('error', console.error);
    return store;
}

test('test publishing doesnt get caught by the own store subscriber', function() {
    var a = create(),
        b = create();

    stop();
    expect(1);

    a.subscribe('myevent', function(arg) {
        equal(arg, 'bb', 'got event from correct server');
        a.destroy();
        b.destroy();
        start();
    });

    a.publish('myevent', 'aa');
    b.publish('myevent', 'bb');

});

test('test publishing to multiple subscribers', function() {
    var a = create(),
        b = create(),
        c = create(),
        messages = 0;

    stop();

    function subscription(arg1, arg2, arg3) {
        equal(arg1, 1, 'arg1 is correct');
        equal(arg2, 2, 'arg2 is correct');
        equal(arg3, 3, 'arg3 is correct');
        messages++;

        if (messages == 3) {
            equal(messages, 3, 'amount of received messages is correct');
            a.destroy();
            b.destroy();
            c.destroy();
            start();
        }
    }


    a.subscribe('myevent', subscription);
    b.subscribe('myevent', subscription);
    c.subscribe('myevent', subscription);

    a.publish('myevent', 1, 2, 3);
    a.publish('myevent', 1, 2, 3);
    a.publish('myevent', 1, 2, 3);
});