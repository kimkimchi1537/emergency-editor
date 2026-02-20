import { BaseShape } from './BaseShape.js';

export class MultiLineShape extends BaseShape {
    constructor(id, startX, startY, strokeWidth) {
        super(id, 'multiline', startX, startY, strokeWidth);
        this.points = [this.createPoint(startX, startY), this.createPoint(startX, startY)];
        this.element = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        this.element.setAttribute('fill', 'none');
        this.element.setAttribute('stroke', '#e63946');
        this.element.setAttribute('stroke-width', this.strokeWidth);
        this.element.setAttribute('stroke-linejoin', 'round');
        this.element.setAttribute('stroke-linecap', 'round');
        this.updateAttributes();
        console.log(`[CLASS MultiLineShape] 연속선 생성 완료 | ID: ${id}, 굵기: ${this.strokeWidth}`);
    }

    addPoint(x, y) {
        this.points.push(this.createPoint(x, y));
        console.log(`[METHOD addPoint] 점 추가 완료 | 현재 점 개수: ${this.points.length}`);
        this.updateAttributes();
    }

    update(currentX, currentY, isShift = false) {
        const lastIdx = this.points.length - 1;
        let finalX = currentX;
        let finalY = currentY;

        if (isShift && this.points.length >= 2) {
            const prevX = this.points[lastIdx - 1].x;
            const prevY = this.points[lastIdx - 1].y;
            const dx = currentX - prevX;
            const dy = currentY - prevY;
            const angle = Math.atan2(dy, dx);
            const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            finalX = prevX + dist * Math.cos(snapAngle);
            finalY = prevY + dist * Math.sin(snapAngle);
            console.log(`[METHOD update] MultiLine Shift 스냅 | 원본각도: ${(angle * 180 / Math.PI).toFixed(1)}, 스냅각도: ${(snapAngle * 180 / Math.PI).toFixed(1)}`);
        }

        this.points[lastIdx].x = finalX;
        this.points[lastIdx].y = finalY;
        this.updateAttributes();
    }

    finish() {
        this.points.pop();
        this.updateAttributes();
        console.log(`[METHOD finish] 연속선 꼬리 제거 완료 | 최종 점 개수: ${this.points.length}`);
    }

    removeLastFixedPoint() {
        if (this.points.length > 2) {
            this.points.splice(this.points.length - 2, 1);
            this.updateAttributes();
            console.log(`[METHOD removeLastFixedPoint] 로컬 Undo: 마지막 확정 점 제거 완료 | 현재 점 개수: ${this.points.length}`);
            return true;
        }
        console.log(`[METHOD removeLastFixedPoint] 로컬 Undo 거부: 제거할 확정 점이 존재하지 않음`);
        return false;
    }

    resize(handleIndex, newX, newY, isShift = false) {
        if (handleIndex >= 0 && handleIndex < this.points.length) {
            this.points[handleIndex].x = newX;
            this.points[handleIndex].y = newY;
            this.updateAttributes();
            console.log(`[METHOD resize] MultiLineShape 핸들 ${handleIndex} 갱신 완료 | (${newX.toFixed(1)}, ${newY.toFixed(1)})`);
        }
    }

    updateAttributes() {
        const pointsString = this.points.map(p => `${p.x},${p.y}`).join(' ');
        this.element.setAttribute('points', pointsString);
        console.log(`[METHOD updateAttributes] MultiLineShape 좌표 동기화 완료`);
    }

    containsPoint(px, py) {
        for (let i = 0; i < this.points.length - 1; i++) {
            const p1 = this.points[i];
            const p2 = this.points[i + 1];
            const l2 = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
            
            if (l2 === 0) continue;

            let t = ((px - p1.x) * (p2.x - p1.x) + (py - p1.y) * (p2.y - p1.y)) / l2;
            t = Math.max(0, Math.min(1, t));

            const projX = p1.x + t * (p2.x - p1.x);
            const projY = p1.y + t * (p2.y - p1.y);
            const dist = Math.sqrt(Math.pow(px - projX, 2) + Math.pow(py - projY, 2));

            if (dist < (Number(this.strokeWidth) / 2 + 5)) {
                return true;
            }
        }
        return false;
    }
}