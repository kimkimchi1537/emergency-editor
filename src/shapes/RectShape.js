import { BaseShape } from './BaseShape.js';

export class RectShape extends BaseShape {
    constructor(id, startX, startY, strokeWidth) {
        super(id, 'rect', startX, startY, strokeWidth);
        this.points = [
            this.createPoint(startX, startY),
            this.createPoint(startX, startY),
            this.createPoint(startX, startY),
            this.createPoint(startX, startY)
        ];
        this.element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.element.setAttribute('x', startX);
        this.element.setAttribute('y', startY);
        this.element.setAttribute('width', '0');
        this.element.setAttribute('height', '0');
        this.element.setAttribute('stroke', '#1d3557');
        this.element.setAttribute('stroke-width', this.strokeWidth);
        this.element.setAttribute('fill', 'rgba(29, 53, 87, 0.1)');
        console.log(`[CLASS RectShape] Rect 생성 완료 | ID: ${id}, 굵기: ${this.strokeWidth}`);
    }

    update(currentX, currentY, isShift = false) {
        let dx = currentX - this.startX;
        let dy = currentY - this.startY;

        if (isShift) {
            const size = Math.max(Math.abs(dx), Math.abs(dy));
            dx = dx < 0 ? -size : size;
            dy = dy < 0 ? -size : size;
        }

        const minX = Math.min(this.startX, this.startX + dx);
        const minY = Math.min(this.startY, this.startY + dy);
        const maxX = Math.max(this.startX, this.startX + dx);
        const maxY = Math.max(this.startY, this.startY + dy);

        this.points[0].x = minX; this.points[0].y = minY;
        this.points[1].x = maxX; this.points[1].y = minY;
        this.points[2].x = maxX; this.points[2].y = maxY;
        this.points[3].x = minX; this.points[3].y = maxY;

        this.element.setAttribute('x', minX);
        this.element.setAttribute('y', minY);
        this.element.setAttribute('width', maxX - minX);
        this.element.setAttribute('height', maxY - minY);
    }

    // --- 객체지향 위임: RectShape 고유의 속성 갱신 로직 ---
    updateAttributes() {
        const minX = Math.min(this.points[0].x, this.points[2].x);
        const minY = Math.min(this.points[0].y, this.points[2].y);
        this.element.setAttribute('x', minX);
        this.element.setAttribute('y', minY);
        console.log(`[METHOD updateAttributes] RectShape 좌상단 원점(x, y) 동기화 완료`);
    }

    containsPoint(px, py) {
        const minX = Math.min(this.points[0].x, this.points[2].x);
        const maxX = Math.max(this.points[0].x, this.points[2].x);
        const minY = Math.min(this.points[0].y, this.points[2].y);
        const maxY = Math.max(this.points[0].y, this.points[2].y);

        return px >= minX && px <= maxX && py >= minY && py <= maxY;
    }
}