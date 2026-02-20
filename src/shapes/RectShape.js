import { BaseShape } from './BaseShape.js';

export class RectShape extends BaseShape {
    constructor(id, startX, startY) {
        super(id, 'rect', startX, startY);
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
        this.element.setAttribute('stroke-width', '4');
        this.element.setAttribute('fill', 'rgba(29, 53, 87, 0.1)');
        console.log(`[CLASS RectShape] Rect 생성 완료 | ID: ${id}`);
    }

    update(currentX, currentY) {
        const minX = Math.min(this.startX, currentX);
        const minY = Math.min(this.startY, currentY);
        const maxX = Math.max(this.startX, currentX);
        const maxY = Math.max(this.startY, currentY);

        this.points[0].x = minX; this.points[0].y = minY;
        this.points[1].x = maxX; this.points[1].y = minY;
        this.points[2].x = maxX; this.points[2].y = maxY;
        this.points[3].x = minX; this.points[3].y = maxY;

        this.element.setAttribute('x', minX);
        this.element.setAttribute('y', minY);
        this.element.setAttribute('width', maxX - minX);
        this.element.setAttribute('height', maxY - minY);
        console.log(`[METHOD update] Rect 바운딩 박스 갱신 | W: ${maxX-minX}, H: ${maxY-minY}`);
    }
}