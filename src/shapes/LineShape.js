import { BaseShape } from './BaseShape.js';

export class LineShape extends BaseShape {
    constructor(id, startX, startY) {
        super(id, 'line', startX, startY);
        this.points = [this.createPoint(startX, startY), this.createPoint(startX, startY)];
        this.element = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        this.element.setAttribute('x1', startX);
        this.element.setAttribute('y1', startY);
        this.element.setAttribute('x2', startX);
        this.element.setAttribute('y2', startY);
        this.element.setAttribute('stroke', '#e63946');
        this.element.setAttribute('stroke-width', '4');
        this.element.setAttribute('stroke-linecap', 'round');
        console.log(`[CLASS LineShape] Line 생성 완료 | ID: ${id}`);
    }

    update(currentX, currentY) {
        this.points[1].x = currentX;
        this.points[1].y = currentY;
        this.element.setAttribute('x2', currentX);
        this.element.setAttribute('y2', currentY);
        console.log(`[METHOD update] Line 끝점 갱신 | (${currentX}, ${currentY})`);
    }
}