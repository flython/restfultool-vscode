import * as vscode from 'vscode';
import { IFrameworkParser } from '../parser.interface';
import { ApiEndpoint } from '../../models/api-endpoint.model';
import { HttpMethod, HttpMethodUtils } from '../../models/http-method.enum';

export class EchoParser implements IFrameworkParser {
    async canParse(filePath: string, content: string): Promise<boolean> {
        return content.includes('github.com/labstack/echo') &&
               (content.includes('.GET(') ||
                content.includes('.POST(') ||
                content.includes('.PUT(') ||
                content.includes('.DELETE(') ||
                content.includes('.PATCH('));
    }

    async parseFile(filePath: string, content: string): Promise<ApiEndpoint[]> {
        const endpoints: ApiEndpoint[] = [];
        const lines = content.split('\n');

        let currentGroup = '';
        let currentGroupDepth = 0;
        const groupStack: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // 检查路由组
            if (line.includes('.Group(')) {
                const match = line.match(/\.Group\s*\(\s*["']([^"']*)["']/);
                if (match) {
                    currentGroup = match[1];
                    currentGroup = currentGroup.startsWith('/') ? currentGroup : '/' + currentGroup;
                    groupStack.push(currentGroup);
                    currentGroupDepth++;
                }
            }

            // 检查路由组结束
            if (line.includes('}') && currentGroupDepth > 0) {
                groupStack.pop();
                currentGroupDepth--;
            }

            // 检查路由定义
            const methodMatch = line.match(/\.(GET|POST|PUT|DELETE|PATCH)\s*\(\s*["']([^"']*)["']/);
            if (methodMatch) {
                const method = HttpMethodUtils.fromString(methodMatch[1]);
                let path = methodMatch[2];
                path = path.startsWith('/') ? path : '/' + path;

                // 构建完整路径，包含所有活动的路由组
                const fullPath = groupStack.join('') + path;

                // 提取处理函数名
                let handlerName = '';
                const handlerMatch = line.match(/,\s*(\w+)(\.\w+)?\)/);
                if (handlerMatch) {
                    handlerName = handlerMatch[1] + (handlerMatch[2] || '');
                }

                endpoints.push({
                    path: fullPath,
                    method,
                    location: new vscode.Location(
                        vscode.Uri.file(filePath),
                        new vscode.Position(i, 0)
                    ),
                    className: this.extractStructName(lines, i) || 'main',
                    methodName: handlerName,
                    framework: 'Echo'
                });
            }
        }

        return endpoints;
    }

    private extractStructName(lines: string[], currentLine: number): string {
        // 向上查找最近的结构体定义
        for (let i = currentLine; i >= 0; i--) {
            const line = lines[i].trim();
            const match = line.match(/type\s+(\w+)\s+struct/);
            if (match) {
                return match[1];
            }
        }
        return '';
    }

    getSupportedFileExtensions(): string[] {
        return ['.go'];
    }
}
