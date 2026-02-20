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

    resize(handleIndex, newX, newY, isShift = false) {
        if (handleIndex === 0) {
            this.points[0].y = newY;
            this.points[1].y = newY;
            console.log(`[METHOD resize] CircleShape 상단 핸들(0) 조작 | y=${newY.toFixed(1)}`);
        } else if (handleIndex === 1) {
            this.points[1].x = newX;
            this.points[2].x = newX;
            console.log(`[METHOD resize] CircleShape 우측 핸들(1) 조작 | x=${newX.toFixed(1)}`);
        } else if (handleIndex === 2) {
            this.points[2].y = newY;
            this.points[3].y = newY;
            console.log(`[METHOD resize] CircleShape 하단 핸들(2) 조작 | y=${newY.toFixed(1)}`);
        } else if (handleIndex === 3) {
            this.points[0].x = newX;
            this.points[3].x = newX;
            console.log(`[METHOD resize] CircleShape 좌측 핸들(3) 조작 | x=${newX.toFixed(1)}`);
        }
        
        this.updateAttributes();
        
        const cx = (this.points[0].x + this.points[2].x) / 2;
        const cy = (this.points[0].y + this.points[2].y) / 2;
        const currentTransform = this.element.getAttribute('transform') || '';
        const match = currentTransform.match(/rotate\(([-\d.]+)/);
        if (match) {
            const angle = match[1];
            this.element.setAttribute('transform', `rotate(${angle}, ${cx}, ${cy})`);
        }
    }

    updateAttributes() {
        const cx = (this.points[0].x + this.points[2].x) / 2;
        const cy = (this.points[0].y + this.points[2].y) / 2;
        const rx = Math.abs(this.points[2].x - this.points[0].x) / 2;
        const ry = Math.abs(this.points[2].y - this.points[0].y) / 2;
        
        this.element.setAttribute('cx', cx);
        this.element.setAttribute('cy', cy);
        this.element.setAttribute('rx', rx);
        this.element.setAttribute('ry', ry);
        console.log(`[METHOD updateAttributes] CircleShape 물리적 렌더링 동기화 완료`);
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