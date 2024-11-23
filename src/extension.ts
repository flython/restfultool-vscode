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
class ApiTreeDataProvider implements vscode.TreeDataProvider<ApiEndpoint>, vscode.Disposable {
    private _onDidChangeTreeData: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData: vscode.Event<void> = this._onDidChangeTreeData.event;

    private endpoints: ApiEndpoint[] = [];
    private filteredEndpoints: ApiEndpoint[] = [];
    private searchText: string = '';
    private fileWatcher: vscode.FileSystemWatcher | undefined;
    private fileCache: Map<string, { mtime: number, endpoints: ApiEndpoint[] }> = new Map();

    constructor() {
        this.setupFileWatcher();
    }

    dispose() {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
        this._onDidChangeTreeData.dispose();
    }

    private setupFileWatcher() {
        // 监听 Java 文件的变化
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(
            "**/*.java",
            false, // 创建文件
            false, // 删除文件
            false  // 修改文件
        );

        // 文件创建时
        this.fileWatcher.onDidCreate(async uri => {
            await this.handleFileChange(uri);
        });

        // 文件修改时
        this.fileWatcher.onDidChange(async uri => {
            await this.handleFileChange(uri);
        });

        // 文件删除时
        this.fileWatcher.onDidDelete(uri => {
            this.handleFileDelete(uri);
        });
    }

    private async handleFileChange(uri: vscode.Uri) {
        try {
            // 检查文件是否存在
            const stat = await vscode.workspace.fs.stat(uri);
            
            // 检查缓存
            const cached = this.fileCache.get(uri.fsPath);
            if (cached && cached.mtime === stat.mtime) {
                return; // 文件未变化，使用缓存
            }

            // 解析文件
            const oldEndpoints = this.endpoints.filter(e => e.location.uri.fsPath === uri.fsPath);
            const newEndpoints = await this.parseJavaFile(uri.fsPath);

            // 更新缓存
            this.fileCache.set(uri.fsPath, {
                mtime: stat.mtime,
                endpoints: newEndpoints
            });

            // 更新端点列表
            this.endpoints = [
                ...this.endpoints.filter(e => e.location.uri.fsPath !== uri.fsPath),
                ...newEndpoints
            ];

            // 如果端点有变化，刷新视图
            if (JSON.stringify(oldEndpoints) !== JSON.stringify(newEndpoints)) {
                this.filterEndpoints();
                this._onDidChangeTreeData.fire();
            }
        } catch (error) {
            console.error(`Error handling file change for ${uri.fsPath}:`, error);
        }
    }

    private handleFileDelete(uri: vscode.Uri) {
        // 从缓存和端点列表中移除
        this.fileCache.delete(uri.fsPath);
        const hadEndpoints = this.endpoints.some(e => e.location.uri.fsPath === uri.fsPath);
        if (hadEndpoints) {
            this.endpoints = this.endpoints.filter(e => e.location.uri.fsPath !== uri.fsPath);
            this.filterEndpoints();
            this._onDidChangeTreeData.fire();
        }
    }

    // 修改 parseJavaFile 方法返回解析到的端点
    private async parseJavaFile(filePath: string): Promise<ApiEndpoint[]> {
        const endpoints: ApiEndpoint[] = [];
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
                    methodName
                });
            }
        }

        return endpoints;
    }

    // 刷新树视图
    async refresh(): Promise<void> {
        this.endpoints = [];
        this.fileCache.clear();
        await this.scanWorkspace();
        this.filterEndpoints();
        this._onDidChangeTreeData.fire();
    }

    // 获取树项目
    getTreeItem(element: ApiEndpoint): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(
            `${element.method} ${element.path}`,
            vscode.TreeItemCollapsibleState.None
        );
        
        treeItem.description = `${element.className}.${element.methodName}`;
        treeItem.tooltip = `${element.method} ${element.path}\n${element.className}.${element.methodName}`;
        treeItem.command = {
            command: 'vscode.open',
            title: 'Open API Definition',
            arguments: [
                element.location.uri,
                { selection: element.location.range }
            ]
        };

        // 根据HTTP方法设置不同的图标
        const iconMap: { [key: string]: { light: string; dark: string } } = {
            'GET': {
                light: path.join(__filename, '..', '..', 'resources', 'get.svg'),
                dark: path.join(__filename, '..', '..', 'resources', 'get.svg')
            },
            'POST': {
                light: path.join(__filename, '..', '..', 'resources', 'post.svg'),
                dark: path.join(__filename, '..', '..', 'resources', 'post.svg')
            },
            'PUT': {
                light: path.join(__filename, '..', '..', 'resources', 'put.svg'),
                dark: path.join(__filename, '..', '..', 'resources', 'put.svg')
            },
            'DELETE': {
                light: path.join(__filename, '..', '..', 'resources', 'delete.svg'),
                dark: path.join(__filename, '..', '..', 'resources', 'delete.svg')
            },
            'PATCH': {
                light: path.join(__filename, '..', '..', 'resources', 'patch.svg'),
                dark: path.join(__filename, '..', '..', 'resources', 'patch.svg')
            }
        };
        treeItem.iconPath = iconMap[element.method] || {
            light: path.join(__filename, '..', '..', 'resources', 'get.svg'),
            dark: path.join(__filename, '..', '..', 'resources', 'get.svg')
        };

        return treeItem;
    }

    // 获取子项目
    getChildren(element?: ApiEndpoint): ApiEndpoint[] {
        if (element) {
            return [];
        }
        return this.filteredEndpoints;
    }

    // 扫描工作区
    private async scanWorkspace(): Promise<void> {
        const javaFiles = await vscode.workspace.findFiles('**/*.java');
        
        for (const file of javaFiles) {
            const filePath = file.fsPath;
            try {
                // 检查文件是否存在于缓存中
                const stat = await vscode.workspace.fs.stat(file);
                const cached = this.fileCache.get(filePath);
                
                if (cached && cached.mtime === stat.mtime) {
                    // 使用缓存的端点
                    this.endpoints.push(...cached.endpoints);
                } else {
                    // 解析文件并更新缓存
                    const newEndpoints = await this.parseJavaFile(filePath);
                    this.endpoints.push(...newEndpoints);
                    this.fileCache.set(filePath, {
                        mtime: stat.mtime,
                        endpoints: newEndpoints
                    });
                }
            } catch (error) {
                console.error(`Error processing file ${filePath}:`, error);
            }
        }
    }

    // 设置搜索文本
    setSearchText(text: string) {
        this.searchText = text;
        this.filterEndpoints();
        this._onDidChangeTreeData.fire();
    }

    // 过滤端点
    private filterEndpoints() {
        if (!this.searchText) {
            this.filteredEndpoints = this.endpoints;
            return;
        }

        const searchLower = this.searchText.toLowerCase();
        this.filteredEndpoints = this.endpoints.filter(endpoint => {
            return endpoint.path.toLowerCase().includes(searchLower) ||
                   endpoint.method.toLowerCase().includes(searchLower) ||
                   endpoint.className.toLowerCase().includes(searchLower) ||
                   endpoint.methodName.toLowerCase().includes(searchLower);
        });
    }

    // 获取所有端点（用于快速搜索）
    getAllEndpoints(): ApiEndpoint[] {
        return this.endpoints;
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

        // 注册刷新命令
        const refreshCommand = vscode.commands.registerCommand('restful-tool.refreshEndpoints', () => {
            treeDataProvider.refresh();
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
            clearSearchCommand,
            refreshCommand,
            treeDataProvider // 将 treeDataProvider 添加到订阅列表中以确保正确释放资源
        );

        // 初始扫描
        treeDataProvider.refresh();
        
    } catch (error: any) {
        console.error('Extension activation error:', error);
        vscode.window.showErrorMessage(`Error activating RestfulTool: ${error.message || 'Unknown error'}`);
    }
}

export function deactivate() {}
