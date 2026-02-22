import { LineHandler } from '../handlers/LineHandler.js';
import { RectHandler } from '../handlers/RectHandler.js';
import { CircleHandler } from '../handlers/CircleHandler.js';
import { MultiLineHandler } from '../handlers/MultiLineHandler.js';
import { GroupHandler } from '../handlers/GroupHandler.js';
import { ImageHandler } from '../handlers/ImageHandler.js'; // [추가] 이미지 전용 핸들러 임포트

export class HandlerFactory {
    static registry = {
        line: new LineHandler(),
        rect: new RectHandler(),
        circle: new CircleHandler(),
        multiline: new MultiLineHandler(),
        group: new GroupHandler(),
        image: new ImageHandler() // [수정] RectHandler에서 ImageHandler로 교체 완료
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