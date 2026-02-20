import { LineShape } from '../shapes/LineShape.js';
import { RectShape } from '../shapes/RectShape.js';
import { CircleShape } from '../shapes/CircleShape.js';
import { MultiLineShape } from '../shapes/MultiLineShape.js';

export class ShapeFactory {
    static registry = {
        line: LineShape,
        rect: RectShape,
        circle: CircleShape,
        multiline: MultiLineShape
    };

    static createShape(type, id, startX, startY, strokeWidth) {
        console.log(`[FACTORY] 도형 생성 요청 | Type: ${type}, ID: ${id}, Width: ${strokeWidth}`);
        const ShapeClass = this.registry[type];
        
        if (!ShapeClass) {
            console.error(`[FACTORY-ERROR] 지원하지 않는 도형 타입: ${type}`);
            return null;
        }

        console.log(`[FACTORY] ${ShapeClass.name} 생성자 호출 직전`);
        const instance = new ShapeClass(id, startX, startY, strokeWidth);
        console.log("[FACTORY] 인스턴스 반환 완료");
        return instance;
    }
}