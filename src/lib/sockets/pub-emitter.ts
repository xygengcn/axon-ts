/**
 * Module dependencies.
 */

import PubSocket from './pub';

/**
 * Expose `SubPubEmitterSocket`.
 */

export default class PubEmitterSocket {
    public sock!: PubSocket;

    public emit!: PubSocket['send'];

    public bind!: PubSocket['bind'];

    public connect!: PubSocket['connect'];

    public close!: PubSocket['close'];

    public send() {
        throw new Error('PubEmitterSocket cannot send messages');
    }

    constructor(options: any) {
        this.sock = new PubSocket();
        this.emit = this.sock.send.bind(this.sock);
        this.bind = this.sock.bind.bind(this.sock);
        this.connect = this.sock.connect.bind(this.sock);
        this.close = this.sock.close.bind(this.sock);
    }
}
