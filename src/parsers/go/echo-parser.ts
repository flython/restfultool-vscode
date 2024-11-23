import * as vscode from 'vscode';
import { IFrameworkParser } from '../parser.interface';
import { ApiEndpoint } from '../../models/api-endpoint.model';

export class EchoParser implements IFrameworkParser {
    async canParse(filePath: string, content: string): Promise<boolean> {
        // TODO: 检查是否为Echo框架的路由定义
        return content.includes('echo.New()') || 
               content.includes('*echo.Echo');
    }

    async parseFile(filePath: string, content: string): Promise<ApiEndpoint[]> {
        // TODO: 实现Echo框架的路由解析
        // 需要解析如下格式的路由：
        // e.GET("/users", getUsers)
        // e.POST("/users", createUser)
        // group.PUT("/users/:id", updateUser)
        return [];
    }

    getSupportedFileExtensions(): string[] {
        return ['.go'];
    }
}
