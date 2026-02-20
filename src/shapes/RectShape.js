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

    resize(handleIndex, newX, newY, isShift = false) {
        if (handleIndex === 0) {
            this.points[0].x = newX; this.points[0].y = newY;
            this.points[1].y = newY; this.points[3].x = newX;
            console.log(`[METHOD resize] RectShape 롤백 완료: 좌상단 꼭짓점 핸들(0) 조작 | x=${newX.toFixed(1)}, y=${newY.toFixed(1)}`);
        } else if (handleIndex === 1) {
            this.points[1].x = newX; this.points[1].y = newY;
            this.points[0].y = newY; this.points[2].x = newX;
            console.log(`[METHOD resize] RectShape 롤백 완료: 우상단 꼭짓점 핸들(1) 조작 | x=${newX.toFixed(1)}, y=${newY.toFixed(1)}`);
        } else if (handleIndex === 2) {
            this.points[2].x = newX; this.points[2].y = newY;
            this.points[1].x = newX; this.points[3].y = newY;
            console.log(`[METHOD resize] RectShape 롤백 완료: 우하단 꼭짓점 핸들(2) 조작 | x=${newX.toFixed(1)}, y=${newY.toFixed(1)}`);
        } else if (handleIndex === 3) {
            this.points[3].x = newX; this.points[3].y = newY;
            this.points[0].x = newX; this.points[2].y = newY;
            console.log(`[METHOD resize] RectShape 롤백 완료: 좌하단 꼭짓점 핸들(3) 조작 | x=${newX.toFixed(1)}, y=${newY.toFixed(1)}`);
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
        const minX = Math.min(this.points[0].x, this.points[2].x);
        const maxX = Math.max(this.points[0].x, this.points[2].x);
        const minY = Math.min(this.points[0].y, this.points[2].y);
        const maxY = Math.max(this.points[0].y, this.points[2].y);
        
        this.element.setAttribute('x', minX);
        this.element.setAttribute('y', minY);
        this.element.setAttribute('width', maxX - minX);
        this.element.setAttribute('height', maxY - minY);
        console.log(`[METHOD updateAttributes] RectShape 물리적 렌더링 동기화 완료`);
    }

    containsPoint(px, py) {
        const minX = Math.min(this.points[0].x, this.points[2].x);
        const maxX = Math.max(this.points[0].x, this.points[2].x);
        const minY = Math.min(this.points[0].y, this.points[2].y);
        const maxY = Math.max(this.points[0].y, this.points[2].y);

        return px >= minX && px <= maxX && py >= minY && py <= maxY;
    }
}