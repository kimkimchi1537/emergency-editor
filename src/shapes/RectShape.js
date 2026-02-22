import { BaseShape } from './BaseShape.js';

export class RectShape extends BaseShape {
    constructor(id, startX, startY, strokeWidth, strokeColor, fillColor) {
        super(id, 'rect', startX, startY, strokeWidth, strokeColor, fillColor);
        this.points = [
            this.createPoint(startX, startY),
            this.createPoint(startX, startY),
            this.createPoint(startX, startY),
            this.createPoint(startX, startY)
        ];
        this.element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.applyColors();
        this.updateAttributes();
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
        this.updateAttributes();
    }

    updateAttributes() {
        const minX = Math.min(this.points[0].x, this.points[2].x);
        const minY = Math.min(this.points[0].y, this.points[2].y);
        const width = Math.abs(this.points[0].x - this.points[2].x);
        const height = Math.abs(this.points[0].y - this.points[2].y);
        this.element.setAttribute('x', minX);
        this.element.setAttribute('y', minY);
        this.element.setAttribute('width', width);
        this.element.setAttribute('height', height);
    }

    containsPoint(px, py) {
        const minX = Math.min(this.points[0].x, this.points[2].x);
        const maxX = Math.max(this.points[0].x, this.points[2].x);
        const minY = Math.min(this.points[0].y, this.points[2].y);
        const maxY = Math.max(this.points[0].y, this.points[2].y);
        return px >= minX && px <= maxX && py >= minY && py <= maxY;
    }

    resize(handleIndex, newX, newY, isShift = false) {
        // Shift 키를 누르면 반대편 고정점을 기준으로 1:1 비율을 유지
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
        
        const cx = (this.points[0].x + this.points[2].x) / 2; 
        const cy = (this.points[0].y + this.points[2].y) / 2;
        const currentTransform = this.element.getAttribute('transform') || '';
        const match = currentTransform.match(/rotate\(([-\d.]+)/);
        if (match) this.element.setAttribute('transform', `rotate(${match[1]}, ${cx}, ${cy})`);
    }
}