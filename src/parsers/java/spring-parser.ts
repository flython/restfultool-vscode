import * as vscode from 'vscode';
import { IFrameworkParser } from '../parser.interface';
import { ApiEndpoint } from '../../models/api-endpoint.model';
import { HttpMethod, HttpMethodUtils } from '../../models/http-method.enum';

export class SpringParser implements IFrameworkParser {
    async canParse(filePath: string, content: string): Promise<boolean> {
        return content.includes('@Controller') || 
               content.includes('@RestController') || 
               content.includes('@RequestMapping');
    }

    async parseFile(filePath: string, content: string): Promise<ApiEndpoint[]> {
        const endpoints: ApiEndpoint[] = [];
        const lines = content.split('\n');

        let className = '';
        let classMapping = '';
        let isController = false;
        const endpointAnnotations: { annotation: string; lineNumber: number }[] = [];

        // 首先检查类级别的注解和收集端点注解
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.includes('@Controller') || line.includes('@RestController')) {
                isController = true;
            } else if (line.includes('class ')) {
                className = line.split('class ')[1].split(' ')[0];
            } else if (line.includes('@RequestMapping') && !className) {
                const match = line.match(/\"([^\"]+)\"/);
                if (match) {
                    classMapping = match[1];
                    classMapping = classMapping.endsWith('/') ? classMapping.slice(0, -1) : classMapping;
                    classMapping = classMapping.startsWith('/') ? classMapping : '/' + classMapping;
                }
            } else {
                const annotation = ['@GetMapping', '@PostMapping', '@PutMapping', '@DeleteMapping', '@PatchMapping', '@RequestMapping'].find(a => line.includes(a));
                if (annotation) {
                    endpointAnnotations.push({ annotation, lineNumber: i });
                }
            }

            if (className && !isController) {
                return endpoints;
            }
        }

        if (!isController) {
            return endpoints;
        }

        // 处理方法级别的注解
        for (const { annotation, lineNumber } of endpointAnnotations) {
            const line = lines[lineNumber].trim();
            const methodMatch = lines.slice(lineNumber + 1).find(l => l.includes('public') || l.includes('private') || l.includes('protected'));
            if (methodMatch) {
                const methodName = methodMatch.match(/\s(\w+)\s*\(/)?.[1] || '';
                const pathMatch = line.match(/\"([^\"]+)\"/);
                let methodPath = pathMatch ? pathMatch[1] : '/';
                
                methodPath = methodPath.startsWith('/') ? methodPath : '/' + methodPath;
                
                const fullPath = classMapping + methodPath;
                
                const method = this.getHttpMethod(annotation, line);

                endpoints.push({
                    path: fullPath,
                    method,
                    location: new vscode.Location(
                        vscode.Uri.file(filePath),
                        new vscode.Position(lineNumber, 0)
                    ),
                    className,
                    methodName,
                    framework: 'Spring'
                });
            }
        }

        return endpoints;
    }

    getSupportedFileExtensions(): string[] {
        return ['.java'];
    }

    private getHttpMethod(annotation: string, line: string): HttpMethod {
        let methodStr: string;
        switch (annotation) {
            case '@GetMapping':
                methodStr = 'GET';
                break;
            case '@PostMapping':
                methodStr = 'POST';
                break;
            case '@PutMapping':
                methodStr = 'PUT';
                break;
            case '@DeleteMapping':
                methodStr = 'DELETE';
                break;
            case '@PatchMapping':
                methodStr = 'PATCH';
                break;
            case '@RequestMapping':
                if (line.includes('method = RequestMethod.')) {
                    const methodMatch = line.match(/RequestMethod\.(\w+)/);
                    methodStr = methodMatch ? methodMatch[1] : 'GET';
                } else {
                    methodStr = 'GET';
                }
                break;
            default:
                methodStr = 'UNKNOWN';
        }
        return HttpMethodUtils.fromString(methodStr);
    }
}
