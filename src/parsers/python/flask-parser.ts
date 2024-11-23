import * as vscode from 'vscode';
import { IFrameworkParser } from '../parser.interface';
import { ApiEndpoint } from '../../models/api-endpoint.model';

export class FlaskParser implements IFrameworkParser {
    async canParse(filePath: string, content: string): Promise<boolean> {
        // TODO: 检查是否为Flask框架的路由定义
        return content.includes('from flask import Flask') || 
               content.includes('@app.route');
    }

    async parseFile(filePath: string, content: string): Promise<ApiEndpoint[]> {
        // TODO: 实现Flask框架的路由解析
        // 需要解析如下格式的路由：
        // @app.route('/users', methods=['GET'])
        // @app.route('/users/<int:user_id>', methods=['POST'])
        return [];
    }

    getSupportedFileExtensions(): string[] {
        return ['.py'];
    }
}
