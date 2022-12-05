/**
 * Module dependencies.
 */

import Socket from './sock';

/**
 * Expose `PubSocket`.
 */

export default class PubSocket extends Socket {
    /**
     * Send `msg` to all established peers.
     *
     * @param {Mixed} msg
     * @api public
     */

    public send(...msg: any[]) {
        const socks = this.socks;

        const buf = this.pack(msg);

        for (let sock of socks) {
            if (sock.writable) sock.write(buf);
        }

        return this;
    }

    public sendv2(data: any, cb: Function) {
        const socks = this.socks;
        const len = socks.length;

        if (len == 0) return process.nextTick(cb);

        const buf = this.pack([data]);

        let i = 0;

        socks.forEach(function (sock) {
            if (sock.writable)
                sock.write(buf, function () {
                    i++;
                    if (i === len) process.nextTick(cb);
                });
            else {
                i++;
                if (i === len) process.nextTick(cb);
            }
        });

        return this;
    }
}
