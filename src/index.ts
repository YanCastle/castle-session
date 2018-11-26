import Driver from "./session";
import hook from 'castle-config/dist/hook'
import { CastleContext } from 'castle-config/dist/index';
import { resolve } from "path";
export class Session {
    _ctx: CastleContext;
    _session_id: string = "";
    _driver: Driver = new Driver;
    constructor(ctx: any) {
        ctx.session = this;
        this._ctx = ctx;
    }
    async start() {
        let config = await this._ctx.config.getSessionConfig();
        let driver: any;
        if ('string' == typeof config.Driver) {
            if ('default' == config.Driver) {
                //使用castle-session-default包
                driver = require('castle-session-default')
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
        try {
            this._driver = new driver.default();
            await this._driver.start(this._ctx, config.Config);
            let SessionID = await this._ctx.config.getSessionID();
            while (!SessionID) {
                SessionID = await this._ctx.config.getNewSessionID();
                if (this._driver.exist(SessionID)) {
                    //重新循环生成session
                    SessionID = '';
                } else {
                    break;
                }
            }
            this._session_id = SessionID;
            this._driver.SessionID = SessionID;
        } catch (error) {
            throw error;
        }
        //session_id可以自定义，来源于token或者其他字段数据
    }
    async get(Key: string) {
        let Value = await this._driver.get(Key)
        await hook.emit(SessionHooks.GET_SESSION, this._ctx, { SessionID: this._session_id, Key, Value })
        return Value;
    }
    async set(Key: string, Value: any) {
        await hook.emit(SessionHooks.SET_SESSION, this._ctx, { SessionID: this._session_id, Key, Value })
        return await this._driver.set(Key, Value);
    }
    async destory() {
        await hook.emit(SessionHooks.DESTORY_SESSION, this._ctx, { SessionID: this._session_id })
        return await this._driver.destory()
    }
}
export default async function session(ctx: any, next: Function) {
    ctx.session = new Session(ctx);
    await ctx.session.start()
    await next()
    await ctx.session.end()
}

export enum SessionHooks {
    GET_SESSION = 'GET_SESSION',
    SET_SESSION = 'SET_SESSION',
    DESTORY_SESSION = 'DESTORY_SESSION',
    NEW_SESSION = 'NEW_SESSION'
}
export const SessionDrvier = Driver