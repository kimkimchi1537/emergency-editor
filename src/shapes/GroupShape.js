import { BaseShape } from './BaseShape.js';

export class GroupShape extends BaseShape {
    constructor(id, children) {
        super(id, 'group', 0, 0, 0, 'transparent', 'transparent');
        this.children = children;
        this.element = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.element.setAttribute('class', 'shape-group');

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.children.forEach(child => {
            this.element.appendChild(child.element);
            
            const rotated = this.getRotatedPoints(child);
            rotated.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });
        });

        this.points = [
            this.createPoint(minX, minY),
            this.createPoint(maxX, minY),
            this.createPoint(maxX, maxY),
            this.createPoint(minX, maxY)
        ];

        console.log(`[CLASS GroupShape] 그룹 생성 완료 | ID: ${id}, 자식: ${children.length}개`);
    }

    getRotatedPoints(shape) {
        const currentTransform = shape.element.getAttribute('transform') || '';
        const match = currentTransform.match(/rotate\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/);
        let angleRad = 0, cx = 0, cy = 0;
        
        if (match) {
            angleRad = parseFloat(match[1]) * (Math.PI / 180);
            cx = parseFloat(match[2]);
            cy = parseFloat(match[3]);
        }
        
        return shape.points.map(p => {
            if (!match) return { x: p.x, y: p.y };
            const dx = p.x - cx;
            const dy = p.y - cy;
            return {
                x: cx + dx * Math.cos(angleRad) - dy * Math.sin(angleRad),
                y: cy + dx * Math.sin(angleRad) + dy * Math.cos(angleRad)
            };
        });
    }

    updateAttributes() {
        // 그룹 컨테이너 자체는 고유 x, y 속성이 없으므로 무시합니다.
        console.log(`[METHOD updateAttributes] GroupShape 속성 동기화 (Pass)`);
    }

    move(dx, dy) {
        super.move(dx, dy); 
        this.children.forEach(child => child.move(dx, dy));
        console.log(`[METHOD move] GroupShape 이동 - 자식 요소 위임 완료 | dx: ${dx.toFixed(1)}, dy: ${dy.toFixed(1)}`);
    }

    setColors(strokeColor, fillColor) {
        this.strokeColor = strokeColor;
        this.fillColor = fillColor;
        this.children.forEach(child => child.setColors(strokeColor, fillColor));
        console.log(`[METHOD setColors] GroupShape 색상 변경 - 자식 요소 일괄 적용 완료`);
    }

    getColors() {
        if (this.children.length > 0) return this.children[0].getColors();
        return { stroke: 'transparent', fill: 'transparent' };
    }

    containsPoint(px, py) {
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            const cPos = this.getInverseTransformedPoint({x: px, y: py}, child);
            if (child.containsPoint(cPos.x, cPos.y)) {
                return true;
            }
        }
        return false;
    }

    getInverseTransformedPoint(pos, shape) {
        const currentTransform = shape.element.getAttribute('transform') || '';
        const match = currentTransform.match(/rotate\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/);
        let localPos = { x: pos.x, y: pos.y };
        if (match) {
            const angleDeg = parseFloat(match[1]);
            const cx = parseFloat(match[2]);
            const cy = parseFloat(match[3]);
            const angleRad = -angleDeg * (Math.PI / 180); 
            const dx = pos.x - cx;
            const dy = pos.y - cy;
            localPos.x = cx + dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
            localPos.y = cy + dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
        }
        return localPos;
    }

    resize(handleIndex, newX, newY, isShift) {
        // 다중 그룹 객체의 리사이즈는 왜곡 방지를 위해 지원하지 않습니다.
        console.log(`[METHOD resize] GroupShape 리사이즈 차단 (비율 보존)`);
    }
}