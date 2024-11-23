import * as vscode from 'vscode';
import { IFrameworkParser } from '../parser.interface';
import { ApiEndpoint } from '../../models/api-endpoint.model';

export class FastAPIParser implements IFrameworkParser {
    async canParse(filePath: string, content: string): Promise<boolean> {
        // TODO: 检查是否为FastAPI框架的路由定义
        return content.includes('from fastapi import FastAPI') || 
               content.includes('@app.') ||
               content.includes('@router.');
    }

    async parseFile(filePath: string, content: string): Promise<ApiEndpoint[]> {
        // TODO: 实现FastAPI框架的路由解析
        // 需要解析如下格式的路由：
        // @app.get("/items/{item_id}")
        // @app.post("/users/")
        // @router.put("/items/{item_id}")
        return [];
    }

    getSupportedFileExtensions(): string[] {
        return ['.py'];
    }
}
