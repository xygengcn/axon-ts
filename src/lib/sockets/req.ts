/**
 * Module dependencies.
 */

import queue from '../plugins/queue';
import { slice } from '../utils';
import Message from 'amp-message';
import Socket from './sock';
import debug from 'debug';

const reqDebug = debug('axon:req');

/**
 * Expose `ReqSocket`.
 */

export default class ReqSocket extends Socket {
    private n: number = 0;

    private ids = 0;

    private callbacks: {};

    private identity: string;

    /**
     * Initialize a new `ReqSocket`.
     *
     * @api private
     */
    constructor() {
        super();
        this.n = 0;
        this.ids = 0;
        this.callbacks = {};
        this.identity = this.get('identity');
        this.use(queue());
    }

    /**
     * Return a message id.
     *
     * @return {String}
     * @api private
     */

    private id(): string {
        return this.identity + ':' + this.ids++;
    }

    /**
     * Emits the "message" event with all message parts
     * after the null delimeter part.
     *
     * @param {net.Socket} sock
     * @return {Function} closure(msg, multipart)
     * @api private
     */

    public onmessage() {
        const self = this;
        return function (buf: Buffer | Buffer[]) {
            const msg = new Message(buf);
            const id = msg.pop() as string;
            const fn = self.callbacks[id];
            if (!fn) return reqDebug('missing callback %s', id);
            fn.apply(null, msg.args);
            delete self.callbacks[id];
        };
    }

    /**
     * Sends `msg` to the remote peers. Appends
     * the null message part prior to sending.
     *
     * @param {Mixed} msg
     * @api public
     */

    public send(...msg: any[]) {
        const socks = this.socks;
        var len = socks.length;
        var sock = socks[this.n++ % len];
        var args = slice(msg);

        if (sock) {
            var hasCallback = 'function' == typeof args[args.length - 1];
            if (!hasCallback) args.push(function () {});
            var fn = args.pop();
            fn.id = this.id();
            this.callbacks[fn.id] = fn;
            args.push(fn.id);
        }

        if (sock) {
            sock.write(this.pack(args));
        } else {
            reqDebug('no connected peers');
            this.enqueue(args);
        }
    }
}
