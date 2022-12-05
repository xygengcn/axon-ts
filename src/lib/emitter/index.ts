import { EventEmitter } from 'events';

export default class Emitter extends EventEmitter {
    public settings = {};

    public set(name: string | string[], val: any) {
        if (name instanceof Array) {
            for (let key in name) {
                this.set(key, name[key]);
            }
        } else {
            this.settings[name] = val;
        }
        return this;
    }

    public get(name: string) {
        return this.settings[name];
    }

    public enable(name: string) {
        return this.set(name, true);
    }

    public disable(name: string) {
        return this.set(name, false);
    }

    public enabled(name: string) {
        return !!this.get(name);
    }

    public disabled(name: string) {
        return !this.get(name);
    }
}
