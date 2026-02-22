import { BaseShape } from './BaseShape.js';

export class CircleShape extends BaseShape {
    constructor(id, startX, startY, strokeWidth, strokeColor, fillColor) {
        super(id, 'circle', startX, startY, strokeWidth, strokeColor, fillColor);
        this.points = [
            this.createPoint(startX, startY),
            this.createPoint(startX, startY),
            this.createPoint(startX, startY),
            this.createPoint(startX, startY)
        ];
        this.element = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        this.applyColors();
        this.updateAttributes();
    }

    update(currentX, currentY, isShift = false) {
        let dx = currentX - this.startX;
        let dy = currentY - this.startY;
        if (isShift) {
            const size = Math.max(Math.abs(dx), Math.abs(dy));
            dx = dx < 0 ? -size : size; dy = dy < 0 ? -size : size;
        }
        const minX = Math.min(this.startX, this.startX + dx);
        const minY = Math.min(this.startY, this.startY + dy);
        const maxX = Math.max(this.startX, this.startX + dx);
        const maxY = Math.max(this.startY, this.startY + dy);
        this.points[0].x = minX; this.points[0].y = minY;
        this.points[1].x = maxX; this.points[1].y = minY;
        this.points[2].x = maxX; this.points[2].y = maxY;
        this.points[3].x = minX; this.points[3].y = maxY;
        this.updateAttributes();
    }

    updateAttributes() {
        const minX = Math.min(this.points[0].x, this.points[2].x);
        const maxX = Math.max(this.points[0].x, this.points[2].x);
        const minY = Math.min(this.points[0].y, this.points[2].y);
        const maxY = Math.max(this.points[0].y, this.points[2].y);
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        this.element.setAttribute('cx', cx);
        this.element.setAttribute('cy', cy);
        this.element.setAttribute('rx', (maxX - minX) / 2);
        this.element.setAttribute('ry', (maxY - minY) / 2);
    }

    containsPoint(px, py) {
        const minX = Math.min(this.points[0].x, this.points[2].x);
        const maxX = Math.max(this.points[0].x, this.points[2].x);
        const minY = Math.min(this.points[0].y, this.points[2].y);
        const maxY = Math.max(this.points[0].y, this.points[2].y);
        const cx = (minX + maxX) / 2; const cy = (minY + maxY) / 2;
        const rx = (maxX - minX) / 2; const ry = (maxY - minY) / 2;
        if (rx === 0 || ry === 0) return false;
        return (Math.pow(px - cx, 2) / Math.pow(rx, 2) + Math.pow(py - cy, 2) / Math.pow(ry, 2)) <= 1;
    }

    resize(handleIndex, newX, newY, isShift = false) {
        // Shift 키를 누르면 반대편 고정점을 기준으로 1:1 비율을 유지 (정원)
        if (isShift) {
            let oppX, oppY;
            if (handleIndex === 0) { oppX = this.points[2].x; oppY = this.points[2].y; }
            else if (handleIndex === 1) { oppX = this.points[3].x; oppY = this.points[3].y; }
            else if (handleIndex === 2) { oppX = this.points[0].x; oppY = this.points[0].y; }
            else if (handleIndex === 3) { oppX = this.points[1].x; oppY = this.points[1].y; }

            const dx = Math.abs(newX - oppX);
            const dy = Math.abs(newY - oppY);
            const size = Math.max(dx, dy);

            newX = oppX + (newX > oppX ? size : -size);
            newY = oppY + (newY > oppY ? size : -size);
        }

        if (handleIndex === 0) { this.points[0].x = newX; this.points[0].y = newY; this.points[1].y = newY; this.points[3].x = newX; }
        else if (handleIndex === 1) { this.points[1].x = newX; this.points[1].y = newY; this.points[0].y = newY; this.points[2].x = newX; }
        else if (handleIndex === 2) { this.points[2].x = newX; this.points[2].y = newY; this.points[1].x = newX; this.points[3].y = newY; }
        else if (handleIndex === 3) { this.points[3].x = newX; this.points[3].y = newY; this.points[0].x = newX; this.points[2].y = newY; }
        
        this.updateAttributes();
        
        const cx = (this.points[0].x + this.points[2].x) / 2; const cy = (this.points[0].y + this.points[2].y) / 2;
        const currentTransform = this.element.getAttribute('transform') || '';
        const match = currentTransform.match(/rotate\(([-\d.]+)/);
        if (match) this.element.setAttribute('transform', `rotate(${match[1]}, ${cx}, ${cy})`);
    }
}