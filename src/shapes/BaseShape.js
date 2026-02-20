export class BaseShape {
    constructor(id, type, startX, startY, strokeWidth) {
        this.id = id;
        this.type = type;
        this.startX = startX;
        this.startY = startY;
        this.strokeWidth = strokeWidth;
        this.points = [];
        this.element = null;
        console.log(`[CLASS BaseShape] 기본 도형 구조체 초기화 | ID: ${id}, Type: ${type}`);
    }

    createPoint(x, y) {
        return { x, y };
    }

    update(currentX, currentY, isShift = false) {}
    containsPoint(px, py) { return false; }
    
    resize(handleIndex, newX, newY, isShift = false) {}

    move(dx, dy) {
        this.points.forEach(p => {
            p.x += dx;
            p.y += dy;
        });

        this.updateAttributes();

        const currentTransform = this.element.getAttribute('transform') || '';
        const match = currentTransform.match(/rotate\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/);
        if (match) {
            const angle = match[1];
            const newCx = parseFloat(match[2]) + dx;
            const newCy = parseFloat(match[3]) + dy;
            this.element.setAttribute('transform', `rotate(${angle}, ${newCx}, ${newCy})`);
        }

        console.log(`[METHOD move] ${this.id}(${this.type}) 자체 이동 수행 완료 | dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}`);
    }

    setRotation(angle, cx, cy) {
        this.element.setAttribute('transform', `rotate(${angle}, ${cx}, ${cy})`);
        console.log(`[METHOD setRotation] ${this.id}(${this.type}) 자체 회전 수행 완료 | 각도=${angle.toFixed(1)}, 중심=(${cx.toFixed(1)}, ${cy.toFixed(1)})`);
    }

    updateAttributes() {
        console.warn(`[WARNING] ${this.type} 클래스에 updateAttributes()가 오버라이딩되지 않았습니다. 다형성이 깨질 수 있습니다.`);
        if (this.type === 'arrow' && this.points.length >= 2) {
            this.element.setAttribute('x1', this.points[0].x);
            this.element.setAttribute('y1', this.points[0].y);
            this.element.setAttribute('x2', this.points[1].x);
            this.element.setAttribute('y2', this.points[1].y);
        }
    }
}