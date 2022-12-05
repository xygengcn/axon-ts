/**
 * Deps.
 */

import Socket from '../sockets/sock';
import { slice } from '../utils';

/**
 * Round-robin plugin.
 *
 * Provides a `send` method which will
 * write the `msg` to all connected peers.
 *
 * @param {Object} options
 * @api private
 */

export default function roundrobin(options?: { fallback: (args: any) => void }) {
    options = options || { fallback: (args: any) => {} };
    let fallback = options?.fallback || function (args: any) {};
    return function (sock: Socket) {
        /**
         * Bind callback to `sock`.
         */

        fallback = fallback.bind(sock);

        /**
         * Initialize counter.
         */

        let n = 0;

        /**
         * Sends `msg` to all connected peers round-robin.
         */

        sock.send = function (...args: any[]) {
            const socks = this.socks;
            const len = socks.length;
            const sock = socks[n++ % len];

            const msg = slice(args);

            if (sock && sock.writable) {
                sock.write(this.pack(msg));
            } else {
                fallback(msg);
            }
        };
    };
}
