import { BaseTool } from './BaseTool.js';
import { HistoryManager } from '../managers/HistoryManager.js';
import { HandlerFactory } from '../factory/HandlerFactory.js';
import { ShapeFactory } from '../factory/ShapeFactory.js';
import { BaseShape } from '../shapes/BaseShape.js';

export class SelectTool extends BaseTool {
    constructor(state, workspace) {
        super(state, workspace);
        this.isMarquee = false; this.isRotating = false; this.isMoving = false; this.isResizing = false;
        this.resizeHandleIndex = -1; this.marqueeStart = { x: 0, y: 0 }; this.moveStart = { x: 0, y: 0 };
        this.marqueeElement = null; this.selectionOverlay = null; this.rotationCenter = { x: 0, y: 0 };
        this.initialAngle = 0; this.currentDeltaAngle = 0; this.visualBox = null; this.targetBox = null;
        this.isAnimRunning = false; this.lerpFactor = 0.18; this.animThreshold = 0.05;
    }
    
    // [신규] 선 굵기 및 UI 동기화를 담당하는 통합 헬퍼 함수
    syncStateUI() {
        if (this.state.colorManager) this.state.colorManager.updateUI(this.state.selectedShapes);
        
        if (this.state.selectedShapes.length === 1) {
            const strokeInput = document.getElementById('stroke-width-input');
            if (strokeInput && this.state.selectedShapes[0].strokeWidth !== undefined) {
                strokeInput.value = this.state.selectedShapes[0].strokeWidth;
                this.state.currentStrokeWidth = this.state.selectedShapes[0].strokeWidth;
                console.log(`[SELECT-TOOL] 📏 선 굵기 UI 동기화 완료: ${this.state.currentStrokeWidth}`);
            }
        }
        
        if (this.state.renderLayers) this.state.renderLayers();
    }

    onActivate() {
        if (this.state.selectionQueue && this.state.selectionQueue.length > 0) {
            this.clearSelection(); 
            while (this.state.selectionQueue.length > 0) {
                const targetShape = this.state.selectionQueue.shift(); 
                if (this.state.shapes.includes(targetShape)) {
                    this.state.selectedShapes.push(targetShape); 
                }
            }
            this.syncStateUI(); // [수정] 통합 UI 동기화 호출
        }
        if (this.state.selectedShapes.length > 0) this.renderSelectionUI();
    }
    
    getInverseTransformedPoint(pos, shape) {
        const match = (shape.element.getAttribute('transform') || '').match(/rotate\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/);
        if (!match) return { x: pos.x, y: pos.y };
        const angleRad = -parseFloat(match[1]) * (Math.PI / 180); const cx = parseFloat(match[2]); const cy = parseFloat(match[3]);
        const dx = pos.x - cx; const dy = pos.y - cy;
        return { x: cx + dx * Math.cos(angleRad) - dy * Math.sin(angleRad), y: cy + dx * Math.sin(angleRad) + dy * Math.cos(angleRad) };
    }
    
    onMouseDown(e) {
        if (e.button === 2) return;
        const pos = this.getMousePosition(e); const isShift = e.shiftKey; this.lastMousePos = pos;
        if (this.state.selectedShapes.length === 1 && e.target.classList.contains('resize-handle')) {
            HistoryManager.getInstance(this.state, this.workspace).saveState();
            this.isResizing = true; this.resizeHandleIndex = parseInt(e.target.getAttribute('data-index'), 10);
            this.renderSelectionUI(); return;
        }
        if (this.state.selectedShapes.length > 0 && e.target.classList.contains('rotate-handle')) {
            HistoryManager.getInstance(this.state, this.workspace).saveState();
            this.isRotating = true; this.prepareRotation(pos); this.renderSelectionUI(); return;
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
            if (this.state.shapes[i].isLocked) continue; // [신규] 잠긴 도형은 캔버스에서 클릭 감지 제외
            const localPos = this.getInverseTransformedPoint(pos, this.state.shapes[i]);
            if (this.state.shapes[i].containsPoint(localPos.x, localPos.y)) {
                clickedShape = this.state.shapes[i];
                break;
            }
        }

        if (clickedShape) {
            if (this.state.selectedShapes.includes(clickedShape) && !isShift) {
                HistoryManager.getInstance(this.state, this.workspace).saveState();
                this.isMoving = true; this.moveStart = pos; this.renderSelectionUI(); return;
            }
            if (isShift) {
                const index = this.state.selectedShapes.indexOf(clickedShape);
                if (index > -1) { 
                    this.state.selectedShapes.splice(index, 1); 
                } else { 
                    this.state.selectedShapes.push(clickedShape); 
                }
            } else {
                this.clearSelection(); 
                this.state.selectedShapes.push(clickedShape); 
            }
            this.currentDeltaAngle = 0; this.renderSelectionUI();
            
            this.syncStateUI(); // [수정] 통합 UI 동기화 호출
        } else { 
            if (!isShift) this.clearSelection(); 
            this.startMarquee(pos); 
        }
    }

    onMouseMove(e) {
        const pos = this.getMousePosition(e); this.lastMousePos = pos;
        if (this.isResizing) { this.applyResize(pos, e.shiftKey); return; }
        if (this.isRotating) { this.applyRotation(pos, e.shiftKey); this.workspace.style.cursor = 'grabbing'; return; }
        if (this.isMoving) { this.applyMove(pos); this.workspace.style.cursor = 'move'; return; }
        
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
            if (this.state.shapes[i].isLocked) continue; // [신규] 잠긴 도형은 마우스 오버(Hover) 감지에서도 제외
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
        if (this.isResizing) { this.isResizing = false; this.resizeHandleIndex = -1; actionCompleted = true; }
        if (this.isRotating) { this.isRotating = false; actionCompleted = true; }
        if (this.isMoving) { this.isMoving = false; actionCompleted = true; }
        if (this.isMarquee) { this.endMarquee(); this.currentDeltaAngle = 0; actionCompleted = true; }
        if (actionCompleted) this.renderSelectionUI();
    }
    
    onContextMenu(e) {
        const cm = document.getElementById('context-menu'); const btnGroup = document.getElementById('menu-group'); const btnUngroup = document.getElementById('menu-ungroup');
        if (!cm || !btnGroup || !btnUngroup) return;
        cm.style.display = 'none'; btnGroup.style.display = 'none'; btnUngroup.style.display = 'none';
        const hasMultiple = this.state.selectedShapes.length > 1;
        const hasGroup = this.state.selectedShapes.length === 1 && this.state.selectedShapes[0].type === 'group';
        if (!hasMultiple && !hasGroup) return; 
        cm.style.left = `${e.clientX}px`; cm.style.top = `${e.clientY}px`; cm.style.display = 'block';
        if (hasMultiple) { btnGroup.style.display = 'block'; btnGroup.onclick = () => { cm.style.display = 'none'; this.groupSelected(); }; }
        if (hasGroup) { btnUngroup.style.display = 'block'; btnUngroup.onclick = () => { cm.style.display = 'none'; this.ungroupSelected(); }; }
    }
    
    groupSelected() {
        if (this.state.selectedShapes.length < 2) return;
        HistoryManager.getInstance(this.state, this.workspace).saveState();
        const children = [...this.state.selectedShapes];
        const groupShape = ShapeFactory.createGroup('group_' + Date.now(), children);
        children.forEach(child => { const idx = this.state.shapes.indexOf(child); if (idx > -1) this.state.shapes.splice(idx, 1); });
        this.state.shapes.push(groupShape); this.workspace.appendChild(groupShape.element);
        this.clearSelection(); this.state.selectedShapes.push(groupShape);
        this.renderSelectionUI();
        if (this.state.renderLayers) this.state.renderLayers();
    }

    ungroupSelected() {
        if (this.state.selectedShapes.length !== 1 || this.state.selectedShapes[0].type !== 'group') return;
        HistoryManager.getInstance(this.state, this.workspace).saveState();
        const groupShape = this.state.selectedShapes[0];
        const children = [...groupShape.children];

        const idx = this.state.shapes.indexOf(groupShape);
        if (idx > -1) this.state.shapes.splice(idx, 1);
        if (groupShape.element.parentNode) groupShape.element.parentNode.removeChild(groupShape.element);

        this.clearSelection();
        children.forEach(child => {
            this.state.shapes.push(child);
            this.workspace.appendChild(child.element);
            this.state.selectedShapes.push(child);
        });
        this.renderSelectionUI();
        if (this.state.renderLayers) this.state.renderLayers();
    }

    renderSelectionUI() {
        if (this.state.selectedShapes.length === 0) { this.clearSelectionOverlay(); return; }
        if (this.isMoving || this.isRotating || this.isResizing) { if (this.selectionOverlay) this.clearSelectionOverlay(); return; }
        let newTarget = this.state.selectedShapes.length === 1 ? HandlerFactory.getHandler(this.state.selectedShapes[0].type).getBox(this.state.selectedShapes[0]) : this.getSelectionBoundingBox();
        if (!this.visualBox) this.visualBox = { ...newTarget };
        this.targetBox = newTarget;
        if (!this.isAnimRunning && this.checkDifference()) this.startAnimLoop();
        if (!this.isAnimRunning) this.drawSelectionOverlay(this.visualBox);
    }
    
    checkDifference() {
        if (!this.visualBox || !this.targetBox) return false;
        return Math.abs(this.visualBox.minX - this.targetBox.minX) > this.animThreshold || Math.abs(this.visualBox.minY - this.targetBox.minY) > this.animThreshold || Math.abs(this.visualBox.width - this.targetBox.width) > this.animThreshold || Math.abs(this.visualBox.height - this.targetBox.height) > this.animThreshold;
    }
    
    startAnimLoop() {
        if (this.isAnimRunning) return;
        this.isAnimRunning = true;
        const loop = () => {
            if (!this.isAnimRunning || !this.targetBox || !this.visualBox) return;
            this.visualBox.minX += (this.targetBox.minX - this.visualBox.minX) * this.lerpFactor; this.visualBox.minY += (this.targetBox.minY - this.visualBox.minY) * this.lerpFactor;
            this.visualBox.width += (this.targetBox.width - this.visualBox.width) * this.lerpFactor; this.visualBox.height += (this.targetBox.height - this.visualBox.height) * this.lerpFactor;
            this.visualBox.maxX = this.visualBox.minX + this.visualBox.width; this.visualBox.maxY = this.visualBox.minY + this.visualBox.height;
            this.drawSelectionOverlay(this.visualBox);
            if (this.checkDifference()) this.animId = requestAnimationFrame(loop);
            else { this.visualBox = { ...this.targetBox }; this.drawSelectionOverlay(this.visualBox); this.isAnimRunning = false; }
        };
        this.animId = requestAnimationFrame(loop);
    }
    
    drawSelectionOverlay(box) {
        if (this.selectionOverlay) { this.workspace.removeChild(this.selectionOverlay); this.selectionOverlay = null; }
        this.selectionOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.selectionOverlay.setAttribute('class', 'selection-ui-layer');
        if (this.state.selectedShapes.length === 1) HandlerFactory.getHandler(this.state.selectedShapes[0].type).renderUI(this.selectionOverlay, this.state.selectedShapes[0], this.isRotating, this.currentDeltaAngle, this.rotationCenter, box);
        else HandlerFactory.getHandler('group').renderUI(this.selectionOverlay, this.state.selectedShapes, this.isRotating, this.currentDeltaAngle, this.rotationCenter, box);
        this.workspace.appendChild(this.selectionOverlay);
    }
    
    clearSelectionOverlay() {
        if (this.selectionOverlay) { this.workspace.removeChild(this.selectionOverlay); this.selectionOverlay = null; }
        this.visualBox = null; this.targetBox = null; this.isAnimRunning = false;
        if (this.animId) cancelAnimationFrame(this.animId);
    }
    
    prepareRotation(pos) {
        this.initialBoundingBox = this.getSelectionBoundingBox();
        BaseShape.prepareGroupSnapshot(this.state.selectedShapes);
        if (this.state.selectedShapes.length === 1 && this.state.selectedShapes[0].type !== 'group') {
            this.rotationCenter = { x: this.state.selectedShapes[0]._tempStartCx, y: this.state.selectedShapes[0]._tempStartCy };
        } else {
            this.rotationCenter = { x: this.initialBoundingBox.minX + this.initialBoundingBox.width / 2, y: this.initialBoundingBox.minY + this.initialBoundingBox.height / 2 };
        }
        this.initialAngle = Math.atan2(pos.y - this.rotationCenter.y, pos.x - this.rotationCenter.x) * (180 / Math.PI);
    }
    
    applyRotation(pos, isShift) {
        let deltaAngle = Math.atan2(pos.y - this.rotationCenter.y, pos.x - this.rotationCenter.x) * (180 / Math.PI) - this.initialAngle;
        if (isShift) deltaAngle = Math.round(deltaAngle / 15) * 15;
        BaseShape.rotateGroup(this.state.selectedShapes, deltaAngle, this.rotationCenter);
        this.currentDeltaAngle = deltaAngle; this.renderSelectionUI();
    }
    
    applyMove(pos) {
        const dx = pos.x - this.moveStart.x; const dy = pos.y - this.moveStart.y;
        BaseShape.moveGroup(this.state.selectedShapes, dx, dy);
        this.moveStart = pos; this.renderSelectionUI();
    }
    
    applyResize(pos, isShift) {
        const shape = this.state.selectedShapes[0];
        shape.resize(this.resizeHandleIndex, this.getInverseTransformedPoint(pos, shape).x, this.getInverseTransformedPoint(pos, shape).y, isShift);
        this.renderSelectionUI();
    }
    
    getSelectionBoundingBox() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const getRot = (shape) => {
            const match = (shape.element.getAttribute('transform') || '').match(/rotate\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/);
            let angleRad = 0, cx = 0, cy = 0;
            if (match) { angleRad = parseFloat(match[1]) * (Math.PI / 180); cx = parseFloat(match[2]); cy = parseFloat(match[3]); }
            return shape.points.map(p => {
                if (!match) return { x: p.x, y: p.y };
                const dx = p.x - cx; const dy = p.y - cy;
                return { x: cx + dx * Math.cos(angleRad) - dy * Math.sin(angleRad), y: cy + dx * Math.sin(angleRad) + dy * Math.cos(angleRad) };
            });
        };
        BaseShape.getFlattenedShapes(this.state.selectedShapes).forEach(shape => {
            getRot(shape).forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });
        });
        return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
    }
    
    isPointInSelectionBox(pos) {
        if (!this.selectionOverlay || this.state.selectedShapes.length === 0) return false;
        const box = this.visualBox || this.getSelectionBoundingBox();
        if (this.state.selectedShapes.length === 1) return HandlerFactory.getHandler(this.state.selectedShapes[0].type).containsPoint(pos, this.state.selectedShapes[0], 5, this.currentDeltaAngle, this.isRotating, this.rotationCenter, box);
        return HandlerFactory.getHandler('group').containsPoint(pos, this.state.selectedShapes, 5, this.currentDeltaAngle, this.isRotating, this.rotationCenter, box);
    }
    
    startMarquee(pos) {
        this.isMarquee = true; this.marqueeStart = { x: pos.x, y: pos.y };
        this.marqueeElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.marqueeElement.setAttribute('fill', 'rgba(0, 102, 204, 0.1)'); this.marqueeElement.setAttribute('stroke', '#0066cc');
        this.marqueeElement.setAttribute('stroke-width', '1'); this.marqueeElement.setAttribute('stroke-dasharray', '4');
        this.workspace.appendChild(this.marqueeElement);
    }
    
    updateMarquee(pos) {
        this.marqueeElement.setAttribute('x', Math.min(this.marqueeStart.x, pos.x)); this.marqueeElement.setAttribute('y', Math.min(this.marqueeStart.y, pos.y));
        this.marqueeElement.setAttribute('width', Math.abs(this.marqueeStart.x - pos.x)); this.marqueeElement.setAttribute('height', Math.abs(this.marqueeStart.y - pos.y));
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
            if (shape.isLocked) return; 

            if (this.isShapeInBox(shape, marqueeBox)) {
                if (!this.state.selectedShapes.includes(shape)) {
                    this.state.selectedShapes.push(shape);
                }
            }
        });
        
        this.syncStateUI(); // [수정] 통합 UI 동기화 호출
        this.workspace.removeChild(this.marqueeElement); this.marqueeElement = null; this.isMarquee = false;
    }
    
    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        if (key === 'delete' || key === 'backspace') {
            if (this.state.selectedShapes.length > 0) { HistoryManager.getInstance(this.state, this.workspace).saveState(); this.deleteSelectedShapes(); this.renderSelectionUI(); return true; }
        }
        if (e.key === 'Shift' && this.lastMousePos) {
            if (this.isResizing) { this.applyResize(this.lastMousePos, true); return true; }
            if (this.isRotating) { this.applyRotation(this.lastMousePos, true); return true; }
        }
        return false;
    }
    
    handleKeyUp(e) {
        if (e.key === 'Shift' && this.lastMousePos) {
            if (this.isResizing) { this.applyResize(this.lastMousePos, false); return true; }
            if (this.isRotating) { this.applyRotation(this.lastMousePos, false); return true; }
        }
        return false;
    }
    
    clearSelection() {
        this.state.selectedShapes = []; 
        this.currentDeltaAngle = 0; 
        this.clearSelectionOverlay();
        this.syncStateUI(); // [수정] 통합 UI 동기화 호출
    }
    
    deleteSelectedShapes() {
        this.state.selectedShapes.forEach(shape => {
            if (shape.element && shape.element.parentNode) shape.element.parentNode.removeChild(shape.element);
            const idx = this.state.shapes.indexOf(shape); if (idx > -1) this.state.shapes.splice(idx, 1);
        });
        this.state.selectedShapes = [];
        this.syncStateUI(); // [수정] 통합 UI 동기화 호출
    }
    
    onDeactivate() { this.clearSelection(); const cm = document.getElementById('context-menu'); if (cm) cm.style.display = 'none'; super.onDeactivate(); }
}