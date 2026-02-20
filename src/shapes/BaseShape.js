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

    // 하위 클래스에서 오버라이딩 필수
    update(currentX, currentY, isShift = false) {}
    containsPoint(px, py) { return false; }

    // --- 객체지향 리팩토링: 이동과 회전의 책임을 도형 클래스 내부로 캡슐화 ---

    move(dx, dy) {
        // 1. 공통 데이터(Points) 갱신
        this.points.forEach(p => {
            p.x += dx;
            p.y += dy;
        });

        // 2. 다형성(Polymorphism): 하위 클래스의 특성에 맞는 SVG 속성 갱신 호출
        this.updateAttributes();

        // 3. 회전 중심점(transform) 동기화
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
        // ArrowShape 등 기존 하위 클래스 호환을 위한 임시 펠백 처리
        if (this.type === 'arrow' && this.points.length >= 2) {
            this.element.setAttribute('x1', this.points[0].x);
            this.element.setAttribute('y1', this.points[0].y);
            this.element.setAttribute('x2', this.points[1].x);
            this.element.setAttribute('y2', this.points[1].y);
        }
    }
}