import { LineHandler } from '../handlers/LineHandler.js';
import { RectHandler } from '../handlers/RectHandler.js';
import { CircleHandler } from '../handlers/CircleHandler.js';
import { MultiLineHandler } from '../handlers/MultiLineHandler.js';
import { GroupHandler } from '../handlers/GroupHandler.js'; // [추가] 임시 그룹 핸들러

export class HandlerFactory {
    static registry = {
        line: new LineHandler(),
        rect: new RectHandler(),
        circle: new CircleHandler(),
        multiline: new MultiLineHandler(),
        group: new GroupHandler() // 다중 선택 시 동작
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