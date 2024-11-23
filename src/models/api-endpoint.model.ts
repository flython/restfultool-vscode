import * as vscode from 'vscode';
import { HttpMethod } from './http-method.enum';

export interface ApiEndpoint {
    path: string;
    method: HttpMethod;
    location: vscode.Location;
    className: string;
    methodName: string;
    framework?: string; // 新增：标识使用的框架
}
