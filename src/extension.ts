// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ApiEndpoint } from './models/api-endpoint.model';
import { ParserFactory } from './parsers/parser-factory';
import { HttpMethodUtils } from './models/http-method.enum';

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
        // 获取所有支持的文件扩展名
        const extensions = ParserFactory.getSupportedExtensions();
        const pattern = `**/*{${extensions.join(',')}}`;

        // 监听支持的文件的变化
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(
            pattern,
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
            const stat = await vscode.workspace.fs.stat(uri);
            const cached = this.fileCache.get(uri.fsPath);
            
            if (cached && cached.mtime === stat.mtime) {
                return; // 文件未变化，使用缓存
            }

            const content = await fs.promises.readFile(uri.fsPath, 'utf-8');
            const parser = await ParserFactory.getParser(uri.fsPath, content);
            
            if (parser) {
                const newEndpoints = await parser.parseFile(uri.fsPath, content);
                
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

                this.filterEndpoints();
                this._onDidChangeTreeData.fire();
            }
        } catch (error) {
            console.error(`Error handling file change for ${uri.fsPath}:`, error);
        }
    }

    private handleFileDelete(uri: vscode.Uri) {
        this.fileCache.delete(uri.fsPath);
        const hadEndpoints = this.endpoints.some(e => e.location.uri.fsPath === uri.fsPath);
        if (hadEndpoints) {
            this.endpoints = this.endpoints.filter(e => e.location.uri.fsPath !== uri.fsPath);
            this.filterEndpoints();
            this._onDidChangeTreeData.fire();
        }
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
        
        treeItem.description = `${element.className}.${element.methodName}${element.framework ? ` (${element.framework})` : ''}`;
        treeItem.tooltip = `${element.method} ${element.path}\n${element.className}.${element.methodName}`;
        if (element.framework) {
            treeItem.tooltip += `\nFramework: ${element.framework}`;
        }
        
        treeItem.command = {
            command: 'vscode.open',
            title: 'Open API Definition',
            arguments: [
                element.location.uri,
                { selection: element.location.range }
            ]
        };

        // 添加调试信息
        const iconPath = HttpMethodUtils.getIconPath(element.method);
        console.log('Icon path:', {
            method: element.method,
            light: iconPath.light.toString(),
            dark: iconPath.dark.toString()
        });
        treeItem.iconPath = iconPath;

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
        const extensions = ParserFactory.getSupportedExtensions();
        const pattern = `**/*{${extensions.join(',')}}`;
        const files = await vscode.workspace.findFiles(pattern);
        
        for (const file of files) {
            const filePath = file.fsPath;
            try {
                const stat = await vscode.workspace.fs.stat(file);
                const cached = this.fileCache.get(filePath);
                
                if (cached && cached.mtime === stat.mtime) {
                    // 使用缓存的端点
                    this.endpoints.push(...cached.endpoints);
                } else {
                    // 解析文件并更新缓存
                    const content = await fs.promises.readFile(filePath, 'utf-8');
                    const parser = await ParserFactory.getParser(filePath, content);
                    
                    if (parser) {
                        const newEndpoints = await parser.parseFile(filePath, content);
                        this.endpoints.push(...newEndpoints);
                        this.fileCache.set(filePath, {
                            mtime: stat.mtime,
                            endpoints: newEndpoints
                        });
                    }
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
                   endpoint.methodName.toLowerCase().includes(searchLower) ||
                   (endpoint.framework && endpoint.framework.toLowerCase().includes(searchLower));
        });
    }

    // 获取所有端点（用于快速搜索）
    getAllEndpoints(): ApiEndpoint[] {
        return this.endpoints;
    }
}

// 激活扩展
export function activate(context: vscode.ExtensionContext) {
    // 初始化HttpMethodUtils
    HttpMethodUtils.initialize(context);

    // 创建API树数据提供者
    const apiTreeDataProvider = new ApiTreeDataProvider();
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('restful-tool', apiTreeDataProvider)
    );

    // 创建树视图
    const treeView = vscode.window.createTreeView('restful-tool-view', {
        treeDataProvider: apiTreeDataProvider,
        showCollapseAll: true
    });

    // 注册刷新命令
    const refreshCommand = vscode.commands.registerCommand('restful-tool.refreshEndpoints', () => {
        apiTreeDataProvider.refresh();
    });

    // 注册搜索命令
    const searchCommand = vscode.commands.registerCommand('restful-tool.showSearch', async () => {
        const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem & { endpoint: ApiEndpoint }>();
        quickPick.placeholder = '搜索API端点...';
        quickPick.matchOnDescription = true;

        // 实时搜索处理
        quickPick.onDidChangeValue(value => {
            const searchText = value.toLowerCase();
            const endpoints = apiTreeDataProvider.getAllEndpoints();
            quickPick.items = endpoints
                .filter(endpoint =>
                    endpoint.path.toLowerCase().includes(searchText) ||
                    endpoint.method.toLowerCase().includes(searchText) ||
                    endpoint.className.toLowerCase().includes(searchText) ||
                    (endpoint.framework && endpoint.framework.toLowerCase().includes(searchText))
                )
                .map(endpoint => ({
                    label: `${endpoint.method} ${endpoint.path}`,
                    description: `${endpoint.className}.${endpoint.methodName}${endpoint.framework ? ` (${endpoint.framework})` : ''}`,
                    endpoint,
                    iconPath: HttpMethodUtils.getIconPath(endpoint.method)
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
                apiTreeDataProvider.setSearchText(quickPick.value);
                quickPick.hide();
            }
        });

        quickPick.show();
    });

    // 注册清除搜索命令
    const clearSearchCommand = vscode.commands.registerCommand('restful-tool.clearSearch', () => {
        apiTreeDataProvider.setSearchText('');
    });

    context.subscriptions.push(
        treeView,
        searchCommand,
        clearSearchCommand,
        refreshCommand,
        apiTreeDataProvider
    );

    // 初始扫描
    apiTreeDataProvider.refresh();
    
}

// this method is called when your extension is deactivated
export function deactivate() {}
