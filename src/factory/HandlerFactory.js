import { LineHandler } from '../handlers/LineHandler.js';
import { RectHandler } from '../handlers/RectHandler.js';
import { CircleHandler } from '../handlers/CircleHandler.js';
import { MultiLineHandler } from '../handlers/MultiLineHandler.js';
import { GroupHandler } from '../handlers/GroupHandler.js';
import { ImageHandler } from '../handlers/ImageHandler.js';
import { TextHandler } from '../handlers/TextHandler.js'; // [추가]

export class HandlerFactory {
    static registry = {
        line: new LineHandler(),
        rect: new RectHandler(),
        circle: new CircleHandler(),
        multiline: new MultiLineHandler(),
        group: new GroupHandler(),
        image: new ImageHandler(),
        text: new TextHandler() // [추가]
    };

    static getHandler(type) {
        const handler = this.registry[type];
        if (!handler) {
            console.warn(`[FACTORY-ERROR] 등록되지 않은 핸들러 타입: ${type}`);
            return null;
        }
        return handler;
    }
}