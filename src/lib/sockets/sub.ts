/**
 * Module dependencies.
 */

import { stringToRegExp } from '../utils';
import Message from 'amp-message';
import Socket from './sock';
import debug from 'debug';
import net from 'net';

const subDebug = debug('axon:sub');

/**
 * Expose `SubSocket`.
 */

export default class SubSocket extends Socket {
    private subscriptions: Array<RegExp> = [];

    constructor() {
        super();
        this.subscriptions = [];
    }

    /**
     * Check if this socket has subscriptions.
     *
     * @return {Boolean}
     * @api public
     */

    public hasSubscriptions(): boolean {
        return !!this.subscriptions.length;
    }

    /**
     * Check if any subscriptions match `topic`.
     *
     * @param {String} topic
     * @return {Boolean}
     * @api public
     */

    public matches(topic: string): boolean {
        for (let i = 0; i < this.subscriptions.length; ++i) {
            if (this.subscriptions[i].test(topic)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Message handler.
     *
     * @param {net.Socket} sock
     * @return {Function} closure(msg, mulitpart)
     * @api private
     */

    public onmessage(sock: net.Socket): (buf: Buffer | Buffer[]) => void {
        const subs = this.hasSubscriptions();
        const self = this;
        return (buf: Buffer | Buffer[]) => {
            const msg = new Message(buf);
            if (subs) {
                const topic = msg.args[0];
                if (!self.matches(topic)) {
                    subDebug('not subscribed to "%s"', topic);
                    return;
                }
            }
            self.emit('message', ...msg.args, sock);
        };
    }

    /**
     * Subscribe with the given `re`.
     *
     * @param {RegExp|String} re
     * @return {RegExp}
     * @api public
     */

    public subscribe(re: RegExp | string): RegExp {
        subDebug('subscribe to "%s"', re);
        this.subscriptions.push((re = stringToRegExp(re)));
        return re;
    }

    /**
     * Clear current subscriptions.
     *
     * @api public
     */

    public clearSubscriptions() {
        this.subscriptions = [];
    }

    /**
     * Subscribers should not send messages.
     */

    public send() {
        throw new Error('subscribers cannot send messages');
    }

    /**
     * Unsubscribe with the given `re`.
     *
     * @param {RegExp|String} re
     * @api public
     */

    public unsubscribe(re: RegExp | string) {
        subDebug('unsubscribe from "%s"', re);
        re = stringToRegExp(re);
        for (let i = 0; i < this.subscriptions.length; ++i) {
            if (this.subscriptions[i].toString() === re.toString()) {
                this.subscriptions.splice(i--, 1);
            }
        }
    }
}
