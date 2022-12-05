/**
 * Slice helper.
 *
 * @api private
 * @param {Arguments} args
 * @return {Array}
 */

import escapeStringRegexp from 'escape-string-regexp';

export function slice<T extends Array<any> = Array<any>>(args: T): T {
    const len = args.length;
    const ret = new Array(len) as T;

    for (let i = 0; i < len; i++) {
        ret[i] = args[i];
    }

    return ret;
}

/**
 * Convert `str` to a `RegExp`.
 *
 * @param {String} str
 * @return {RegExp}
 * @api private
 */

export function stringToRegExp(str: string | RegExp): RegExp {
    if (str instanceof RegExp) return str;
    str = escapeStringRegexp(str);
    str = str.replace(/\\\*/g, '(.+)');
    return new RegExp('^' + str + '$');
}
