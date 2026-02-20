import { BaseShape } from './BaseShape.js';

export class CircleShape extends BaseShape {
    constructor(id, startX, startY, strokeWidth) {
        super(id, 'circle', startX, startY, strokeWidth);
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
        this.element.setAttribute('stroke-width', this.strokeWidth);
        this.element.setAttribute('fill', 'rgba(42, 157, 143, 0.1)');
        console.log(`[CLASS CircleShape] Circle 생성 완료 | ID: ${id}, 굵기: ${this.strokeWidth}`);
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

        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const rx = (maxX - minX) / 2;
        const ry = (maxY - minY) / 2;

        this.element.setAttribute('cx', cx);
        this.element.setAttribute('cy', cy);
        this.element.setAttribute('rx', rx);
        this.element.setAttribute('ry', ry);
    }

    // --- 객체지향 위임: CircleShape 고유의 속성 갱신 로직 ---
    updateAttributes() {
        const cx = (this.points[0].x + this.points[2].x) / 2;
        const cy = (this.points[0].y + this.points[2].y) / 2;
        this.element.setAttribute('cx', cx);
        this.element.setAttribute('cy', cy);
        console.log(`[METHOD updateAttributes] CircleShape 중심점(cx, cy) 동기화 완료`);
    }

    containsPoint(px, py) {
        const minX = Math.min(this.points[0].x, this.points[2].x);
        const maxX = Math.max(this.points[0].x, this.points[2].x);
        const minY = Math.min(this.points[0].y, this.points[2].y);
        const maxY = Math.max(this.points[0].y, this.points[2].y);

        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const rx = (maxX - minX) / 2;
        const ry = (maxY - minY) / 2;

        if (rx === 0 || ry === 0) return false;

        const normX = Math.pow(px - cx, 2) / Math.pow(rx, 2);
        const normY = Math.pow(py - cy, 2) / Math.pow(ry, 2);
        return (normX + normY) <= 1;
    }
}