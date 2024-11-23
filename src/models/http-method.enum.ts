import * as path from 'path';

export enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    PATCH = 'PATCH',
    UNKNOWN = 'UNKNOWN'
}

export interface IconPath {
    light: string;
    dark: string;
}

export class HttpMethodUtils {
    private static readonly ICON_BASE_PATH = path.join(__dirname, '..', '..', 'resources');

    static getIconPath(method: HttpMethod): IconPath {
        const iconName = `${method.toLowerCase()}.svg`;
        return {
            light: path.join(this.ICON_BASE_PATH, iconName),
            dark: path.join(this.ICON_BASE_PATH, iconName)
        };
    }

    static fromString(method: string): HttpMethod {
        const upperMethod = method.toUpperCase();
        return HttpMethod[upperMethod as keyof typeof HttpMethod] || HttpMethod.UNKNOWN;
    }
}
