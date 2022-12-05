/**
 * Module dependencies.
 */
import debug from 'debug';

const queueDebug = debug('axon:queue');

/**
 * Queue plugin.
 *
 * Provides an `.enqueue()` method to the `sock`. Messages
 * passed to `enqueue` will be buffered until the next
 * `connect` event is emitted.
 *
 * Emits:
 *
 *  - `drop` (msg) when a message is dropped
 *  - `flush` (msgs) when the queue is flushed
 *
 * @param {Object} options
 * @api private
 */

export default function queue(options?: object) {
    options = options || {};

    return function (sock) {
        /**
         * Message buffer.
         */

        sock.queue = [];

        /**
         * Flush `buf` on `connect`.
         */

        sock.on('connect', function () {
            const prev = sock.queue;
            const len = prev.length;
            sock.queue = [];
            queueDebug('flush %d messages', len);
            for (let i = 0; i < len; ++i) {
                // @ts-ignore
                this.send.apply(this, prev[i]);
            }
            sock.emit('flush', prev);
        });

        /**
         * Pushes `msg` into `buf`.
         */

        sock.enqueue = function (msg) {
            const hwm = sock.settings.hwm;
            if (sock.queue.length >= hwm) {
                return drop(msg);
            }
            sock.queue.push(msg);
        };

        /**
         * Drop the given `msg`.
         */

        function drop(msg) {
            queueDebug('drop');
            sock.emit('drop', msg);
        }
    };
}
