var chainer = require('chainer');

function create() {
    var store;

    store = new Mongo({
        url: 'mongodb://localhost:27017/socketio'
    });

    store.on('error', console.error);

    return store;
}

// since we are sharing the same connection between all instances,
// connection will be closed only if the last instance was destroyed,
// prevent this
create();

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

test('unsubscribe', function() {
    var a = create(),
        b = create();

    stop();
    expect(1);

    a.subscribe('myevent', function(arg) {
        equal(arg, 'aa', 'got subscribed event before unsubscribe');
        a.unsubscribe('myevent', function() {
            b.publish('myevent');
            start();
        });
    });

    b.publish('myevent', 'aa');
});

test('test publishing to multiple subscribers', function() {
    var a = create(),
        b = create(),
        c = create(),
        messages = 0;

    stop();
    expect(19);

    function subscription(arg1, arg2, arg3) {
        equal(arg1, 1, 'arg1 is correct');
        equal(arg2, 2, 'arg2 is correct');
        equal(arg3, 3, 'arg3 is correct');
        messages++;
        if (messages == 6) {
            equal(messages, 6, 'amount of received messages is correct');
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

test('test storing data for a client', function() {
    var chain = chainer(),
        store = create(),
        rand = 'test-' + Date.now(),
        client = store.client(rand);

    stop();
    expect(15);

    equal(client.id, rand, 'client id was set');

    chain.add(function() {
        client.set('a', 'b', function(err) {
            equal(err, null, 'set without errors');
            chain.next();
        });
    });

    chain.add(function() {
        client.get('a', function(err, val) {
            equal(err, null, 'get without errors');
            equal(val, 'b', 'get correct value');
            chain.next();
        });
    });

    chain.add(function() {
        client.has('a', function(err, has) {
            equal(err, null, 'has without errors');
            equal(has, true, 'has correct value');
            chain.next();
        });
    });

    chain.add(function() {
        client.has('b', function(err, has) {
            equal(err, null, 'has negative without errors');
            equal(has, false, 'has negative correct value');
            chain.next();
        });
    });

    chain.add(function() {
        client.del('a', function(err) {
            equal(err, null, 'del without errors');
            chain.next();
        });
    });

    chain.add(function() {
        client.has('a', function(err, has) {
            equal(err, null, 'has after del without errors');
            equal(has, false, 'has after del correct value');
            chain.next();
        });
    });

    chain.add(function() {
        client.set('c', {a: 1}, function(err) {
            equal(err, null, 'set object without errors');
            chain.next();
        });
    });

    chain.add(function() {
        client.set('c', {a: 3}, function(err) {
            equal(err, null, 'modify object without errors');
            chain.next();
        });
    });

    chain.add(function() {
        client.get('c', function(err, val) {
            equal(err, null, 'get modified obj without errors');
            deepEqual(val, {a: 3}, 'get modified obj');
            chain.next();
        });
    });

    chain.add(function() {
        store.destroy();
        start();
    });

    chain.start();
});

test('test cleaning up clients data', function() {
    var chain = chainer(),
        store = create(),
        client1 = store.client(Date.now()),
        client2 = store.client(Date.now() + 1);

    stop();
    expect(10);

    chain.add(function() {
        client1.set('a', 'b', function(err) {
            equal(err, null, 'client1 set without errors');
            chain.next();
        });
    });

    chain.add(function() {
        client2.set('c', 'd', function(err) {
            equal(err, null, 'client2 set without errors');
            chain.next();
        });
    });

    chain.add(function() {
        client1.has('a', function(err, has) {
            equal(err, null, 'client1 has without errors');
            equal(has, true, 'client1 has correct value');
            chain.next();
        });
    });

    chain.add(function() {
        client2.has('c', function(err, has) {
            equal(err, null, 'client2 has without errors');
            equal(has, true, 'client2 has correct value');
            chain.next();
        });
    });

    chain.add(function() {
        store.destroy();
        store = create();
        client1 = store.client(Date.now());
        client2 = store.client(Date.now() + 1);
        chain.next();
    });

    chain.add(function() {
        client1.has('a', function(err, has) {
            equal(err, null, 'client1 after destroy has without errors');
            equal(has, false, 'client1 after destroy has correct value');
            chain.next();
        });
    });

    chain.add(function() {
        client2.has('c', function(err, has) {
            equal(err, null, 'client2after destroy has without errors');
            equal(has, false, 'client2 after destroy has correct value');
            chain.next();
        });
    });

    chain.add(start);

    chain.start();
});

test('test cleaning up a particular client', function() {
    var chain = chainer(),
        store = create(),
        id1 = Date.now(),
        id2 = Date.now() + 1,
        client1 = store.client(id1),
        client2 = store.client(id2);

    stop();
    expect(12);

    chain.add(function() {
        client1.set('a', 'b', function(err) {
            equal(err, null, 'client1 set without errors');
            chain.next();
        });
    });

    chain.add(function() {
        client2.set('c', 'd', function(err) {
            equal(err, null, 'client2 set without errors');
            chain.next();
        });
    });

    chain.add(function() {
        client1.has('a', function(err, has) {
            equal(err, null, 'client1 has without errors');
            equal(has, true, 'client1 has correct value');
            chain.next();
        });
    });

    chain.add(function() {
        client2.has('c', function(err, has) {
            equal(err, null, 'client2 has without errors');
            equal(has, true, 'client2 has correct value');
            chain.next();
        });
    });

    chain.add(function() {
        equal(id1 in store.clients, true, 'client1 is in clients');
        equal(id2 in store.clients, true, 'client2 is in clients');
        store.destroyClient(id1);
        equal(id1 in store.clients, false, 'client1 is in clients');
        equal(id2 in store.clients, true, 'client2 is in clients');
        chain.next();
    });

    chain.add(function() {
        client1.has('a', function(err, has) {
            equal(err, null, 'client1 after destroy has without errors');
            equal(has, false, 'client1 after destroy has correct value');
            chain.next();
        });
    });

    chain.add(function() {
        store.destroy();
        start();
    });

    chain.start();
});

test('test destroy expiration', function() {
    var chain = chainer(),
        store = create(),
        id = Date.now();
        client = store.client(id);

    stop();
    expect(5);

    chain.add(function() {
        client.set('a', 'b', function(err) {
            equal(err, null, 'set without errors');
            chain.next();
        });
    });

    chain.add(function() {
        store.destroyClient(id, 1);
        setTimeout(function() {
            chain.next();
        }, 500);
    });

    chain.add(function() {
        client.get('a', function(err, val) {
            equal(err, null, 'get without errors');
            equal(val, 'b', 'get correct value');
            setTimeout(function() {
                chain.next();
            }, 2000);
        });
    });

    chain.add(function() {
        client.get('a', function(err, val) {
            equal(err, null, 'get without errors after expiration');
            equal(val, null, 'get correct value after expiration');
            chain.next();
        });
    });

    chain.add(function() {
        store.destroy();
        start();
    });

    chain.start();
});

