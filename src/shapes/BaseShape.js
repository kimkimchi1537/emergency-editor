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
        this.opacity = 1; 
        this.isLocked = false; 
        
        console.log(`[CLASS BaseShape] 생성자 호출 | ID: ${this.id}, Type: ${this.type}, Initial Width: ${this.strokeWidth}`);
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

    setOpacity(opacity) {
        this.opacity = opacity;
        if (this.element) {
            this.element.setAttribute('opacity', this.opacity);
        }
        if (this.type === 'group' && this.children) {
            this.children.forEach(child => child.setOpacity(opacity));
        }
    }

    getOpacity() { return this.opacity; }

    applyColors() {
        if (this.element && this.type !== 'image') {
            const finalStroke = this.strokeColor === 'transparent' ? 'none' : this.strokeColor;
            const finalFill = this.fillColor === 'transparent' ? 'none' : this.fillColor;
            
            this.element.setAttribute('stroke', finalStroke);
            this.element.setAttribute('fill', finalFill);
            
            // [핵심 수정] 생성/변경 시 SVG 태그에 실제 선 굵기 값을 강제로 주입합니다.
            this.element.setAttribute('stroke-width', this.strokeWidth);
            
            console.log(`[CLASS BaseShape] 🎨 색상/굵기 렌더링 완료 | ID: ${this.id}, Width: ${this.strokeWidth}`);
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

    static getFlattenedShapes(shapes) {
        let flattened = [];
        shapes.forEach(shape => {
            if (shape.type === 'group') flattened = flattened.concat(this.getFlattenedShapes(shape.children));
            else flattened.push(shape);
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
        const cosA = Math.cos(deltaRad); const sinA = Math.sin(deltaRad);

        flatShapes.forEach(shape => {
            shape.points.forEach((p, i) => {
                p.x = shape._tempStartPoints[i].x; p.y = shape._tempStartPoints[i].y;
            });
            shape.updateAttributes();
            shape.setRotation(shape._tempStartAngle, shape._tempStartCx, shape._tempStartCy);
            const dx = shape._tempStartCx - rotationCenter.x; const dy = shape._tempStartCy - rotationCenter.y;
            const newCx = rotationCenter.x + dx * cosA - dy * sinA; const newCy = rotationCenter.y + dx * sinA + dy * cosA;
            const moveX = newCx - shape._tempStartCx; const moveY = newCy - shape._tempStartCy;
            shape.move(moveX, moveY);
            shape.setRotation(shape._tempStartAngle + deltaAngle, newCx, newCy);
        });
        shapes.forEach(s => { if(s.type === 'group') s.updateAttributes(); });
    }

    static moveGroup(shapes, dx, dy) {
        const flatShapes = this.getFlattenedShapes(shapes);
        flatShapes.forEach(shape => shape.move(dx, dy));
        shapes.forEach(s => { if(s.type === 'group') s.updateAttributes(); });
    }
}