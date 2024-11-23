import * as vscode from 'vscode';
import { IFrameworkParser } from '../parser.interface';
import { ApiEndpoint } from '../../models/api-endpoint.model';
import { HttpMethod, HttpMethodUtils } from '../../models/http-method.enum';

export class FlaskParser implements IFrameworkParser {
    async canParse(filePath: string, content: string): Promise<boolean> {
        return content.includes('from flask import') &&
               (content.includes('@app.route') ||
                content.includes('@blueprint.route') ||
                content.includes('.add_url_rule') ||
                content.includes('from flask_restful import') ||
                content.includes('.add_resource'));
    }

    async parseFile(filePath: string, content: string): Promise<ApiEndpoint[]> {
        const endpoints: ApiEndpoint[] = [];
        const lines = content.split('\n');

        let blueprintPrefix = '';
        let currentClass = '';
        let resourceMethods: Map<string, HttpMethod[]> = new Map();

        // 首先扫描所有Resource类定义，收集它们支持的HTTP方法
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 检查类定义
            const classMatch = line.match(/class\s+(\w+)[\s:(]/);
            if (classMatch) {
                currentClass = classMatch[1];
                const methods: HttpMethod[] = [];
                
                // 向下查找类中定义的HTTP方法
                let j = i + 1;
                while (j < lines.length && (lines[j].trim().startsWith('def ') || lines[j].trim() === '' || lines[j].startsWith(' '))) {
                    const methodLine = lines[j].trim();
                    if (methodLine.startsWith('def ')) {
                        const methodMatch = methodLine.match(/def\s+(get|post|put|delete|patch)\s*\(/i);
                        if (methodMatch) {
                            methods.push(HttpMethodUtils.fromString(methodMatch[1].toUpperCase()));
                        }
                    }
                    j++;
                }
                
                // 如果没有找到具体的HTTP方法，默认为GET
                if (methods.length === 0) {
                    methods.push(HttpMethod.GET);
                }
                
                resourceMethods.set(currentClass, methods);
            }
        }

        // 查找Blueprint的前缀
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes('Blueprint(')) {
                const urlPrefixMatch = line.match(/url_prefix=["']([^"']*)["']/);
                if (urlPrefixMatch) {
                    blueprintPrefix = urlPrefixMatch[1];
                    blueprintPrefix = blueprintPrefix.startsWith('/') ? blueprintPrefix : '/' + blueprintPrefix;
                }
            }
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // 处理Flask-RESTful的add_resource
            const resourceMatch = line.match(/\.add_resource\s*\(\s*(\w+)\s*,\s*["']([^"']*)["']/);
            if (resourceMatch) {
                const resourceClass = resourceMatch[1];
                let path = resourceMatch[2];
                path = path.startsWith('/') ? path : '/' + path;
                const fullPath = blueprintPrefix + path;

                // 获取该Resource类支持的HTTP方法
                const methods = resourceMethods.get(resourceClass) || [HttpMethod.GET];
                
                // 为每个HTTP方法创建一个端点
                for (const method of methods) {
                    endpoints.push({
                        path: fullPath,
                        method,
                        location: new vscode.Location(
                            vscode.Uri.file(filePath),
                            new vscode.Position(i, 0)
                        ),
                        className: resourceClass,
                        methodName: method.toString().toLowerCase(),
                        framework: 'Flask-RESTful'
                    });
                }
                continue;
            }

            // 处理标准Flask路由装饰器
            if (line.includes('@app.route') || line.includes('@blueprint.route')) {
                const routeMatch = line.match(/@(?:app|blueprint)\.route\s*\(\s*["']([^"']*)["']/);
                if (routeMatch) {
                    let path = routeMatch[1];
                    path = path.startsWith('/') ? path : '/' + path;
                    const fullPath = blueprintPrefix + path;

                    // 提取HTTP方法
                    let method = HttpMethod.GET; // 默认为GET
                    const methodsMatch = line.match(/methods=\[["']([^"']*)["']/);
                    if (methodsMatch) {
                        method = HttpMethodUtils.fromString(methodsMatch[1]);
                    }

                    // 获取函数名（在下一行）
                    if (i + 1 < lines.length) {
                        const nextLine = lines[i + 1].trim();
                        const funcMatch = nextLine.match(/def\s+(\w+)\s*\(/);
                        if (funcMatch) {
                            const methodName = funcMatch[1];

                            endpoints.push({
                                path: fullPath,
                                method,
                                location: new vscode.Location(
                                    vscode.Uri.file(filePath),
                                    new vscode.Position(i, 0)
                                ),
                                className: currentClass || 'main',
                                methodName,
                                framework: 'Flask'
                            });
                        }
                    }
                }
            }

            // 处理add_url_rule
            const urlRuleMatch = line.match(/\.add_url_rule\s*\(\s*["']([^"']*)["']/);
            if (urlRuleMatch) {
                let path = urlRuleMatch[1];
                path = path.startsWith('/') ? path : '/' + path;
                const fullPath = blueprintPrefix + path;

                // 提取视图函数名
                const viewFuncMatch = line.match(/view_func=(\w+)/);
                if (viewFuncMatch) {
                    const methodName = viewFuncMatch[1];

                    // 提取HTTP方法
                    let method = HttpMethod.GET; // 默认为GET
                    const methodsMatch = line.match(/methods=\[["']([^"']*)["']/);
                    if (methodsMatch) {
                        method = HttpMethodUtils.fromString(methodsMatch[1]);
                    }

                    endpoints.push({
                        path: fullPath,
                        method,
                        location: new vscode.Location(
                            vscode.Uri.file(filePath),
                            new vscode.Position(i, 0)
                        ),
                        className: currentClass || 'main',
                        methodName,
                        framework: 'Flask'
                    });
                }
            }
        }

        return endpoints;
    }

    getSupportedFileExtensions(): string[] {
        return ['.py'];
    }
}
