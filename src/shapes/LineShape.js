import { BaseShape } from './BaseShape.js';

export class LineShape extends BaseShape {
    constructor(id, startX, startY, strokeWidth) {
        super(id, 'line', startX, startY, strokeWidth);
        this.points = [this.createPoint(startX, startY), this.createPoint(startX, startY)];
        this.element = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        this.element.setAttribute('x1', startX);
        this.element.setAttribute('y1', startY);
        this.element.setAttribute('x2', startX);
        this.element.setAttribute('y2', startY);
        this.element.setAttribute('stroke', '#e63946');
        this.element.setAttribute('stroke-width', this.strokeWidth);
        this.element.setAttribute('stroke-linecap', 'round');
        console.log(`[CLASS LineShape] Line 생성 완료 | ID: ${id}, 굵기: ${this.strokeWidth}`);
    }

    update(currentX, currentY, isShift = false) {
        let finalX = currentX;
        let finalY = currentY;

        if (isShift) {
            const dx = currentX - this.startX;
            const dy = currentY - this.startY;
            const angle = Math.atan2(dy, dx);
            const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            finalX = this.startX + dist * Math.cos(snapAngle);
            finalY = this.startY + dist * Math.sin(snapAngle);
            console.log(`[METHOD update] Line Shift 스냅 | 원본각도: ${(angle * 180 / Math.PI).toFixed(1)}, 스냅각도: ${(snapAngle * 180 / Math.PI).toFixed(1)}`);
        }

        this.points[1].x = finalX;
        this.points[1].y = finalY;
        this.element.setAttribute('x2', finalX);
        this.element.setAttribute('y2', finalY);
    }

    // --- 객체지향 위임: LineShape 고유의 속성 갱신 로직 ---
    updateAttributes() {
        this.element.setAttribute('x1', this.points[0].x);
        this.element.setAttribute('y1', this.points[0].y);
        this.element.setAttribute('x2', this.points[1].x);
        this.element.setAttribute('y2', this.points[1].y);
        console.log(`[METHOD updateAttributes] LineShape 고유 좌표 동기화 완료`);
    }

    containsPoint(px, py) {
        const x1 = this.points[0].x;
        const y1 = this.points[0].y;
        const x2 = this.points[1].x;
        const y2 = this.points[1].y;

        const l2 = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
        if (l2 === 0) return Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2)) < this.strokeWidth / 2;

        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
        t = Math.max(0, Math.min(1, t));

        const projX = x1 + t * (x2 - x1);
        const projY = y1 + t * (y2 - y1);
        const dist = Math.sqrt(Math.pow(px - projX, 2) + Math.pow(py - projY, 2));

        return dist < (Number(this.strokeWidth) / 2 + 5);
    }
}