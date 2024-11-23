import * as vscode from 'vscode';
import { IFrameworkParser } from '../parser.interface';
import { ApiEndpoint } from '../../models/api-endpoint.model';
import { HttpMethod, HttpMethodUtils } from '../../models/http-method.enum';

export class JaxRsParser implements IFrameworkParser {
    async canParse(filePath: string, content: string): Promise<boolean> {
        return content.includes('@Path') && 
               (content.includes('@GET') || 
                content.includes('@POST') || 
                content.includes('@PUT') || 
                content.includes('@DELETE') || 
                content.includes('@PATCH'));
    }

    async parseFile(filePath: string, content: string): Promise<ApiEndpoint[]> {
        const endpoints: ApiEndpoint[] = [];
        const lines = content.split('\n');

        let className = '';
        let classPath = '';
        let isResource = false;

        // 首先检查类级别的注解
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.includes('@Path')) {
                isResource = true;
                const match = line.match(/@Path\s*\(\s*["']([^"']*)["']\s*\)/);
                if (match) {
                    classPath = match[1];
                    classPath = classPath.startsWith('/') ? classPath : '/' + classPath;
                }
            } else if (line.includes('class ')) {
                className = line.split('class ')[1].split(' ')[0];
                break;
            }
        }

        if (!isResource) {
            return endpoints;
        }

        // 处理方法级别的注解
        let currentMethodName = '';
        let currentMethodPath = '';
        let currentMethod: HttpMethod | null = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // 检查HTTP方法注解
            const methodMatch = line.match(/@(GET|POST|PUT|DELETE|PATCH)/);
            if (methodMatch) {
                currentMethod = HttpMethodUtils.fromString(methodMatch[1]);
                continue;
            }

            // 检查方法级别的@Path注解
            if (line.includes('@Path')) {
                const match = line.match(/@Path\s*\(\s*["']([^"']*)["']\s*\)/);
                if (match) {
                    currentMethodPath = match[1];
                    currentMethodPath = currentMethodPath.startsWith('/') ? currentMethodPath : '/' + currentMethodPath;
                }
                continue;
            }

            // 检查方法定义
            if (currentMethod && (line.includes('public') || line.includes('private') || line.includes('protected'))) {
                const methodMatch = line.match(/\s(\w+)\s*\(/);
                if (methodMatch) {
                    currentMethodName = methodMatch[1];
                    
                    // 构建完整路径
                    const fullPath = classPath + (currentMethodPath || '/');

                    endpoints.push({
                        path: fullPath,
                        method: currentMethod,
                        location: new vscode.Location(
                            vscode.Uri.file(filePath),
                            new vscode.Position(i, 0)
                        ),
                        className,
                        methodName: currentMethodName,
                        framework: 'JAX-RS'
                    });

                    // 重置方法相关变量
                    currentMethodName = '';
                    currentMethodPath = '';
                    currentMethod = null;
                }
            }
        }

        return endpoints;
    }

    getSupportedFileExtensions(): string[] {
        return ['.java'];
    }
}
