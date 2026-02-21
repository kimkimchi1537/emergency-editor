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
    }

    createPoint(x, y) { return { x, y }; }
    update(currentX, currentY, isShift = false) {}
    containsPoint(px, py) { return false; }
    resize(handleIndex, newX, newY, isShift = false) {}

    move(dx, dy) {
        this.points.forEach(p => { p.x += dx; p.y += dy; });
        this.updateAttributes();
        const currentTransform = this.element.getAttribute('transform') || '';
        const match = currentTransform.match(/rotate\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/);
        if (match) {
            const angle = match[1];
            const newCx = parseFloat(match[2]) + dx;
            const newCy = parseFloat(match[3]) + dy;
            this.element.setAttribute('transform', `rotate(${angle}, ${newCx}, ${newCy})`);
        }
    }

    setRotation(angle, cx, cy) {
        this.element.setAttribute('transform', `rotate(${angle}, ${cx}, ${cy})`);
    }

    getColors() { return { stroke: this.strokeColor, fill: this.fillColor }; }
    
    setColors(strokeColor, fillColor) {
        this.strokeColor = strokeColor;
        this.fillColor = fillColor;
        this.applyColors();
    }

    applyColors() {
        if (this.element) {
            this.element.setAttribute('stroke', this.strokeColor === 'transparent' ? 'none' : this.strokeColor);
            if (this.fillColor === 'transparent') {
                this.element.setAttribute('fill', 'none');
            } else {
                const r = parseInt(this.fillColor.slice(1, 3), 16) || 0;
                const g = parseInt(this.fillColor.slice(3, 5), 16) || 0;
                const b = parseInt(this.fillColor.slice(5, 7), 16) || 0;
                this.element.setAttribute('fill', `rgba(${r}, ${g}, ${b}, 0.2)`);
            }
        }
    }

    updateAttributes() {
        if (this.type === 'arrow' && this.points.length >= 2) {
            this.element.setAttribute('x1', this.points[0].x);
            this.element.setAttribute('y1', this.points[0].y);
            this.element.setAttribute('x2', this.points[1].x);
            this.element.setAttribute('y2', this.points[1].y);
        }
    }

    // 그룹 내 자식 요소들의 수학적 병합 처리를 위한 정적 메서드
    static getFlattenedShapes(shapes) {
        let flattened = [];
        shapes.forEach(shape => {
            if (shape.type === 'group') {
                flattened = flattened.concat(this.getFlattenedShapes(shape.children));
            } else {
                flattened.push(shape);
            }
        });
        return flattened;
    }

    static prepareGroupSnapshot(shapes) {
        const flatShapes = this.getFlattenedShapes(shapes);
        flatShapes.forEach(shape => {
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
    }

    static rotateGroup(shapes, deltaAngle, rotationCenter) {
        const flatShapes = this.getFlattenedShapes(shapes);
        const deltaRad = deltaAngle * (Math.PI / 180);
        const cosA = Math.cos(deltaRad);
        const sinA = Math.sin(deltaRad);

        flatShapes.forEach(shape => {
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
        
        shapes.forEach(s => {
            if(s.type === 'group') s.updateAttributes();
        });
    }

    static moveGroup(shapes, dx, dy) {
        const flatShapes = this.getFlattenedShapes(shapes);
        flatShapes.forEach(shape => shape.move(dx, dy));
        
        shapes.forEach(s => {
            if(s.type === 'group') s.updateAttributes();
        });
    }
}