export default class Driver {
    _ctx: any;
    _config: any;
    SessionID: string = '';
    async start(ctx: any, config: any) {
        this._ctx = ctx;
        this._config = config;
    }
    async get(key: string) {
        throw new Error('Unsupport')
    }
    async set(key: string, value: any) {
        throw new Error('Unsupport')
    }
    async exist(SessionID: string) {
        throw new Error('Unsupport')
    }
    async destory() {
        throw new Error('Unsupport')
    }
}