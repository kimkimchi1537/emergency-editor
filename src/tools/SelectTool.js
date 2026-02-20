import { BaseTool } from './BaseTool.js';
import { HistoryManager } from '../managers/HistoryManager.js';

export class SelectTool extends BaseTool {
    constructor(state, workspace) {
        super(state, workspace);
        this.isMarquee = false;
        this.isRotating = false;
        this.isMoving = false;
        this.marqueeStart = { x: 0, y: 0 };
        this.moveStart = { x: 0, y: 0 };
        this.marqueeElement = null;
        this.selectionOverlay = null;
        this.rotationCenter = { x: 0, y: 0 };
        this.initialAngle = 0;
        this.currentDeltaAngle = 0;
        
        console.log(`[CLASS SelectTool] 선택 도구 초기화 | OCP 준수 - 객체지향 위임 패턴 적용 완료`);
    }

    onMouseDown(e) {
        const pos = this.getMousePosition(e);
        const isShift = e.shiftKey;
        
        if (this.state.selectedShapes.length > 0 && e.target.classList.contains('rotate-handle')) {
            console.log(`[SELECT-TOOL] 회전 핸들 포착 - 회전 프로세스 진입`);
            HistoryManager.getInstance(this.state, this.workspace).saveState(); // [HISTORY] 회전 시작 전 스냅샷
            this.isRotating = true;
            this.prepareRotation(pos);
            return;
        }

        if (this.state.selectedShapes.length > 0 && this.isPointInSelectionBox(pos)) {
            console.log(`[SELECT-TOOL] 선택 영역(Box) 내부 클릭 감지 - 이동 모드 진입`);
            HistoryManager.getInstance(this.state, this.workspace).saveState(); // [HISTORY] 이동 시작 전 스냅샷
            this.isMoving = true;
            this.moveStart = pos;
            return;
        }

        let clickedShape = null;
        for (let i = this.state.shapes.length - 1; i >= 0; i--) {
            if (this.state.shapes[i].containsPoint(pos.x, pos.y)) {
                clickedShape = this.state.shapes[i];
                break;
            }
        }

        if (clickedShape) {
            console.log(`[SELECT-TOOL] 도형 직접 클릭: ${clickedShape.id}`);
            
            if (this.state.selectedShapes.includes(clickedShape) && !isShift) {
                console.log(`[SELECT-TOOL] 이미 선택된 도형 드래그 - 이동 모드 진입`);
                HistoryManager.getInstance(this.state, this.workspace).saveState(); // [HISTORY] 이동 시작 전 스냅샷
                this.isMoving = true;
                this.moveStart = pos;
                return;
            }

            if (isShift) {
                const index = this.state.selectedShapes.indexOf(clickedShape);
                if (index > -1) {
                    clickedShape.element.style.filter = '';
                    this.state.selectedShapes.splice(index, 1);
                } else {
                    clickedShape.element.style.filter = 'drop-shadow(0 0 5px #0066cc)';
                    this.state.selectedShapes.push(clickedShape);
                }
            } else {
                this.clearSelection();
                this.state.selectedShapes.push(clickedShape);
                clickedShape.element.style.filter = 'drop-shadow(0 0 5px #0066cc)';
            }
            this.currentDeltaAngle = 0; 
            this.renderSelectionUI();
        } else {
            console.log(`[SELECT-TOOL] 빈 공간 클릭 - Marquee 영역 선택 시작`);
            if (!isShift) this.clearSelection();
            this.startMarquee(pos);
        }
    }

    onMouseMove(e) {
        const pos = this.getMousePosition(e);

        if (this.isRotating) {
            this.applyRotation(pos, e.shiftKey);
            return;
        }

        if (this.isMoving) {
            this.applyMove(pos);
            return;
        }

        if (this.isMarquee && this.marqueeElement) {
            this.updateMarquee(pos);
            return;
        }

        if (this.state.selectedShapes.length > 0) {
            if (e.target.classList.contains('rotate-handle')) {
                this.workspace.style.cursor = 'grab';
                return;
            }

            if (this.isPointInSelectionBox(pos)) {
                if (this.workspace.style.cursor !== 'move') {
                    this.workspace.style.cursor = 'move';
                }
                return;
            }
        }

        let hoverFound = false;
        for (let i = this.state.shapes.length - 1; i >= 0; i--) {
            if (this.state.shapes[i].containsPoint(pos.x, pos.y)) {
                hoverFound = true;
                break;
            }
        }
        this.workspace.style.cursor = hoverFound ? 'pointer' : 'default';
    }

    onMouseUp(e) {
        if (this.isRotating) {
            console.log(`[SELECT-TOOL] 회전 종료`);
            this.isRotating = false;
            this.syncFinalTransforms();
        }

        if (this.isMoving) {
            console.log(`[SELECT-TOOL] 이동 종료`);
            this.isMoving = false;
        }

        if (this.isMarquee) {
            this.endMarquee();
            this.currentDeltaAngle = 0;
            this.renderSelectionUI();
        }
    }

    isPointInSelectionBox(pos) {
        if (!this.selectionOverlay) return false;
        const box = this.getSelectionBoundingBox();
        const padding = 5;

        if (this.state.selectedShapes.length === 1 && this.state.selectedShapes[0].type === 'line') {
            const line = this.state.selectedShapes[0];
            const p1 = line.points[0];
            const p2 = line.points[1];
            const length = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
            const angleDeg = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
            
            const dx = pos.x - p1.x;
            const dy = pos.y - p1.y;
            const angleRad = -angleDeg * (Math.PI / 180);
            const rx = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
            const ry = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);

            return rx >= -padding && rx <= length + padding && ry >= -padding && ry <= padding;
        } else {
            const cx = box.minX + box.width / 2;
            const cy = box.minY + box.height / 2;
            const angleDeg = this.currentDeltaAngle || 0;
            
            const dx = pos.x - cx;
            const dy = pos.y - cy;
            const angleRad = -angleDeg * (Math.PI / 180);
            const rx = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
            const ry = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);

            const halfW = (box.width / 2) + padding;
            const halfH = (box.height / 2) + padding;

            return Math.abs(rx) <= halfW && Math.abs(ry) <= halfH;
        }
    }

    prepareRotation(pos) {
        const box = this.getSelectionBoundingBox();
        this.rotationCenter = {
            x: box.minX + box.width / 2,
            y: box.minY + box.height / 2
        };
        this.initialAngle = Math.atan2(pos.y - this.rotationCenter.y, pos.x - this.rotationCenter.x) * (180 / Math.PI);
        this.state.selectedShapes.forEach(shape => {
            const currentTransform = shape.element.getAttribute('transform') || '';
            const match = currentTransform.match(/rotate\(([-\d.]+)/);
            shape._tempStartRotation = match ? parseFloat(match[1]) : 0;
        });
    }

    applyRotation(pos, isShift) {
        const currentMouseAngle = Math.atan2(pos.y - this.rotationCenter.y, pos.x - this.rotationCenter.x) * (180 / Math.PI);
        const deltaAngle = currentMouseAngle - this.initialAngle;

        this.state.selectedShapes.forEach(shape => {
            let newRotation = (shape._tempStartRotation || 0) + deltaAngle;
            if (isShift) {
                newRotation = Math.round(newRotation / 15) * 15;
            }
            shape.setRotation(newRotation, this.rotationCenter.x, this.rotationCenter.y);
            
            if (this.state.selectedShapes.length === 1) {
                this.currentDeltaAngle = newRotation - (shape._tempStartRotation || 0);
            }
        });

        if (this.state.selectedShapes.length > 1) {
            this.currentDeltaAngle = isShift ? Math.round(deltaAngle / 15) * 15 : deltaAngle;
        }

        this.renderSelectionUI();
    }

    applyMove(pos) {
        const dx = pos.x - this.moveStart.x;
        const dy = pos.y - this.moveStart.y;

        this.state.selectedShapes.forEach(shape => {
            shape.move(dx, dy); 
        });

        this.moveStart = pos;
        this.renderSelectionUI();
    }

    syncFinalTransforms() {
        this.state.selectedShapes.forEach(shape => {
            const currentTransform = shape.element.getAttribute('transform') || '';
            const match = currentTransform.match(/rotate\(([-\d.]+)/);
            shape._lastRotation = match ? parseFloat(match[1]) : 0;
        });
    }

    renderSelectionUI() {
        if (this.selectionOverlay) {
            this.workspace.removeChild(this.selectionOverlay);
            this.selectionOverlay = null;
        }
        if (this.state.selectedShapes.length === 0) return;

        let box, overlayTransform = "";
        const padding = 5;

        if (this.state.selectedShapes.length === 1 && this.state.selectedShapes[0].type === 'line') {
            const line = this.state.selectedShapes[0];
            const p1 = line.points[0];
            const p2 = line.points[1];
            const length = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
            
            box = { minX: 0, minY: -padding, width: length, height: padding * 2 };
            overlayTransform = `translate(${p1.x}, ${p1.y}) rotate(${angle})`;
            
            const currentTransform = line.element.getAttribute('transform') || '';
            const match = currentTransform.match(/rotate\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/);
            if (match && !this.isRotating) {
                overlayTransform = `${match[0]} ${overlayTransform}`;
            } else if (this.isRotating) {
                overlayTransform = `rotate(${this.currentDeltaAngle}, ${this.rotationCenter.x}, ${this.rotationCenter.y}) ${overlayTransform}`;
            }
        } else {
            box = this.getSelectionBoundingBox();
            if (this.isRotating) {
                overlayTransform = `rotate(${this.currentDeltaAngle}, ${this.rotationCenter.x}, ${this.rotationCenter.y})`;
            } else {
                const firstShape = this.state.selectedShapes[0];
                const currentTransform = firstShape.element.getAttribute('transform') || '';
                const match = currentTransform.match(/rotate\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/);
                if (match) overlayTransform = match[0];
            }
        }

        this.selectionOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.selectionOverlay.setAttribute('class', 'selection-ui-layer');
        if (overlayTransform) this.selectionOverlay.setAttribute('transform', overlayTransform);

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', box.minX - padding);
        rect.setAttribute('y', box.minY - padding);
        rect.setAttribute('width', box.width + padding * 2);
        rect.setAttribute('height', box.height + padding * 2);
        rect.setAttribute('fill', 'transparent'); 
        rect.setAttribute('stroke', '#0066cc');
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('stroke-dasharray', '4,2');
        rect.style.pointerEvents = 'none';
        this.selectionOverlay.appendChild(rect);

        const handleLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        handleLine.setAttribute('x1', box.minX + box.width / 2);
        handleLine.setAttribute('y1', box.minY - padding);
        handleLine.setAttribute('x2', box.minX + box.width / 2);
        handleLine.setAttribute('y2', box.minY - 25);
        handleLine.setAttribute('stroke', '#0066cc');
        handleLine.style.pointerEvents = 'none';
        this.selectionOverlay.appendChild(handleLine);

        const rotateHandleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        rotateHandleGroup.setAttribute('class', 'rotate-handle');
        rotateHandleGroup.style.cursor = 'grab';
        rotateHandleGroup.style.pointerEvents = 'auto';

        const rotateCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        rotateCircle.setAttribute('class', 'rotate-handle');
        rotateCircle.setAttribute('cx', box.minX + box.width / 2);
        rotateCircle.setAttribute('cy', box.minY - 25);
        rotateCircle.setAttribute('r', '10');
        rotateCircle.setAttribute('fill', '#fff');
        rotateCircle.setAttribute('stroke', '#0066cc');
        rotateCircle.setAttribute('stroke-width', '1');
        rotateHandleGroup.appendChild(rotateCircle);

        const rotateIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        rotateIcon.setAttribute('class', 'rotate-handle material-icons');
        rotateIcon.setAttribute('x', box.minX + box.width / 2);
        rotateIcon.setAttribute('y', box.minY - 25); 
        rotateIcon.setAttribute('dominant-baseline', 'central');
        rotateIcon.setAttribute('text-anchor', 'middle');
        rotateIcon.setAttribute('font-size', '14px');
        rotateIcon.setAttribute('fill', '#0066cc');
        rotateIcon.style.userSelect = 'none';
        rotateIcon.style.webkitUserSelect = 'none';
        rotateIcon.style.msUserSelect = 'none';
        rotateIcon.style.mozUserSelect = 'none';
        rotateIcon.textContent = 'rotate_right';
        rotateHandleGroup.appendChild(rotateIcon);

        this.selectionOverlay.appendChild(rotateHandleGroup);

        this.workspace.appendChild(this.selectionOverlay);
    }

    getSelectionBoundingBox() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.state.selectedShapes.forEach(shape => {
            shape.points.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });
        });
        return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
    }

    startMarquee(pos) {
        this.isMarquee = true;
        this.marqueeStart = { x: pos.x, y: pos.y };
        this.marqueeElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.marqueeElement.setAttribute('fill', 'rgba(0, 102, 204, 0.1)');
        this.marqueeElement.setAttribute('stroke', '#0066cc');
        this.marqueeElement.setAttribute('stroke-width', '1');
        this.marqueeElement.setAttribute('stroke-dasharray', '4');
        this.workspace.appendChild(this.marqueeElement);
    }

    updateMarquee(pos) {
        const x = Math.min(this.marqueeStart.x, pos.x);
        const y = Math.min(this.marqueeStart.y, pos.y);
        const width = Math.abs(this.marqueeStart.x - pos.x);
        const height = Math.abs(this.marqueeStart.y - pos.y);
        this.marqueeElement.setAttribute('x', x);
        this.marqueeElement.setAttribute('y', y);
        this.marqueeElement.setAttribute('width', width);
        this.marqueeElement.setAttribute('height', height);
    }

    endMarquee() {
        if (!this.marqueeElement) return;
        const x = parseFloat(this.marqueeElement.getAttribute('x'));
        const y = parseFloat(this.marqueeElement.getAttribute('y'));
        const width = parseFloat(this.marqueeElement.getAttribute('width'));
        const height = parseFloat(this.marqueeElement.getAttribute('height'));
        const marqueeBox = { minX: x, minY: y, maxX: x + width, maxY: y + height };
        this.state.shapes.forEach(shape => {
            if (this.isShapeInBox(shape, marqueeBox)) {
                if (!this.state.selectedShapes.includes(shape)) {
                    this.state.selectedShapes.push(shape);
                    shape.element.style.filter = 'drop-shadow(0 0 5px #0066cc)';
                }
            }
        });
        this.workspace.removeChild(this.marqueeElement);
        this.marqueeElement = null;
        this.isMarquee = false;
    }

    isShapeInBox(shape, box) {
        let shapeBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        shape.points.forEach(p => {
            shapeBox.minX = Math.min(shapeBox.minX, p.x);
            shapeBox.minY = Math.min(shapeBox.minY, p.y);
            shapeBox.maxX = Math.max(shapeBox.maxX, p.x);
            shapeBox.maxY = Math.max(shapeBox.maxY, p.y);
        });
        return !(shapeBox.maxX < box.minX || shapeBox.minX > box.maxX || shapeBox.maxY < box.minY || shapeBox.minY > box.maxY);
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        if (key === 'delete' || key === 'backspace') {
            if (this.state.selectedShapes.length > 0) {
                HistoryManager.getInstance(this.state, this.workspace).saveState(); // [HISTORY] 삭제 전 스냅샷
                this.deleteSelectedShapes();
                this.renderSelectionUI();
                return true;
            }
        }
        return false;
    }

    clearSelection() {
        this.state.selectedShapes.forEach(shape => {
            shape.element.style.filter = '';
        });
        this.state.selectedShapes = [];
        this.currentDeltaAngle = 0;
        if (this.selectionOverlay) {
            this.workspace.removeChild(this.selectionOverlay);
            this.selectionOverlay = null;
        }
    }

    deleteSelectedShapes() {
        this.state.selectedShapes.forEach(shape => {
            if (shape.element && shape.element.parentNode) {
                shape.element.parentNode.removeChild(shape.element);
            }
            const idx = this.state.shapes.indexOf(shape);
            if (idx > -1) this.state.shapes.splice(idx, 1);
        });
        this.state.selectedShapes = [];
    }

    onDeactivate() {
        this.clearSelection();
        super.onDeactivate();
    }
}