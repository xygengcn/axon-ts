/**
 * Constructors.
 */

import PubEmitterSocket from './lib/sockets/pub-emitter';
import SubEmitterSocket from './lib/sockets/sub-emitter';
import PushSocket from './lib/sockets/push';
import PullSocket from './lib/sockets/pull';
import PubSocket from './lib/sockets/pub';
import SubSocket from './lib/sockets/sub';
import ReqSocket from './lib/sockets/req';
import RepSocket from './lib/sockets/rep';
import Socket from './lib/sockets/sock';

/**
 * Socket types.
 */

export const types = {
    'pub-emitter': PubEmitterSocket,
    'sub-emitter': SubEmitterSocket,
    push: PushSocket,
    pull: PullSocket,
    pub: PubSocket,
    sub: SubSocket,
    req: ReqSocket,
    rep: RepSocket
};

/**
 * Return a new socket of the given `type`.
 *
 * @param {String} type
 * @param {Object} options
 * @return {Socket}
 * @api public
 */

export const socket = function (type: keyof typeof types, options: Object) {
    const fn = types[type];
    if (!fn) throw new Error('invalid socket type "' + type + '"');
    return new fn(options);
};

export { PubEmitterSocket, SubEmitterSocket, PushSocket, PullSocket, PubSocket, SubSocket, ReqSocket, RepSocket, Socket };
