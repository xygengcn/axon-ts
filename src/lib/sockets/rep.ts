/**
 * Module dependencies.
 */

import Message from 'amp-message';
import debug from 'debug';
import net from 'net';
import { slice } from '../utils';
import Socket from './sock';

const repDebug = debug('axon:rep');

/**
 * Expose `RepSocket`.
 */

export default class RepSocket extends Socket {
    /**
     * Incoming.
     *
     * @param {net.Socket} sock
     * @return {Function} closure(msg, mulitpart)
     * @api private
     */

    public onmessage(sock: net.Socket) {
        const self = this;

        return function (buf: IMessage) {
            const msg = new Message(buf);
            const args = msg.args;
            const id = args.pop();
            self.emit.call(self, 'message', ...args, reply);
            function reply(...params: any[]) {
                let fn = (...args: any[]) => {};
                const args = slice(params);
                args[0] = args[0] || null;
                var hasCallback = 'function' == typeof args[args.length - 1];
                if (hasCallback) fn = args.pop();

                args.push(id);

                if (sock.writable) {
                    sock.write(self.pack(args), function () {
                        fn(true);
                    });
                    return true;
                } else {
                    repDebug('peer went away');
                    process.nextTick(function () {
                        fn(false);
                    });
                    return false;
                }
            }
        };
    }
}
