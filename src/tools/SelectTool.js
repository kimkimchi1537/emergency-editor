import { BaseTool } from './BaseTool.js';
import { HistoryManager } from '../managers/HistoryManager.js';
import { HandlerFactory } from '../factory/HandlerFactory.js';
import { ShapeFactory } from '../factory/ShapeFactory.js';
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

        console.log(`[CLASS SelectTool] 선택 도구 초기화 | 컨텍스트 메뉴 및 그룹화 로직 지원 완료`);
    }

    onActivate() {
        console.log(`[SELECT-TOOL] 도구 활성화 생명주기 진입 | 선택 대기열 큐(Queue) 확인 시작`);
        
        if (this.state.selectionQueue && this.state.selectionQueue.length > 0) {
            this.clearSelection(); 
            while (this.state.selectionQueue.length > 0) {
                const targetShape = this.state.selectionQueue.shift(); 
                if (this.state.shapes.includes(targetShape)) {
                    this.state.selectedShapes.push(targetShape);
                    targetShape.element.style.filter = 'drop-shadow(0 0 5px #0066cc)'; 
                }
            }
            if (this.state.colorManager) this.state.colorManager.updateUI(this.state.selectedShapes);
        }

        if (this.state.selectedShapes.length > 0) {
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
        if (e.button === 2) return; // 우클릭(컨텍스트 메뉴) 방해 금지

        const pos = this.getMousePosition(e);
        const isShift = e.shiftKey;
        this.lastMousePos = pos;
        
        if (this.state.selectedShapes.length === 1 && e.target.classList.contains('resize-handle')) {
            const index = parseInt(e.target.getAttribute('data-index'), 10);
            HistoryManager.getInstance(this.state, this.workspace).saveState();
            this.isResizing = true;
            this.resizeHandleIndex = index;
            this.renderSelectionUI();
            return;
        }

        if (this.state.selectedShapes.length > 0 && e.target.classList.contains('rotate-handle')) {
            HistoryManager.getInstance(this.state, this.workspace).saveState();
            this.isRotating = true;
            this.prepareRotation(pos);
            this.renderSelectionUI();
            return;
        }

        if (this.state.selectedShapes.length > 0 && this.isPointInSelectionBox(pos)) {
            HistoryManager.getInstance(this.state, this.workspace).saveState();
            this.isMoving = true;
            this.moveStart = pos;
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
        if (e.button === 2) return;

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
            this.renderSelectionUI();
        }
    }

    onContextMenu(e) {
        const cm = document.getElementById('context-menu');
        const btnGroup = document.getElementById('menu-group');
        const btnUngroup = document.getElementById('menu-ungroup');
        
        if (!cm || !btnGroup || !btnUngroup) return;

        cm.style.display = 'none';
        btnGroup.style.display = 'none';
        btnUngroup.style.display = 'none';

        const hasMultiple = this.state.selectedShapes.length > 1;
        const hasGroup = this.state.selectedShapes.length === 1 && this.state.selectedShapes[0].type === 'group';

        if (!hasMultiple && !hasGroup) return; 

        cm.style.left = `${e.clientX}px`;
        cm.style.top = `${e.clientY}px`;
        cm.style.display = 'block';

        if (hasMultiple) {
            btnGroup.style.display = 'block';
            btnGroup.onclick = () => {
                cm.style.display = 'none';
                this.groupSelected();
            };
        }

        if (hasGroup) {
            btnUngroup.style.display = 'block';
            btnUngroup.onclick = () => {
                cm.style.display = 'none';
                this.ungroupSelected();
            };
        }
    }

    groupSelected() {
        if (this.state.selectedShapes.length < 2) return;
        HistoryManager.getInstance(this.state, this.workspace).saveState();

        const groupId = 'group_' + Date.now();
        const children = [...this.state.selectedShapes];
        
        const groupShape = ShapeFactory.createGroup(groupId, children);
        
        children.forEach(child => {
            const idx = this.state.shapes.indexOf(child);
            if (idx > -1) this.state.shapes.splice(idx, 1);
        });

        this.state.shapes.push(groupShape);
        this.workspace.appendChild(groupShape.element);

        this.clearSelection();
        this.state.selectedShapes.push(groupShape);
        groupShape.element.style.filter = 'drop-shadow(0 0 5px #0066cc)';
        this.renderSelectionUI();
        console.log(`[SELECT-TOOL] 영구 그룹화 완료 | ${children.length}개 도형 -> ${groupId}`);
    }

    ungroupSelected() {
        if (this.state.selectedShapes.length !== 1 || this.state.selectedShapes[0].type !== 'group') return;
        HistoryManager.getInstance(this.state, this.workspace).saveState();

        const groupShape = this.state.selectedShapes[0];
        const children = [...groupShape.children];

        // 그룹에 회전이 걸려있었다면 해제 전에 수학적 연산으로 자식들에게 회전값을 영구 적용(Baking)
        this.bakeGroupTransform(groupShape);

        const idx = this.state.shapes.indexOf(groupShape);
        if (idx > -1) this.state.shapes.splice(idx, 1);
        if (groupShape.element.parentNode) {
            groupShape.element.parentNode.removeChild(groupShape.element);
        }

        this.clearSelection();

        children.forEach(child => {
            this.state.shapes.push(child);
            this.workspace.appendChild(child.element);
            this.state.selectedShapes.push(child);
            child.element.style.filter = 'drop-shadow(0 0 5px #0066cc)';
        });

        this.renderSelectionUI();
        console.log(`[SELECT-TOOL] 영구 그룹 해제 완료 | ${children.length}개 독립 도형으로 복원`);
    }

    bakeGroupTransform(groupShape) {
        const currentTransform = groupShape.element.getAttribute('transform') || '';
        const match = currentTransform.match(/rotate\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/);
        if (!match) return; 

        console.log(`[SELECT-TOOL] 그룹 해제 중 회전 속성 감지 - 자식 요소에 좌표/회전 베이킹(Baking) 수행`);

        const gAngleDeg = parseFloat(match[1]);
        const gCx = parseFloat(match[2]);
        const gCy = parseFloat(match[3]);
        const gAngleRad = gAngleDeg * (Math.PI / 180);
        const cosA = Math.cos(gAngleRad);
        const sinA = Math.sin(gAngleRad);

        const rotatePoint = (x, y) => {
            const dx = x - gCx;
            const dy = y - gCy;
            return {
                x: gCx + dx * cosA - dy * sinA,
                y: gCy + dx * sinA + dy * cosA
            };
        };

        groupShape.children.forEach(child => {
            child.points.forEach(p => {
                const rp = rotatePoint(p.x, p.y);
                p.x = rp.x;
                p.y = rp.y;
            });

            const cTransform = child.element.getAttribute('transform') || '';
            const cMatch = cTransform.match(/rotate\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/);
            let cAngle = 0, cCx = 0, cCy = 0;
            
            if (cMatch) {
                cAngle = parseFloat(cMatch[1]);
                cCx = parseFloat(cMatch[2]);
                cCy = parseFloat(cMatch[3]);
                const rcCenter = rotatePoint(cCx, cCy);
                cCx = rcCenter.x;
                cCy = rcCenter.y;
            } else {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                child.points.forEach(p => {
                    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
                    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
                });
                cCx = minX + (maxX - minX) / 2;
                cCy = minY + (maxY - minY) / 2;
            }

            const newCAngle = cAngle + gAngleDeg;
            child.updateAttributes();
            
            if (newCAngle !== 0) {
                child.element.setAttribute('transform', `rotate(${newCAngle}, ${cCx}, ${cCy})`);
            } else {
                child.element.removeAttribute('transform');
            }
        });

        groupShape.element.removeAttribute('transform');
    }

    renderSelectionUI() {
        if (this.state.selectedShapes.length === 0) {
            this.clearSelectionOverlay();
            return;
        }

        if (this.isMoving || this.isRotating || this.isResizing) {
            if (this.selectionOverlay) {
                this.clearSelectionOverlay();
            }
            return;
        }

        let newTarget;
        if (this.state.selectedShapes.length === 1) {
            newTarget = HandlerFactory.getHandler(this.state.selectedShapes[0].type).getBox(this.state.selectedShapes[0]);
        } else {
            newTarget = this.getSelectionBoundingBox();
        }

        if (!this.visualBox) {
            this.visualBox = { ...newTarget };
        }
        this.targetBox = newTarget;

        if (!this.isAnimRunning && this.checkDifference()) {
            this.startAnimLoop();
        }

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

            this.visualBox.minX += (this.targetBox.minX - this.visualBox.minX) * this.lerpFactor;
            this.visualBox.minY += (this.targetBox.minY - this.visualBox.minY) * this.lerpFactor;
            this.visualBox.width += (this.targetBox.width - this.visualBox.width) * this.lerpFactor;
            this.visualBox.height += (this.targetBox.height - this.visualBox.height) * this.lerpFactor;
            this.visualBox.maxX = this.visualBox.minX + this.visualBox.width;
            this.visualBox.maxY = this.visualBox.minY + this.visualBox.height;

            this.drawSelectionOverlay(this.visualBox);

            if (this.checkDifference()) {
                this.animId = requestAnimationFrame(loop);
            } else {
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
        const cm = document.getElementById('context-menu');
        if (cm) cm.style.display = 'none';
        super.onDeactivate();
    }
}