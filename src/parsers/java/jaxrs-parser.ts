import * as vscode from 'vscode';
import { IFrameworkParser } from '../parser.interface';
import { ApiEndpoint } from '../../models/api-endpoint.model';

export class JaxRsParser implements IFrameworkParser {
    async canParse(filePath: string, content: string): Promise<boolean> {
        // TODO: 检查是否为JAX-RS框架的API定义
        return content.includes('@Path') || 
               content.includes('javax.ws.rs') ||
               content.includes('jakarta.ws.rs');
    }

    async parseFile(filePath: string, content: string): Promise<ApiEndpoint[]> {
        // TODO: 实现JAX-RS框架的路由解析
        // 需要解析如下格式的路由：
        // @Path("/users")
        // @GET
        // @POST
        // @Produces(MediaType.APPLICATION_JSON)
        return [];
    }

    getSupportedFileExtensions(): string[] {
        return ['.java'];
    }
}
