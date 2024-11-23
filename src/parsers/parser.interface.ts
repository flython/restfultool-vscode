import * as vscode from 'vscode';
import { ApiEndpoint } from '../models/api-endpoint.model';

export interface IFrameworkParser {
    /**
     * 检查文件是否属于该框架
     * @param filePath 文件路径
     * @param content 文件内容
     */
    canParse(filePath: string, content: string): Promise<boolean>;

    /**
     * 解析文件中的API端点
     * @param filePath 文件路径
     * @param content 文件内容
     */
    parseFile(filePath: string, content: string): Promise<ApiEndpoint[]>;

    /**
     * 获取该框架支持的文件扩展名
     */
    getSupportedFileExtensions(): string[];
}
