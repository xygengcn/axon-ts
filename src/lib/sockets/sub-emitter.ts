/**
 * Module dependencies.
 */

import SubSocket from './sub';

import Message from 'amp-message';

/**
 * Expose `SubEmitterSocket`.
 */

export default class SubEmitterSocket {
    private sock!: SubSocket;

    public bind!: SubSocket['bind'];

    public connect!: SubSocket['connect'];

    public close!: SubSocket['close'];

    private listeners: Array<{ event: string; re: RegExp; fn: Function }> = [];

    /**
     * Initialzie a new `SubEmitterSocket`.
     *
     * @api private
     */

    constructor() {
        this.sock = new SubSocket();
        this.sock.onmessage = this.onmessage.bind(this);
        this.bind = this.sock.bind.bind(this.sock);
        this.connect = this.sock.connect.bind(this.sock);
        this.close = this.sock.close.bind(this.sock);
        this.listeners = [];
    }

    /**
     * Message handler.
     *
     * @param {net.Socket} sock
     * @return {Function} closure(msg, mulitpart)
     * @api private
     */

    public onmessage() {
        const listeners = this.listeners;
        // const self = this;
        return function (buf) {
            const msg = new Message(buf);
            const topic = msg.shift();
            for (let i = 0; i < listeners.length; ++i) {
                const listener = listeners[i];
                const m = listener.re.exec(topic as any);
                if (!m) continue;
                // @ts-ignore
                listener.fn.apply(this, m.slice(1).concat(msg.args));
            }
        };
    }
    /**
     * Subscribe to `event` and invoke the given callback `fn`.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {SubEmitterSocket} self
     * @api public
     */

    public on(event: string, fn: Function): SubEmitterSocket {
        const re = this.sock.subscribe(event);
        this.listeners.push({
            event: event,
            re: re,
            fn: fn
        });
        return this;
    }

    /**
     * Unsubscribe with the given `event`.
     *
     * @param {String} event
     * @return {SubEmitterSocket} self
     * @api public
     */

    public off(event: string): SubEmitterSocket {
        for (let i = 0; i < this.listeners.length; ++i) {
            if (this.listeners[i].event === event) {
                this.sock.unsubscribe(this.listeners[i].re);
                this.listeners.splice(i--, 1);
            }
        }
        return this;
    }
}
