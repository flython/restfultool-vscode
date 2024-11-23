import * as vscode from 'vscode';
import { IFrameworkParser } from '../parser.interface';
import { ApiEndpoint } from '../../models/api-endpoint.model';

export class GinParser implements IFrameworkParser {
    async canParse(filePath: string, content: string): Promise<boolean> {
        // TODO: 检查是否为Gin框架的路由定义
        return content.includes('gin.Engine') || 
               content.includes('gin.Context');
    }

    async parseFile(filePath: string, content: string): Promise<ApiEndpoint[]> {
        // TODO: 实现Gin框架的路由解析
        // 需要解析如下格式的路由：
        // r.GET("/ping", handler)
        // r.POST("/user", createUser)
        // group.PUT("/update", updateHandler)
        return [];
    }

    getSupportedFileExtensions(): string[] {
        return ['.go'];
    }
}
