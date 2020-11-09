import Driver from "./session";
import { resolve } from "path";
import { decode, encode } from "./utils";
import * as DefaultDriver from './driver/default'
import hook, { HookWhen } from '@ctsy/hook'
import { get, set } from 'lodash'

//  可能存在溢出风险
const _cache: { [index: string]: { _time: number, [index: string]: any } } = {};

/**
 * Session操作
 */
export class Session {
    _ctx: any;
    _session_id: string = "";
    _driver: Driver = new Driver;
    protected _started = false;
    _lock = false;
    _locks: Function[] = [];
    _session: any = {}
    constructor(ctx: any) {
        // ctx.session = this;
        this._ctx = ctx;
    }
    /**
     * 启动session
     */
    async start() {
        try {
            let config: any = await this._ctx.config.getSessionConfig();
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
            this._driver = new driver.default();
            await this._driver.start(this._ctx, config.Config, config.DriverConfig || {});
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
            await this._driver.setSessionID(SessionID)
            // if (!_cache[this._session_id])
            //     _cache[this._session_id] = {
            //         _time: Date.now(),
            //     };
            // else
            //     _cache[this._session_id]._time = Date.now()
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
        await this.check()
        console.log('get', Key, get(this._session, Key))
        return get(this._session, Key);
    }
    async check() {
        if (this._lock) {
            return new Promise((s, j) => {
                this._locks.push(s)
            })
        }
        this._lock = true;
        if (!this._started) {
            await this.start()
        }
        if (!this._session.__start) {
            try {
                let _s = (await this._driver.get('All')) || {};
                if ('string' == typeof _s) {
                    _s = decode(_s)
                    // this._session = { __start: true, __save: false }
                }
                if ('string' == typeof _s) { _s = {} }
                this._session = _s;
                this._session.__start = true;
                this._session.__save = false;
            } catch (error) {
                // debugger
            }
        }
        this._lock = false;
        for (let x of this._locks) {
            x(true);
        }
        this._locks = []
    }
    /**
     * 设置键
     * @param Key 
     * @param Value 
     */
    async set(Key: string, Value: any) {
        await this.check()
        set(this._session, Key, Value)
        this._session.__save = true;
        // console.log('set', Key, Value)
        return true;
    }
    /**
     * 删除某个键
     * @param Key 
     */
    async delete(Key: string) {
        if (!this._started) {
            await this.start()
        }
        // delete _cache[this._session_id][Key]
        // await hook.emit(SessionHooks.DEL_SESSION, this._ctx, { SessionID: this._session_id, Key })
        return await this._driver.delete(Key);
    }
    /**
     * 销毁
     */
    async destory() {
        if (!this._started) {
            await this.start()
        }
        // delete _cache[this._session_id]
        // await hook.emit(SessionHooks.DESTORY_SESSION, this._ctx, { SessionID: this._session_id })
        return await this._driver.destory()
    }
    async end() {
        if (this._started) {
            if (this._session.__save) {
                console.log('end save', this._session_id)
                await this._driver.set('All', encode(this._session));
            }
            await this._driver.end()
        }
    }
}
export default async function session(ctx: any, next: Function) {
    //需要的时候才启动
    await hook.emit(SessionHooks.SESSION, HookWhen.Before, ctx, ctx.session);
    ctx.session = new Session(ctx);
    // await ctx.session.start()
    await hook.emit(SessionHooks.SESSION, HookWhen.After, ctx, ctx.session);
    await next()
    await ctx.session.end()
}

export enum SessionHooks {
    GET_SESSION = 'GET_SESSION',
    DEL_SESSION = 'DEL_SESSION',
    SET_SESSION = 'SET_SESSION',
    DESTORY_SESSION = 'DESTORY_SESSION',
    NEW_SESSION = 'NEW_SESSION',
    SESSION = 'SESSION'
}
export const SessionDrvier = Driver
/**
 * 安装session拓展
 * @param that 
 * @param koa 
 * @param conf 
 */
export function install(that: any, koa: any, conf: any) {
    koa.use(session)
    let session_cache_expire = 5 * 60 * 1000;
    //清理session缓存
    setInterval(() => {
        let t = Date.now()
        for (let x in _cache) {
            let c = _cache[x];
            if (c._time + session_cache_expire < t) {
                delete _cache[x];
            }
        }
    }, session_cache_expire)
}