import { IFrameworkParser } from './parser.interface';
import { SpringParser } from './java/spring-parser';
import { JaxRsParser } from './java/jaxrs-parser';
import { GinParser } from './go/gin-parser';
import { EchoParser } from './go/echo-parser';
import { FastAPIParser } from './python/fastapi-parser';
import { FlaskParser } from './python/flask-parser';

export class ParserFactory {
    private static parsers: IFrameworkParser[] = [
        new SpringParser(),
        new JaxRsParser(),
        new GinParser(),
        new EchoParser(),
        new FastAPIParser(),
        new FlaskParser()
    ];

    /**
     * 获取所有支持的文件扩展名
     */
    static getSupportedExtensions(): string[] {
        const extensions = new Set<string>();
        this.parsers.forEach(parser => {
            parser.getSupportedFileExtensions().forEach(ext => extensions.add(ext));
        });
        return Array.from(extensions);
    }

    /**
     * 获取适合解析指定文件的解析器
     * @param filePath 文件路径
     * @param content 文件内容
     */
    static async getParser(filePath: string, content: string): Promise<IFrameworkParser | undefined> {
        for (const parser of this.parsers) {
            if (parser.getSupportedFileExtensions().some(ext => filePath.endsWith(ext))) {
                if (await parser.canParse(filePath, content)) {
                    return parser;
                }
            }
        }
        return undefined;
    }
}
