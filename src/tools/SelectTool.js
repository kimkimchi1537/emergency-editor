import { BaseTool } from './BaseTool.js';
import { HistoryManager } from '../managers/HistoryManager.js';
import { HandlerFactory } from '../factory/HandlerFactory.js';
import { BaseShape } from '../shapes/BaseShape.js';

export class SelectTool extends BaseTool {
    constructor(state, workspace) {
        super(state, workspace);
        this.isMarquee = false;
        this.isRotating = false;
        this.isMoving = false;
        this.isResizing = false;
        this.resizeHandleIndex = -1;
        this.marqueeStart = { x: 0, y: 0 };
        this.moveStart = { x: 0, y: 0 };
        this.marqueeElement = null;
        this.selectionOverlay = null;
        this.rotationCenter = { x: 0, y: 0 };
        this.initialAngle = 0;
        this.currentDeltaAngle = 0;
        this.initialBoundingBox = null;
        
        this.visualBox = null; 
        this.targetBox = null; 
        this.isAnimRunning = false; 
        this.lerpFactor = 0.18; 
        this.animThreshold = 0.05; 

        console.log(`[CLASS SelectTool] 선택 도구 초기화 | OBB/AABB 트랜지션 및 조작 중 숨김 로직 적용`);
    }

    onActivate() {
        console.log(`[SELECT-TOOL] 도구 활성화 생명주기 진입 | 선택 대기열 큐(Queue) 확인 시작`);
        
        if (this.state.selectionQueue && this.state.selectionQueue.length > 0) {
            console.log(`[SELECT-TOOL] 대기열 감지 (크기: ${this.state.selectionQueue.length}) - 대기열 소비 및 자동 선택 처리`);
            this.clearSelection(); 
            
            while (this.state.selectionQueue.length > 0) {
                const targetShape = this.state.selectionQueue.shift(); 
                if (this.state.shapes.includes(targetShape)) {
                    this.state.selectedShapes.push(targetShape);
                    targetShape.element.style.filter = 'drop-shadow(0 0 5px #0066cc)'; 
                    console.log(`[SELECT-TOOL] 큐 소비: 도형 ID ${targetShape.id} 선택 상태로 전환`);
                }
            }
            if (this.state.colorManager) this.state.colorManager.updateUI(this.state.selectedShapes);
        }

        if (this.state.selectedShapes.length > 0) {
            console.log(`[SELECT-TOOL] 활성화 시점 선택 객체 존재 - UI 렌더링 엔진 즉시 트리거`);
            this.renderSelectionUI();
        }
        
        super.onActivate();
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

    onMouseDown(e) {
        const pos = this.getMousePosition(e);
        const isShift = e.shiftKey;
        this.lastMousePos = pos;
        
        if (this.state.selectedShapes.length === 1 && e.target.classList.contains('resize-handle')) {
            const index = parseInt(e.target.getAttribute('data-index'), 10);
            HistoryManager.getInstance(this.state, this.workspace).saveState();
            this.isResizing = true;
            this.resizeHandleIndex = index;
            // 핸들을 누르자마자 즉시 UI 숨김 처리를 위해 렌더링 호출
            this.renderSelectionUI();
            return;
        }

        if (this.state.selectedShapes.length > 0 && e.target.classList.contains('rotate-handle')) {
            HistoryManager.getInstance(this.state, this.workspace).saveState();
            this.isRotating = true;
            this.prepareRotation(pos);
            // 회전 핸들을 누르자마자 즉시 UI 숨김 처리를 위해 렌더링 호출
            this.renderSelectionUI();
            return;
        }

        if (this.state.selectedShapes.length > 0 && this.isPointInSelectionBox(pos)) {
            HistoryManager.getInstance(this.state, this.workspace).saveState();
            this.isMoving = true;
            this.moveStart = pos;
            // 박스 내부를 잡아 이동을 시작하자마자 즉시 UI 숨김 처리를 위해 렌더링 호출
            this.renderSelectionUI();
            return;
        }

        let clickedShape = null;
        for (let i = this.state.shapes.length - 1; i >= 0; i--) {
            const localPos = this.getInverseTransformedPoint(pos, this.state.shapes[i]);
            if (this.state.shapes[i].containsPoint(localPos.x, localPos.y)) {
                clickedShape = this.state.shapes[i];
                break;
            }
        }

        if (clickedShape) {
            if (this.state.selectedShapes.includes(clickedShape) && !isShift) {
                HistoryManager.getInstance(this.state, this.workspace).saveState();
                this.isMoving = true;
                this.moveStart = pos;
                // 이미 선택된 도형을 눌러 이동을 시작할 때 즉시 UI 숨김 처리를 위해 렌더링 호출
                this.renderSelectionUI();
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
            if (this.state.colorManager) this.state.colorManager.updateUI(this.state.selectedShapes);
        } else {
            if (!isShift) {
                this.clearSelection();
            }
            this.startMarquee(pos);
        }
    }

    onMouseMove(e) {
        const pos = this.getMousePosition(e);
        this.lastMousePos = pos;

        if (this.isResizing) {
            this.applyResize(pos, e.shiftKey);
            return;
        }

        if (this.isRotating) {
            this.applyRotation(pos, e.shiftKey);
            this.workspace.style.cursor = 'grabbing';
            return;
        }

        if (this.isMoving) {
            this.applyMove(pos);
            this.workspace.style.cursor = 'move';
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
            if (e.target.classList.contains('resize-handle')) {
                this.workspace.style.cursor = 'crosshair';
                return;
            }
            if (this.isPointInSelectionBox(pos)) {
                this.workspace.style.cursor = 'move';
                return;
            }
        }

        let hoverFound = false;
        for (let i = this.state.shapes.length - 1; i >= 0; i--) {
            const localPos = this.getInverseTransformedPoint(pos, this.state.shapes[i]);
            if (this.state.shapes[i].containsPoint(localPos.x, localPos.y)) {
                hoverFound = true;
                break;
            }
        }
        this.workspace.style.cursor = hoverFound ? 'pointer' : 'default';
    }

    onMouseUp(e) {
        let actionCompleted = false;

        if (this.isResizing) {
            this.isResizing = false;
            this.resizeHandleIndex = -1;
            this.syncFinalTransforms();
            actionCompleted = true;
        }

        if (this.isRotating) {
            this.isRotating = false;
            this.syncFinalTransforms();
            actionCompleted = true;
        }

        if (this.isMoving) {
            this.isMoving = false;
            actionCompleted = true;
        }

        if (this.isMarquee) {
            this.endMarquee();
            this.currentDeltaAngle = 0;
            actionCompleted = true;
        }

        if (actionCompleted) {
            console.log(`[SELECT-TOOL] 마우스 조작(완료) - AABB 박스 재표시 렌더링`);
            this.renderSelectionUI();
        }
    }

    renderSelectionUI() {
        if (this.state.selectedShapes.length === 0) {
            this.clearSelectionOverlay();
            return;
        }

        // [추가] 이동, 회전, 또는 핸들 조작(리사이즈) 중이면 UI를 숨기고 조작 중 렌더링 조기 종료
        if (this.isMoving || this.isRotating || this.isResizing) {
            if (this.selectionOverlay) {
                console.log(`[SELECT-TOOL] 조작 중(Move/Rotate/Resize) - AABB 박스 임시 숨김 처리`);
                this.clearSelectionOverlay();
            }
            return;
        }

        // 1. [핵심 수정부] 이중 회전/팽창 버그 방지
        let newTarget;
        if (this.state.selectedShapes.length === 1) {
            newTarget = HandlerFactory.getHandler(this.state.selectedShapes[0].type).getBox(this.state.selectedShapes[0]);
        } else {
            // 마우스를 놓아 회전이 끝났을 때만 새로운 도형 위치를 감싸는 AABB를 재계산함.
            newTarget = this.getSelectionBoundingBox();
        }

        // 2. 초기화 또는 목표 갱신
        if (!this.visualBox) {
            this.visualBox = { ...newTarget };
        }
        this.targetBox = newTarget;

        // 3. 이전 상태와 현재 상태의 수치가 다르다면 애니메이션 엔진 트리거
        if (!this.isAnimRunning && this.checkDifference()) {
            this.startAnimLoop();
        }

        // 4. 즉시 렌더링 (루프 밖에서도 현재 visualBox 기반으로 그려야 함)
        if (!this.isAnimRunning) {
            this.drawSelectionOverlay(this.visualBox);
        }
    }

    checkDifference() {
        if (!this.visualBox || !this.targetBox) return false;
        return Math.abs(this.visualBox.minX - this.targetBox.minX) > this.animThreshold ||
               Math.abs(this.visualBox.minY - this.targetBox.minY) > this.animThreshold ||
               Math.abs(this.visualBox.width - this.targetBox.width) > this.animThreshold ||
               Math.abs(this.visualBox.height - this.targetBox.height) > this.animThreshold;
    }

    startAnimLoop() {
        if (this.isAnimRunning) return;
        this.isAnimRunning = true;

        const loop = () => {
            if (!this.isAnimRunning || !this.targetBox || !this.visualBox) return;

            // 선형 보간(Lerp) 연산 적용
            this.visualBox.minX += (this.targetBox.minX - this.visualBox.minX) * this.lerpFactor;
            this.visualBox.minY += (this.targetBox.minY - this.visualBox.minY) * this.lerpFactor;
            this.visualBox.width += (this.targetBox.width - this.visualBox.width) * this.lerpFactor;
            this.visualBox.height += (this.targetBox.height - this.visualBox.height) * this.lerpFactor;
            this.visualBox.maxX = this.visualBox.minX + this.visualBox.width;
            this.visualBox.maxY = this.visualBox.minY + this.visualBox.height;

            // 보간된 중간값으로 UI 갱신
            this.drawSelectionOverlay(this.visualBox);

            if (this.checkDifference()) {
                this.animId = requestAnimationFrame(loop);
            } else {
                // 수렴 완료 시 물리 목표값으로 스냅 고정
                this.visualBox = { ...this.targetBox };
                this.drawSelectionOverlay(this.visualBox);
                this.isAnimRunning = false;
            }
        };

        this.animId = requestAnimationFrame(loop);
    }

    drawSelectionOverlay(box) {
        if (this.selectionOverlay) {
            this.workspace.removeChild(this.selectionOverlay);
            this.selectionOverlay = null;
        }

        this.selectionOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.selectionOverlay.setAttribute('class', 'selection-ui-layer');

        if (this.state.selectedShapes.length === 1) {
            const shape = this.state.selectedShapes[0];
            const handler = HandlerFactory.getHandler(shape.type);
            handler.renderUI(this.selectionOverlay, shape, this.isRotating, this.currentDeltaAngle, this.rotationCenter, box);
        } else {
            const handler = HandlerFactory.getHandler('group');
            handler.renderUI(this.selectionOverlay, this.state.selectedShapes, this.isRotating, this.currentDeltaAngle, this.rotationCenter, box);
        }

        this.workspace.appendChild(this.selectionOverlay);
    }

    clearSelectionOverlay() {
        if (this.selectionOverlay) {
            this.workspace.removeChild(this.selectionOverlay);
            this.selectionOverlay = null;
        }
        this.visualBox = null;
        this.targetBox = null;
        this.isAnimRunning = false;
        if (this.animId) cancelAnimationFrame(this.animId);
    }

    prepareRotation(pos) {
        this.initialBoundingBox = this.getSelectionBoundingBox();
        BaseShape.prepareGroupSnapshot(this.state.selectedShapes);

        if (this.state.selectedShapes.length === 1) {
            this.rotationCenter = {
                x: this.state.selectedShapes[0]._tempStartCx,
                y: this.state.selectedShapes[0]._tempStartCy
            };
        } else {
            this.rotationCenter = {
                x: this.initialBoundingBox.minX + this.initialBoundingBox.width / 2,
                y: this.initialBoundingBox.minY + this.initialBoundingBox.height / 2
            };
        }

        this.initialAngle = Math.atan2(pos.y - this.rotationCenter.y, pos.x - this.rotationCenter.x) * (180 / Math.PI);
    }

    applyRotation(pos, isShift) {
        const currentMouseAngle = Math.atan2(pos.y - this.rotationCenter.y, pos.x - this.rotationCenter.x) * (180 / Math.PI);
        let deltaAngle = currentMouseAngle - this.initialAngle;

        if (isShift) {
            deltaAngle = Math.round(deltaAngle / 15) * 15;
        }

        BaseShape.rotateGroup(this.state.selectedShapes, deltaAngle, this.rotationCenter);
        this.currentDeltaAngle = deltaAngle;
        this.renderSelectionUI();
    }

    applyMove(pos) {
        const dx = pos.x - this.moveStart.x;
        const dy = pos.y - this.moveStart.y;
        BaseShape.moveGroup(this.state.selectedShapes, dx, dy);
        this.moveStart = pos;
        this.renderSelectionUI();
    }

    applyResize(pos, isShift) {
        const shape = this.state.selectedShapes[0];
        const localPos = this.getInverseTransformedPoint(pos, shape);
        shape.resize(this.resizeHandleIndex, localPos.x, localPos.y, isShift);
        this.renderSelectionUI();
    }

    syncFinalTransforms() {
        this.state.selectedShapes.forEach(shape => {
            const currentTransform = shape.element.getAttribute('transform') || '';
            const match = currentTransform.match(/rotate\(([-\d.]+)/);
            shape._lastRotation = match ? parseFloat(match[1]) : 0;
        });
        console.log(`[SELECT-TOOL] 조작 완료 - 최종 트랜스폼 동기화 완료`);
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

    getSelectionBoundingBox() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.state.selectedShapes.forEach(shape => {
            const rotatedPoints = this.getRotatedPoints(shape);
            rotatedPoints.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });
        });
        return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
    }

    isPointInSelectionBox(pos) {
        if (!this.selectionOverlay || this.state.selectedShapes.length === 0) return false;
        const padding = 5;
        const box = this.visualBox || this.getSelectionBoundingBox();

        if (this.state.selectedShapes.length === 1) {
            const shape = this.state.selectedShapes[0];
            const handler = HandlerFactory.getHandler(shape.type);
            return handler.containsPoint(pos, shape, padding, this.currentDeltaAngle, this.isRotating, this.rotationCenter, box);
        } else {
            const handler = HandlerFactory.getHandler('group');
            return handler.containsPoint(pos, this.state.selectedShapes, padding, this.currentDeltaAngle, this.isRotating, this.rotationCenter, box);
        }
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

        const widthAttr = this.marqueeElement.getAttribute('width');
        const heightAttr = this.marqueeElement.getAttribute('height');

        if (!widthAttr || !heightAttr || parseFloat(widthAttr) === 0 || parseFloat(heightAttr) === 0) {
            this.workspace.removeChild(this.marqueeElement);
            this.marqueeElement = null;
            this.isMarquee = false;
            return;
        }

        const x = parseFloat(this.marqueeElement.getAttribute('x'));
        const y = parseFloat(this.marqueeElement.getAttribute('y'));
        const width = parseFloat(widthAttr);
        const height = parseFloat(heightAttr);
        const marqueeBox = { minX: x, minY: y, maxX: x + width, maxY: y + height };

        this.state.shapes.forEach(shape => {
            if (this.isShapeInBox(shape, marqueeBox)) {
                if (!this.state.selectedShapes.includes(shape)) {
                    this.state.selectedShapes.push(shape);
                    shape.element.style.filter = 'drop-shadow(0 0 5px #0066cc)';
                }
            }
        });
        
        if (this.state.colorManager) this.state.colorManager.updateUI(this.state.selectedShapes);

        this.workspace.removeChild(this.marqueeElement);
        this.marqueeElement = null;
        this.isMarquee = false;
    }

    isShapeInBox(shape, box) {
        let shapeBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        const rotatedPoints = this.getRotatedPoints(shape); 
        rotatedPoints.forEach(p => {
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
                HistoryManager.getInstance(this.state, this.workspace).saveState();
                this.deleteSelectedShapes();
                this.renderSelectionUI();
                return true;
            }
        }
        if (e.key === 'Shift' && this.lastMousePos) {
            if (this.isResizing) {
                this.applyResize(this.lastMousePos, true);
                return true;
            }
            if (this.isRotating) {
                this.applyRotation(this.lastMousePos, true);
                return true;
            }
        }
        return false;
    }

    handleKeyUp(e) {
        if (e.key === 'Shift' && this.lastMousePos) {
            if (this.isResizing) {
                this.applyResize(this.lastMousePos, false);
                return true;
            }
            if (this.isRotating) {
                this.applyRotation(this.lastMousePos, false);
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
        this.clearSelectionOverlay();
        if (this.state.colorManager) this.state.colorManager.updateUI(this.state.selectedShapes);
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
        if (this.state.colorManager) this.state.colorManager.updateUI(this.state.selectedShapes);
    }

    onDeactivate() {
        this.clearSelection();
        super.onDeactivate();
    }
}