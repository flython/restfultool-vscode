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
    private _onDidChangeTreeData: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData: vscode.Event<void> = this._onDidChangeTreeData.event;

    private endpoints: ApiEndpoint[] = [];
    private filteredEndpoints: ApiEndpoint[] = [];
    private searchText: string = '';

    // 刷新树视图
    async refresh(): Promise<void> {
        this.endpoints = [];  // 清空端点列表
        await this.scanWorkspace();  // 重新扫描工作区
        this.filterEndpoints();  // 应用过滤
        this._onDidChangeTreeData.fire();  // 触发树视图更新
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

    // 设置搜索文本并更新树视图
    setSearchText(text: string): void {
        this.searchText = text.toLowerCase();
        this.filterEndpoints();
        this._onDidChangeTreeData.fire();
        // 更新搜索状态
        vscode.commands.executeCommand('setContext', 'restful-tool.hasSearchText', !!this.searchText);
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

    // 获取所有端点（用于快速搜索）
    getAllEndpoints(): ApiEndpoint[] {
        return this.endpoints;
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
                return; // 如果找到类名但不是Controller，直接返回
            }
        }

        if (!isController) {
            return; // 如果不是控制器类，直接返回
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
                        methodPath = methodPath.startsWith('/') ? methodPath : '/' + methodPath;
                        
                        // 组合完整路径
                methodPath = methodPath.startsWith('/') ? methodPath : '/' + methodPath;        
                        
                const fullPath = classMapping + methodPath;
                        
                const method = this.getHttpMethod(annotation, line);

                this.endpoints.push({
                    path: fullPath,
                    method,
                    location: new vscode.Location(
                        vscode.Uri.file(filePath),
                        new vscode.Position(lineNumber, 0)
                    ),
                    className,
                    methodName
                });
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
                return '？';
        }
    }
}

// 激活扩展
export function activate(context: vscode.ExtensionContext) {
    try {
        // 创建API树数据提供者
        const treeDataProvider = new ApiTreeDataProvider();
        
        // 创建树视图
        const treeView = vscode.window.createTreeView('restful-tool-view', {
            treeDataProvider: treeDataProvider,
            showCollapseAll: true
        });

        // 注册搜索命令
        const searchCommand = vscode.commands.registerCommand('restful-tool.showSearch', async () => {
            const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem & { endpoint: ApiEndpoint }>();
            quickPick.placeholder = '搜索API端点...';
            quickPick.matchOnDescription = true;

            // 实时搜索处理
            quickPick.onDidChangeValue(value => {
                const searchText = value.toLowerCase();
                const endpoints = treeDataProvider.getAllEndpoints();
                quickPick.items = endpoints
                    .filter(endpoint =>
                        endpoint.path.toLowerCase().includes(searchText) ||
                        endpoint.method.toLowerCase().includes(searchText) ||
                        endpoint.className.toLowerCase().includes(searchText)
                    )
                    .map(endpoint => ({
                        label: `${endpoint.method} ${endpoint.path}`,
                        description: `${endpoint.className}.${endpoint.methodName}`,
                        endpoint
                    }));
            });

            // 处理选择事件
            quickPick.onDidAccept(() => {
                const selected = quickPick.selectedItems[0];
                if (selected) {
                    // 如果选中了某一项，跳转到对应位置
                    const endpoint = selected.endpoint;
                    vscode.window.showTextDocument(endpoint.location.uri, {
                        selection: endpoint.location.range
                    });
                    quickPick.hide();
                } else {
                    // 如果没有选中项但有搜索文本，应用搜索到树视图
                    treeDataProvider.setSearchText(quickPick.value);
                    quickPick.hide();
                }
            });

            quickPick.show();
        });

        // 注册清除搜索命令
        const clearSearchCommand = vscode.commands.registerCommand('restful-tool.clearSearch', () => {
            treeDataProvider.setSearchText('');
        });

        context.subscriptions.push(
            treeView,
            searchCommand,
            clearSearchCommand
        );

        // 初始扫描
        treeDataProvider.refresh();
        
    } catch (error: any) {
        console.error('Extension activation error:', error);
        vscode.window.showErrorMessage(`Error activating RestfulTool: ${error.message || 'Unknown error'}`);
    }
}

export function deactivate() {}
