import { join } from "path";

export default class Driver {
    _ctx: any;
    _config: any;
    _SessionID: string = '';
    path: string = "";
    get SessionID() {
        return this._SessionID;
    }
    async setSessionID(value: string) {
        this._SessionID = value;
        this.path = join(this._config.path || '.sess', value);
    }
    getKey(key: string) {
        return join(this.path, key)
    }
    async start(ctx: any, config: any) {
        this._ctx = ctx;
        this._config = config;
    }
    async get(key: string): Promise<any> {
        throw new Error('Unsupport')
    }
    async set(key: string, value: any): Promise<boolean> {
        throw new Error('Unsupport')
    }
    /**
     * 删除不要的Key
     * @param key 
     */
    async delete(key: string): Promise<any> {
        throw new Error('Unsupport')
    }
    /**
     * 检查SessionID是否存在
     * @param SessionID 
     */
    async exist(SessionID: string): Promise<boolean> {
        throw new Error('Unsupport')
    }
    /**
     * 销毁Session
     */
    async destory() {
        throw new Error('Unsupport')
    }
    async end() {

    }
}