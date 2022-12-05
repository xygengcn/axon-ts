/**
 * Module dependencies.
 */

import Emitter from '../emitter';
import Message from 'amp-message';
import { Stream as Parser } from 'amp';
import url from 'url';
import net from 'net';
import fs from 'fs';
import debug from 'debug';

const sockDebug = debug('axon:sock');

/**
 * Errors to ignore.
 */

const ignore = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH', 'ENETDOWN', 'EPIPE', 'ENOENT'];

/**
 * Initialize a new `Socket`.
 *
 * A "Socket" encapsulates the ability of being
 * the "client" or the "server" depending on
 * whether `connect()` or `bind()` was called.
 *
 * @api private
 */

export default class Socket extends Emitter {
    private server!: net.Server | null;

    public socks: Array<any> = [];

    private closing: boolean = false;

    private type = '';

    public connected: boolean = false;

    private retry!: number;

    public opts = {};

    constructor() {
        super();
        this.server = null;
        this.socks = [];
        this.settings = {};
        this.set('hwm', Infinity);
        this.set('identity', String(process.pid));
        this.set('retry timeout', 100);
        this.set('retry max timeout', 5000);
    }

    /**
     * Use the given `plugin`.
     *
     * @param {Function} plugin
     * @api private
     */

    public use(plugin: Function) {
        plugin(this);
        return this;
    }

    /**
     * Creates a new `Message` and write the `args`.
     *
     * @param {Array} args
     * @return {Buffer}
     * @api private
     */

    public pack(args: Array<Buffer>): Buffer {
        const msg = new Message(args);
        return msg.toBuffer();
    }

    /**
     * Close all open underlying sockets.
     *
     * @api private
     */

    public closeSockets() {
        sockDebug('closing %d connections', this.socks.length);
        this.socks.forEach(function (sock) {
            sock.destroy();
        });
    }

    /**
     * Close the server.
     *
     * @param {Function} [fn]
     * @api public
     */

    public closeServer(fn: Function) {
        sockDebug('closing server');
        this.server?.on('close', this.emit.bind(this, 'close'));
        this.server?.close();
        fn && fn();
    }

    /**
     * Close the socket.
     *
     * Delegates to the server or clients
     * based on the socket `type`.
     *
     * @param {Function} [fn]
     * @api public
     */

    public close(fn: Function) {
        sockDebug('closing');
        this.closing = true;
        this.closeSockets();
        if (this.server) this.closeServer(fn);
    }

    /**
     * Return the server address.
     *
     * @return {Object}
     * @api public
     */

    public address() {
        if (!this.server) return;
        const addr: net.AddressInfo & { string: string } = this.server?.address() as net.AddressInfo & { string: string };
        if (addr) {
            addr.string = 'tcp://' + addr.address + ':' + addr.port;
        }
        return addr;
    }

    /**
     * Remove `sock`.
     *
     * @param {Socket} sock
     * @api private
     */

    public removeSocket(sock) {
        const i = this.socks.indexOf(sock);
        if (!~i) return;
        sockDebug('remove socket %d', i);
        this.socks.splice(i, 1);
    }

    /**
     * Add `sock`.
     *
     * @param {Socket} sock
     * @api private
     */

    public addSocket(sock) {
        const parser = new Parser();
        const i = this.socks.push(sock) - 1;
        sockDebug('add socket %d', i);
        sock.pipe(parser);
        parser.on('data', this.onmessage(sock));
    }

    /**
     * Handle `sock` errors.
     *
     * Emits:
     *
     *  - `error` (err) when the error is not ignored
     *  - `ignored error` (err) when the error is ignored
     *  - `socket error` (err) regardless of ignoring
     *
     * @param {Socket} sock
     * @api private
     */

    public handleErrors(sock) {
        const self = this;
        sock.on('error', function (err) {
            sockDebug('error %s', err.code || err.message);
            self.emit('socket error', err);
            self.removeSocket(sock);
            if (!~ignore.indexOf(err.code)) return self.emit('error', err);
            sockDebug('ignored %s', err.code);
            self.emit('ignored error', err);
        });
    }

    /**
     * Handles framed messages emitted from the parser, by
     * default it will go ahead and emit the "message" events on
     * the socket. However, if the "higher level" socket needs
     * to hook into the messages before they are emitted, it
     * should override this method and take care of everything
     * it self, including emitted the "message" event.
     *
     * @param {net.Socket} sock
     * @return {Function} closure(msg, mulitpart)
     * @api private
     */

    public onmessage(sock: net.Socket) {
        const self = this;
        return function (buf) {
            const msg = new Message(buf);
            self.emit.call(self, 'message', ...msg.args, sock);
        };
    }

    /**
     * Connect to `port` at `host` and invoke `fn()`.
     *
     * Defaults `host` to localhost.
     *
     * TODO: needs big cleanup
     *
     * @param {Number|String} port
     * @param {String} host
     * @param {Function} fn
     * @return {Socket}
     * @api public
     */

    public connect(port: number | string, host: string | Function | undefined, fn?: Function) {
        const self = this;
        if ('server' === this.type) throw new Error('cannot connect() after bind()');
        if ('function' === typeof host) {
            fn = host;
            host = undefined;
        }

        if ('string' == typeof port) {
            const uri = url.parse(port);
            if (uri.pathname) {
                fn = host as any;
                host = null as any;
                fn = undefined;
                port = uri.pathname;
            } else {
                host = uri.hostname || '0.0.0.0';
                port = parseInt(uri.port || '', 10);
            }
        } else {
            host = host || '0.0.0.0';
        }

        const max = self.get('retry max timeout');
        const sock = new net.Socket();
        sock.setNoDelay();
        this.type = 'client';
        port = port;
        this.handleErrors(sock);

        sock.on('close', function () {
            self.connected = false;
            self.removeSocket(sock);
            if (self.closing) return self.emit('close');
            const retry = self.retry || self.get('retry timeout');
            if (retry === 0) return self.emit('close');
            setTimeout(function () {
                sockDebug('attempting reconnect');
                self.emit('reconnect attempt');
                sock.destroy();
                self.connect(port, host);
                self.retry = Math.round(Math.min(max, retry * 1.5));
            }, retry);
        });

        sock.on('connect', function () {
            sockDebug('connect');
            self.connected = true;
            self.addSocket(sock);
            self.retry = self.get('retry timeout');
            self.emit('connect');
            fn && fn();
        });

        sockDebug('connect attempt %s:%s', host, port);
        sock.connect(port as any, host as string);
        return this;
    }

    /**
     * Handle connection.
     *
     * @param {Socket} sock
     * @api private
     */

    public onconnect(sock: net.Socket) {
        const self = this;
        let addr: string = '';
        if (sock.remoteAddress && sock.remotePort) {
            addr = sock.remoteAddress + ':' + sock.remotePort;
            // @ts-ignore
        } else if (sock.server && sock.server._pipeName) {
            // @ts-ignore
            addr = sock.server._pipeName;
        }

        sockDebug('accept %s', addr);
        this.addSocket(sock);
        this.handleErrors(sock);
        this.emit('connect', sock);
        sock.on('close', function () {
            sockDebug('disconnect %s', addr);
            self.emit('disconnect', sock);
            self.removeSocket(sock);
        });
    }

    /**
     * Bind to `port` at `host` and invoke `fn()`.
     *
     * Defaults `host` to INADDR_ANY.
     *
     * Emits:
     *
     *  - `connection` when a client connects
     *  - `disconnect` when a client disconnects
     *  - `bind` when bound and listening
     *
     * @param {Number|String} port
     * @param {Function} fn
     * @return {Socket}
     * @api public
     */

    public bind(port, host, fn) {
        const self = this;
        if ('client' == this.type) throw new Error('cannot bind() after connect()');
        if ('function' == typeof host) (fn = host), (host = undefined);

        let unixSocket = false;

        if ('string' == typeof port) {
            const uri = url.parse(port);

            if (uri.pathname) {
                fn = host as any;
                host = null as any;
                port = uri.pathname as any;
                unixSocket = true;
            } else {
                host = uri.hostname || '0.0.0.0';
                port = parseInt(uri.port as any, 10);
            }
        } else {
            host = host || '0.0.0.0';
        }

        this.type = 'server';

        this.server = net.createServer(this.onconnect.bind(this));

        sockDebug('bind %s:%s', host, port);
        this.server.on('listening', this.emit.bind(this, 'bind'));

        if (unixSocket) {
            // TODO: move out
            this.server.on('error', function (e: any) {
                sockDebug('Got error while trying to bind', e.stack || e);
                if (e.code == 'EADDRINUSE') {
                    // Unix file socket and error EADDRINUSE is the case if
                    // the file socket exists. We check if other processes
                    // listen on file socket, otherwise it is a stale socket
                    // that we could reopen
                    // We try to connect to socket via plain network socket
                    const clientSocket = new net.Socket();

                    clientSocket.on('error', function (e2: any) {
                        sockDebug('Got sub-error', e2);
                        if (e2.code == 'ECONNREFUSED' || e2.code == 'ENOENT') {
                            // No other server listening, so we can delete stale
                            // socket file and reopen server socket
                            try {
                                fs.unlinkSync(port as any);
                            } catch (e) {}
                            self.server?.listen(port, host as any, fn);
                        }
                    });

                    clientSocket.connect({ path: port as any }, function () {
                        // Connection is possible, so other server is listening
                        // on this file socket
                        if (fn) return fn(new Error('Process already listening on socket ' + port));
                    });
                } else {
                    try {
                        fs.unlinkSync(port);
                    } catch (e) {}
                    self.server?.listen(port, host, fn);
                }
            });
        }

        this.server.listen(port, host, fn);
        return this;
    }
    // 未实现
    public send(...args: any[]) {}

    // 未实现
    protected enqueue(...args: any[]) {}
}
