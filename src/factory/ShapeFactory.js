import { LineShape } from '../shapes/LineShape.js';
import { RectShape } from '../shapes/RectShape.js';
import { CircleShape } from '../shapes/CircleShape.js';
import { MultiLineShape } from '../shapes/MultiLineShape.js';
import { GroupShape } from '../shapes/GroupShape.js';
import { ImageShape } from '../shapes/ImageShape.js'; // [추가]

export class ShapeFactory {
    static registry = {
        line: LineShape,
        rect: RectShape,
        circle: CircleShape,
        multiline: MultiLineShape,
        group: GroupShape,
        image: ImageShape // [추가]
    };

    static createShape(type, id, startX, startY, strokeWidth, strokeColor, fillColor, extraData = {}) {
        console.log(`[FACTORY] 도형 생성 요청 | Type: ${type}, ID: ${id}`);
        const ShapeClass = this.registry[type];
        
        if (!ShapeClass) {
            console.error(`[FACTORY-ERROR] 지원하지 않는 도형 타입: ${type}`);
            return null;
        }

        const instance = new ShapeClass(id, startX, startY, strokeWidth, strokeColor, fillColor, extraData);
        
        // 투명도 정보가 추가 데이터에 있다면 생성 즉시 적용
        if (extraData && extraData.opacity !== undefined) {
            instance.setOpacity(extraData.opacity);
        }

        return instance;
    }

    static createGroup(id, children) {
        return new GroupShape(id, children);
    }
}