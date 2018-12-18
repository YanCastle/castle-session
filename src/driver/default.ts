import SessionDrvier from '../session';
import * as fs from 'mz/fs'
import { join } from 'path';
import { mkdirs } from '../utils';
export default class DefaultSession extends SessionDrvier {
    path: string = "";
    async setSessionID(value: string) {
        super.setSessionID(value);
        await mkdirs(this.path)
    }
    async exist(SessionID: string) {
        return await fs.exists(join((this._config ? this._config.path : undefined) || '.sess', SessionID));
    }
    async get(key: string) {
        try {
            return (await fs.readFile(this.getKey(key))).toString()
        } catch (error) {
            return undefined;
        }
    }
    async set(key: string, value: string) {
        (await fs.writeFile(this.getKey(key), value))
        return true;
    }
    async delete(key: string) {
        try {
            await fs.unlink(this.getKey(key))
        } catch (error) {

        }
        return true;
    }
    async destory() {
        //先读取目录，删除目录下的文件，再删除目录
        try {
            let files = await fs.readdir(this.path);
            for (let i = 0; i < files.length; i++) {
                if (files[i] != '.' && files[i] != '..') {
                    await fs.unlink(join(this.path, files[i]));
                }
            }
            return await fs.rmdir(this.path)
        } catch (error) {
            debugger
        }
    }
}