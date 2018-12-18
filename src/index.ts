import Driver from "./session";
import hook from '../../castle-config/dist/hook'
import { CastleContext } from '../../castle-config/dist/index';
import { resolve } from "path";
import { decode, encode } from "./utils";
import * as DefaultDriver from './driver/default'
/**
 * Session操作
 */
export class Session {
    _ctx: CastleContext;
    _session_id: string = "";
    _driver: Driver = new Driver;
    protected _started = false;
    constructor(ctx: any) {
        ctx.session = this;
        this._ctx = ctx;
    }
    /**
     * 启动session
     */
    async start() {
        try {
            let config = await this._ctx.config.getSessionConfig();
            let driver: any;
            if ('string' == typeof config.Driver) {
                if ('default' == config.Driver) {
                    //使用castle-session-default包
                    driver = DefaultDriver
                } else if ('.' == config.Driver.substr(0, 1)) {
                    //路径加载
                    driver = require(resolve(config.Driver))
                } else {
                    //包加载
                    driver = require(config.Driver);
                }
            } else if ('object' == typeof config.Driver) {
                driver = config.Driver;
            } else {
                throw new Error('Unsupport Session Driver:' + config.Driver)
            }
            let SessionID = await this._ctx.config.getSessionID();
            while (!SessionID) {
                SessionID = await this._ctx.config.getNewSessionID();
                if (await this._driver.exist(SessionID)) {
                    //重新循环生成session
                    SessionID = '';
                } else {
                    break;
                }
            }
            this._session_id = SessionID;
            this._driver = new driver.default();
            await this._driver.start(this._ctx, config.Config);
            await this._driver.setSessionID(SessionID)
            this._started = true;
        } catch (error) {
            throw error;
        }
        //session_id可以自定义，来源于token或者其他字段数据
    }
    /**
     * 获取键
     * @param Key 
     */
    async get(Key: string) {
        if (!this._started) {
            await this.start()
        }
        let Value = await this._driver.get(Key)
        if (Value)
            Value = decode(Value);
        await hook.emit(SessionHooks.GET_SESSION, this._ctx, { SessionID: this._session_id, Key, Value })
        return Value;
    }
    /**
     * 设置键
     * @param Key 
     * @param Value 
     */
    async set(Key: string, Value: any) {
        if (!this._started) {
            await this.start()
        }
        let value = encode(Value);
        await hook.emit(SessionHooks.SET_SESSION, this._ctx, { SessionID: this._session_id, Key, Value: value })
        return await this._driver.set(Key, value);
    }
    /**
     * 删除某个键
     * @param Key 
     */
    async delete(Key: string) {
        if (!this._started) {
            await this.start()
        }
        await hook.emit(SessionHooks.DEL_SESSION, this._ctx, { SessionID: this._session_id, Key })
        return await this._driver.delete(Key);
    }
    /**
     * 销毁
     */
    async destory() {
        if (!this._started) {
            await this.start()
        }
        await hook.emit(SessionHooks.DESTORY_SESSION, this._ctx, { SessionID: this._session_id })
        return await this._driver.destory()
    }
    async end() {
        if (this._started) {
            this._driver.end()
        }
    }
}
export default async function session(ctx: any, next: Function) {
    //需要的时候才启动
    ctx.session = new Session(ctx);
    // await ctx.session.start()
    await next()
    await ctx.session.end()
}

export enum SessionHooks {
    GET_SESSION = 'GET_SESSION',
    DEL_SESSION = 'DEL_SESSION',
    SET_SESSION = 'SET_SESSION',
    DESTORY_SESSION = 'DESTORY_SESSION',
    NEW_SESSION = 'NEW_SESSION'
}
export const SessionDrvier = Driver