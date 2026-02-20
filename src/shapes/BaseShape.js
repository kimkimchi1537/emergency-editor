import { Vector2 } from '../utils/Vector2.js';

export class BaseShape {
    constructor(id, type, startX, startY, strokeWidth = 4) {
        this.id = id;
        this.type = type;
        this.startX = startX;
        this.startY = startY;
        this.points = [];
        this.element = null;
        this.strokeWidth = strokeWidth;
        this.Vector2 = Vector2;
        console.log(`[CLASS BaseShape] ${type} 기반 클래스 초기화 | ID: ${id}`);
        console.log(`[CLASS BaseShape] 선 굵기 초기화(매개변수 기반): ${this.strokeWidth}`);
        console.log(`[CLASS BaseShape] Vector2 클래스 참조를 프로퍼티(this.Vector2)로 등록 완료`);
    }

    createPoint(x, y) {
        console.log(`[METHOD createPoint] 포인트 생성 요청 (${x}, ${y})`);
        console.log(`[METHOD createPoint] this.Vector2를 이용하여 새로운 벡터 인스턴스 생성`);
        return new this.Vector2(x, y);
    }

    update(currentX, currentY) {
        console.log(`[METHOD update] ${this.type} 업데이트 호출 | X: ${currentX}, Y: ${currentY}`);
    }
}