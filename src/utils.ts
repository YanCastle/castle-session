import * as fs from 'mz/fs'
import { dirname } from 'path';
export enum DataType {
    Buffer,
    JSON,
    Boolean,
    Number,
    String,
}
export function getDataType(data: any): DataType {
    if (data instanceof Buffer) {
        return DataType.Buffer
    } else if ('number' == typeof data) {
        return DataType.Number
    } else if ('boolean' == typeof data) {
        return DataType.Boolean
    } else if ('string' == typeof data) {
        return DataType.String
    } else {
        return DataType.JSON
    }
}
/**
 * 解码
 * @param data 
 */
export function decode(data: string): any {
    let dt = Number(data.substr(0, 1))
    let t = { Data: data.substr(1) }
    switch (dt) {
        case DataType.JSON:
            return JSON.parse(t.Data.toString())
            break;
        case DataType.Boolean:
            return t.Data.toString() == '1'
            break;
        case DataType.Number:
            return Number(t.Data.toString())
            break;
        case DataType.String:
            return t.Data.toString()
            break;
        case DataType.Buffer:
            // t.Data=
            return t.Data;
            break;
    }
}
/**
 * 编码
 * @param Data 
 */
export function encode(Data: any) {
    let data: string | Buffer | any = Data;
    let type = getDataType(Data)
    switch (type) {
        case DataType.JSON:
            data = JSON.stringify(data)
            break;
        case DataType.Boolean:
            data = data ? 1 : 0;
            break;
    }
    return [type, data].join('')
}


export async function mkdirs(dirpath: string, mode = 0o777) {
    if (await fs.exists(dirpath)) {
        return true;
    } else {
        let parent_path = dirname(dirpath);
        if (await fs.exists(parent_path)) {
            return fs.mkdir(dirpath, mode)
        } else {
            await mkdirs(parent_path, mode)
            await fs.mkdir(dirpath, mode)
        }
    }
}