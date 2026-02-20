import { BaseShape } from './BaseShape.js';

export class CircleShape extends BaseShape {
    constructor(id, startX, startY) {
        super(id, 'circle', startX, startY);
        this.points = [
            this.createPoint(startX, startY),
            this.createPoint(startX, startY),
            this.createPoint(startX, startY),
            this.createPoint(startX, startY)
        ];
        this.element = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        this.element.setAttribute('cx', startX);
        this.element.setAttribute('cy', startY);
        this.element.setAttribute('rx', '0');
        this.element.setAttribute('ry', '0');
        this.element.setAttribute('stroke', '#2a9d8f');
        this.element.setAttribute('stroke-width', '4');
        this.element.setAttribute('fill', 'rgba(42, 157, 143, 0.1)');
        console.log(`[CLASS CircleShape] Circle 생성 완료 | ID: ${id}`);
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

        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const rx = (maxX - minX) / 2;
        const ry = (maxY - minY) / 2;

        this.element.setAttribute('cx', cx);
        this.element.setAttribute('cy', cy);
        this.element.setAttribute('rx', rx);
        this.element.setAttribute('ry', ry);
        console.log(`[METHOD update] Circle 타원 갱신 | CX: ${cx}, CY: ${cy}, RX: ${rx}, RY: ${ry}`);
    }
}