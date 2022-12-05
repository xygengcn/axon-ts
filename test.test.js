const net = require('net');

let server;

server = createServer();

server.on('listening', () => {
    console.log(111, 'listening');

    setTimeout(() => {
        server.close();
    }, 2000);
});

server.on('error', (e) => {
    console.log(111, e);
});

server.listen(9876, 'localhost');

console.log(111, 'start');

server.on('close', () => {
    console.log(111, 'close');
    server.unref();
    server = createServer();
    server.on('listening', () => {
        console.log(222, 'listening');
    });
    server.listen(9876);
});

let client = net.connect(9876);

client.on('connect', (s) => {
    console.log('connect', s);
});

client.on('close', (s) => {
    console.log('close', s);
});

function createServer() {
    return net.createServer((sock) => {
        console.log('createServer', sock);
    });
}
