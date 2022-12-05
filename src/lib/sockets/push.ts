/**
 * Module dependencies.
 */

import roundrobin from '../plugins/round-robin';
import queue from '../plugins/queue';
import Socket from './sock';

/**
 * Expose `PushSocket`.
 */

export default class PushSocket extends Socket {
    constructor() {
        super();
        this.use(queue());
        this.use(roundrobin({ fallback: this.enqueue }));
    }
}
