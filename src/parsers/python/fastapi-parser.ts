import * as vscode from 'vscode';
import { IFrameworkParser } from '../parser.interface';
import { ApiEndpoint } from '../../models/api-endpoint.model';
import { HttpMethod, HttpMethodUtils } from '../../models/http-method.enum';

export class FastAPIParser implements IFrameworkParser {
    async canParse(filePath: string, content: string): Promise<boolean> {
        return content.includes('from fastapi import') &&
               (content.includes('@app.get') ||
                content.includes('@app.post') ||
                content.includes('@app.put') ||
                content.includes('@app.delete') ||
                content.includes('@app.patch') ||
                content.includes('@router.get') ||
                content.includes('@router.post') ||
                content.includes('@router.put') ||
                content.includes('@router.delete') ||
                content.includes('@router.patch'));
    }

    async parseFile(filePath: string, content: string): Promise<ApiEndpoint[]> {
        const endpoints: ApiEndpoint[] = [];
        const lines = content.split('\n');

        let className = '';
        let routerPrefix = '';

        // 查找APIRouter的前缀
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes('APIRouter(prefix=')) {
                const match = line.match(/prefix=["']([^"']*)["']/);
                if (match) {
                    routerPrefix = match[1];
                    routerPrefix = routerPrefix.startsWith('/') ? routerPrefix : '/' + routerPrefix;
                }
            }
        }

        // 处理路由装饰器
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // 检查路由装饰器
            const decoratorMatch = line.match(/@(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*["']([^"']*)["']/i);
            if (decoratorMatch) {
                const method = HttpMethodUtils.fromString(decoratorMatch[1].toUpperCase());
                let path = decoratorMatch[2];
                path = path.startsWith('/') ? path : '/' + path;

                // 如果有路由前缀，添加到路径中
                const fullPath = routerPrefix + path;

                // 获取函数名（在下一行）
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();
                    const funcMatch = nextLine.match(/(?:async\s+)?def\s+(\w+)\s*\(/);
                    if (funcMatch) {
                        const methodName = funcMatch[1];

                        endpoints.push({
                            path: fullPath,
                            method,
                            location: new vscode.Location(
                                vscode.Uri.file(filePath),
                                new vscode.Position(i, 0)
                            ),
                            className: this.extractClassName(lines, i) || 'main',
                            methodName,
                            framework: 'FastAPI'
                        });
                    }
                }
            }
        }

        return endpoints;
    }

    private extractClassName(lines: string[], currentLine: number): string {
        // 向上查找最近的类定义
        for (let i = currentLine; i >= 0; i--) {
            const line = lines[i].trim();
            const match = line.match(/class\s+(\w+)[\s:(]/);
            if (match) {
                return match[1];
            }
        }
        return '';
    }

    getSupportedFileExtensions(): string[] {
        return ['.py'];
    }
}
