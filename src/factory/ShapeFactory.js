import { LineShape } from '../shapes/LineShape.js';
import { RectShape } from '../shapes/RectShape.js';
import { CircleShape } from '../shapes/CircleShape.js';
import { ArrowShape } from '../shapes/ArrowShape.js';

export class ShapeFactory {
    static registry = {
        line: LineShape,
        rect: RectShape,
        circle: CircleShape,
        arrow: ArrowShape
    };

    static createShape(type, id, startX, startY) {
        console.log(`[FACTORY] 도형 생성 요청 | Type: ${type}, ID: ${id}`);
        const ShapeClass = this.registry[type];
        
        if (!ShapeClass) {
            console.error(`[FACTORY-ERROR] 지원하지 않는 도형 타입: ${type}`);
            return null;
        }

        const instance = new ShapeClass(id, startX, startY);
        console.log("[FACTORY] 인스턴스 반환 완료");
        return instance;
    }
}