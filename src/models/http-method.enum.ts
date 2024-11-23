import * as path from 'path';
import * as vscode from 'vscode';

export enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    PATCH = 'PATCH',
    UNKNOWN = 'UNKNOWN'
}

export interface IconPath {
    light: vscode.Uri;
    dark: vscode.Uri;
}

export class HttpMethodUtils {
    private static extensionContext: vscode.ExtensionContext;

    static initialize(context: vscode.ExtensionContext) {
        this.extensionContext = context;
    }

    static getIconPath(method: HttpMethod): IconPath {
        try {
            if (!this.extensionContext) {
                throw new Error('HttpMethodUtils not initialized');
            }

            const iconName = `${method.toLowerCase()}.svg`;
            return {
                light: vscode.Uri.joinPath(this.extensionContext.extensionUri, 'resources', iconName),
                dark: vscode.Uri.joinPath(this.extensionContext.extensionUri, 'resources', iconName)
            };
        } catch (error) {
            console.error('Error getting icon path:', error);
            return {
                light: vscode.Uri.parse(''),
                dark: vscode.Uri.parse('')
            };
        }
    }

    static fromString(method: string): HttpMethod {
        const upperMethod = method.toUpperCase();
        return HttpMethod[upperMethod as keyof typeof HttpMethod] || HttpMethod.UNKNOWN;
    }
}
