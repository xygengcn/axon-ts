/**
 * Module dependencies.
 */

import Socket from './sock';

/**
 * Expose `PullSocket`.
 */

export default class PullSocket extends Socket {
    public send() {
        throw new Error('pull sockets should not send messages');
    }
}
