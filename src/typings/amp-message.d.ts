// Type definitions for amp-message 0.1
// Project: https://github.com/visionmedia/node-amp-message
// Definitions by: DefinitelyTyped <https://github.com/DefinitelyTyped>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.4

/// <reference types="node" />

declare module 'amp-message' {
    export default class Message {
        constructor(args: IMessage);

        args: string[];

        inspect(): string;

        toBuffer(): Buffer;

        push(...items: Buffer[]): number;

        pop(): Buffer | string | undefined;

        shift(): Buffer | string | undefined;

        unshift(...items: Buffer[]): number;
    }
}

declare type IMessage = string | Buffer | Buffer[];
