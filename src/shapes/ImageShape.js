import { BaseShape } from './BaseShape.js';

export class ImageShape extends BaseShape {
    constructor(id, startX, startY, strokeWidth, strokeColor, fillColor, extraData) {
        super(id, 'image', startX, startY, strokeWidth, strokeColor, fillColor);
        
        this.points = [
            this.createPoint(startX, startY),
            this.createPoint(startX, startY),
            this.createPoint(startX, startY),
            this.createPoint(startX, startY)
        ];
        
        this.element = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        
        // 이미지 소스 주입
        if (extraData && extraData.imageUrl) {
            this.element.setAttribute('href', extraData.imageUrl);
        }
        
        // [신규] 원본 비율 저장
        this.originalRatio = (extraData && extraData.originalRatio) ? extraData.originalRatio : 1;
        
        // 종횡비 무시하고 자유롭게 변형 가능하도록 설정 (Shift 키 누르면 비율 유지됨)
        this.element.setAttribute('preserveAspectRatio', 'none');
        
        this.element.setAttribute('x', startX);
        this.element.setAttribute('y', startY);
        this.element.setAttribute('width', '0');
        this.element.setAttribute('height', '0');
        
        console.log(`[CLASS ImageShape] 이미지 도형 생성 완료 | ID: ${id}`);
    }

    update(currentX, currentY, isShift = false) {
        let dx = currentX - this.startX;
        let dy = currentY - this.startY;

        // Shift 키를 누르면 1:1이 아닌 원본 비율(originalRatio) 유지
        if (isShift && this.originalRatio) {
            const w = Math.abs(dx);
            const h = Math.abs(dy);
            if (w / h > this.originalRatio) {
                dy = (dy < 0 ? -1 : 1) * (w / this.originalRatio);
            } else {
                dx = (dx < 0 ? -1 : 1) * (h * this.originalRatio);
            }
        } else if (isShift) {
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

    resize(handleIndex, newX, newY, isShift = false) {
        // [신규] Shift 키가 눌려있고 원본 비율이 있다면, 반대편 고정점을 기준으로 비율 고정 계산
        if (isShift && this.originalRatio) {
            let oppX, oppY;
            if (handleIndex === 0) { oppX = this.points[2].x; oppY = this.points[2].y; }
            else if (handleIndex === 1) { oppX = this.points[3].x; oppY = this.points[3].y; }
            else if (handleIndex === 2) { oppX = this.points[0].x; oppY = this.points[0].y; }
            else if (handleIndex === 3) { oppX = this.points[1].x; oppY = this.points[1].y; }

            let dw = Math.abs(newX - oppX);
            let dh = Math.abs(newY - oppY);

            if (dw / dh > this.originalRatio) {
                dh = dw / this.originalRatio;
            } else {
                dw = dh * this.originalRatio;
            }

            newX = oppX + (newX > oppX ? dw : -dw);
            newY = oppY + (newY > oppY ? dh : -dh);
        }

        if (handleIndex === 0) {
            this.points[0].x = newX; this.points[0].y = newY;
            this.points[1].y = newY; this.points[3].x = newX;
        } else if (handleIndex === 1) {
            this.points[1].x = newX; this.points[1].y = newY;
            this.points[0].y = newY; this.points[2].x = newX;
        } else if (handleIndex === 2) {
            this.points[2].x = newX; this.points[2].y = newY;
            this.points[1].x = newX; this.points[3].y = newY;
        } else if (handleIndex === 3) {
            this.points[3].x = newX; this.points[3].y = newY;
            this.points[0].x = newX; this.points[2].y = newY;
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
    }

    containsPoint(px, py) {
        const minX = Math.min(this.points[0].x, this.points[2].x);
        const maxX = Math.max(this.points[0].x, this.points[2].x);
        const minY = Math.min(this.points[0].y, this.points[2].y);
        const maxY = Math.max(this.points[0].y, this.points[2].y);

        return px >= minX && px <= maxX && py >= minY && py <= maxY;
    }
}