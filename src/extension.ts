// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// 定义API端点的接口
interface ApiEndpoint {
    path: string;          // API路径
    method: string;        // HTTP方法
    location: vscode.Location;  // 在文件中的位置
    className: string;     // 所属类名
    methodName: string;    // 方法名
}

// API树数据提供者类
class ApiTreeDataProvider implements vscode.TreeDataProvider<ApiEndpoint> {
    // 用于通知树视图数据变化的事件发射器
    private _onDidChangeTreeData: vscode.EventEmitter<ApiEndpoint | undefined | null | void> = new vscode.EventEmitter<ApiEndpoint | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ApiEndpoint | undefined | null | void> = this._onDidChangeTreeData.event;

    private endpoints: ApiEndpoint[] = [];  // 存储所有API端点
    private filteredEndpoints: ApiEndpoint[] = [];  // 存储过滤后的API端点
    private searchText: string = '';  // 搜索文本

    // 刷新树视图
    refresh(): void {
        this.endpoints = [];  // 清空端点列表
        this.scanWorkspace();  // 重新扫描工作区
        this.filterEndpoints();  // 应用过滤
        this._onDidChangeTreeData.fire();  // 触发树视图更新
    }

    // 设置搜索文本并更新树视图
    setSearchText(text: string): void {
        this.searchText = text.toLowerCase();
        this.filterEndpoints();
        this._onDidChangeTreeData.fire();
    }

    // 根据搜索文本过滤端点
    private filterEndpoints(): void {
        if (!this.searchText) {
            this.filteredEndpoints = [...this.endpoints];
            return;
        }
        this.filteredEndpoints = this.endpoints.filter(endpoint => 
            endpoint.path.toLowerCase().includes(this.searchText) ||
            endpoint.method.toLowerCase().includes(this.searchText) ||
            endpoint.className.toLowerCase().includes(this.searchText)
        );
    }

    // 获取树项目
    getTreeItem(element: ApiEndpoint): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(
            `${element.method} ${element.path}`,
            vscode.TreeItemCollapsibleState.None
        );
        treeItem.description = `${element.className}.${element.methodName}`;
        treeItem.command = {
            command: 'vscode.open',
            title: 'Open API Definition',
            arguments: [element.location.uri, { selection: element.location.range }]
        };
        return treeItem;
    }

    // 获取子项目（这里返回过滤后的端点列表）
    getChildren(): ApiEndpoint[] {
        return this.filteredEndpoints;
    }

    // 扫描工作区
    private async scanWorkspace(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return;
        }

        for (const folder of workspaceFolders) {
            await this.scanDirectory(folder.uri.fsPath);
        }
    }

    // 递归扫描目录
    private async scanDirectory(dirPath: string): Promise<void> {
        const files = await fs.promises.readdir(dirPath);
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stat = await fs.promises.stat(filePath);

            if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                await this.scanDirectory(filePath);
            } else if (file.endsWith('.java')) {
                await this.parseJavaFile(filePath);
            }
        }
    }

    // 解析Java文件
    private async parseJavaFile(filePath: string): Promise<void> {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        let className = '';
        let classMapping = '';
        let isController = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // 检查是否为Controller类
            if (line.includes('@Controller') || line.includes('@RestController')) {
                isController = true;
            }

            // 获取类名和映射
            if (line.includes('class ')) {
                className = line.split('class ')[1].split(' ')[0];
            }

            if (line.includes('@RequestMapping')) {
                const match = line.match(/"([^"]+)"/);
                if (match) {
                    classMapping = match[1];
                }
            }

            if (isController) {
                // 检查端点映射
                const mappingAnnotations = [
                    '@GetMapping',
                    '@PostMapping',
                    '@PutMapping',
                    '@DeleteMapping',
                    '@PatchMapping',
                    '@RequestMapping'
                ];

                for (const annotation of mappingAnnotations) {
                    if (line.includes(annotation)) {
                        const methodMatch = lines.slice(i + 1).find(l => l.includes('public') || l.includes('private') || l.includes('protected'));
                        if (methodMatch) {
                            const methodName = methodMatch.match(/\s(\w+)\s*\(/)?.[1] || '';
                            const pathMatch = line.match(/"([^"]+)"/);
                            const path = pathMatch ? pathMatch[1] : '/';
                            const fullPath = path.startsWith('/') ? path : '/' + path;
                            const method = this.getHttpMethod(annotation, line);

                            // 添加新的API端点
                            this.endpoints.push({
                                path: classMapping + fullPath,
                                method,
                                location: new vscode.Location(
                                    vscode.Uri.file(filePath),
                                    new vscode.Position(i, 0)
                                ),
                                className,
                                methodName
                            });
                        }
                    }
                }
            }
        }
    }

    // 根据注解获取HTTP方法
    private getHttpMethod(annotation: string, line: string): string {
        switch (annotation) {
            case '@GetMapping':
                return 'GET';
            case '@PostMapping':
                return 'POST';
            case '@PutMapping':
                return 'PUT';
            case '@DeleteMapping':
                return 'DELETE';
            case '@PatchMapping':
                return 'PATCH';
            case '@RequestMapping':
                if (line.includes('method = RequestMethod.')) {
                    const methodMatch = line.match(/RequestMethod\.(\w+)/);
                    return methodMatch ? methodMatch[1] : 'GET';
                }
                return 'GET';
            default:
                return 'GET';
        }
    }
}

// 激活扩展
export function activate(context: vscode.ExtensionContext) {
    try {
        // 创建API树数据提供者
        const apiTreeDataProvider = new ApiTreeDataProvider();
        
        // 创建树视图
        const treeView = vscode.window.createTreeView('restfulExplorer', {
            treeDataProvider: apiTreeDataProvider
        });

        // 注册刷新命令
        context.subscriptions.push(
            vscode.commands.registerCommand('restfultool.refreshEndpoints', () => {
                apiTreeDataProvider.refresh();
            })
        );

        // 注册搜索命令
        context.subscriptions.push(
            vscode.commands.registerCommand('restfultool.searchEndpoints', async () => {
                const searchText = await vscode.window.showInputBox({
                    placeHolder: 'Search API endpoints...',
                    prompt: 'Enter text to filter API endpoints'
                });
                
                if (searchText !== undefined) {
                    apiTreeDataProvider.setSearchText(searchText);
                }
            })
        );

        // 初始扫描
        apiTreeDataProvider.refresh();
        
    } catch (error: any) {
        // 处理错误，但不抛出 instrumentation key 错误
        console.error('Extension activation error:', error);
        // 显示错误消息给用户
        vscode.window.showErrorMessage(`Error activating RestfulTool: ${error.message || 'Unknown error'}`);
    }
}

export function deactivate() {}
