export class BaseShape {
    constructor(id, type, startX, startY, strokeWidth, strokeColor = '#e63946', fillColor = 'transparent') {
        this.id = id;
        this.type = type;
        this.startX = startX;
        this.startY = startY;
        this.strokeWidth = strokeWidth;
        this.strokeColor = strokeColor;
        this.fillColor = fillColor;
        this.points = [];
        this.element = null;
        console.log(`[CLASS BaseShape] 기본 도형 구조체 초기화 | ID: ${id}, Type: ${type}, 선: ${strokeColor}, 채우기: ${fillColor}`);
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

    getColors() {
        return { stroke: this.strokeColor, fill: this.fillColor };
    }

    setColors(strokeColor, fillColor) {
        this.strokeColor = strokeColor;
        this.fillColor = fillColor;
        this.applyColors();
        console.log(`[METHOD setColors] ${this.id}(${this.type}) 색상 변경 완료 | 선: ${strokeColor}, 채우기: ${fillColor}`);
    }

    applyColors() {
        if (this.element) {
            this.element.setAttribute('stroke', this.strokeColor === 'transparent' ? 'none' : this.strokeColor);
            if (this.fillColor === 'transparent') {
                this.element.setAttribute('fill', 'none');
            } else {
                // 채우기 적용 시 자동으로 0.2 반투명 처리
                const r = parseInt(this.fillColor.slice(1, 3), 16) || 0;
                const g = parseInt(this.fillColor.slice(3, 5), 16) || 0;
                const b = parseInt(this.fillColor.slice(5, 7), 16) || 0;
                this.element.setAttribute('fill', `rgba(${r}, ${g}, ${b}, 0.2)`);
            }
        }
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

    // ==========================================
    // [정적 유틸리티] 다중 선택(임시 그룹) 연산 위임부
    // ==========================================

    static prepareGroupSnapshot(shapes) {
        shapes.forEach(shape => {
            shape._tempStartPoints = shape.points.map(p => ({ x: p.x, y: p.y }));
            const currentTransform = shape.element.getAttribute('transform') || '';
            const match = currentTransform.match(/rotate\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/);
            
            if (match) {
                shape._tempStartAngle = parseFloat(match[1]);
                shape._tempStartCx = parseFloat(match[2]);
                shape._tempStartCy = parseFloat(match[3]);
            } else {
                shape._tempStartAngle = 0;
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                shape.points.forEach(p => {
                    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
                    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
                });
                shape._tempStartCx = minX + (maxX - minX) / 2;
                shape._tempStartCy = minY + (maxY - minY) / 2;
            }
        });
        console.log(`[BASESHAPE-STATIC] 임시 그룹 회전용 스냅샷 저장 완료 | 대상: ${shapes.length}개 도형`);
    }

    static rotateGroup(shapes, deltaAngle, rotationCenter) {
        const deltaRad = deltaAngle * (Math.PI / 180);
        const cosA = Math.cos(deltaRad);
        const sinA = Math.sin(deltaRad);

        shapes.forEach(shape => {
            shape.points.forEach((p, i) => {
                p.x = shape._tempStartPoints[i].x;
                p.y = shape._tempStartPoints[i].y;
            });
            shape.updateAttributes();
            shape.setRotation(shape._tempStartAngle, shape._tempStartCx, shape._tempStartCy);

            const dx = shape._tempStartCx - rotationCenter.x;
            const dy = shape._tempStartCy - rotationCenter.y;
            
            const newCx = rotationCenter.x + dx * cosA - dy * sinA;
            const newCy = rotationCenter.y + dx * sinA + dy * cosA;

            const moveX = newCx - shape._tempStartCx;
            const moveY = newCy - shape._tempStartCy;

            shape.move(moveX, moveY);

            const newRotation = shape._tempStartAngle + deltaAngle;
            shape.setRotation(newRotation, newCx, newCy);
        });
        console.log(`[BASESHAPE-STATIC] 임시 그룹 물리적 회전(공전+자전) 연산 적용 완료 | 변위각: ${deltaAngle.toFixed(1)}도`);
    }

    static moveGroup(shapes, dx, dy) {
        shapes.forEach(shape => shape.move(dx, dy));
        console.log(`[BASESHAPE-STATIC] 임시 그룹 일괄 이동 적용 완료 | dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}`);
    }
}