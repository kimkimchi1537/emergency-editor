import { BaseTool } from './BaseTool.js';
import { ShapeFactory } from '../factory/ShapeFactory.js';
import { HistoryManager } from '../managers/HistoryManager.js';

export class LineTool extends BaseTool {
    constructor(state, workspace, shapeIdCounterRef) {
        super(state, workspace);
        this.shapeIdCounterRef = shapeIdCounterRef;
        this.shapeType = 'line';
    }

    onMouseDown(e) {
        if (e.button === 2) { this.cancelDrawing(); return; }
        const pos = this.getMousePosition(e); this.lastMousePos = pos;
        if (!this.state.isDrawing) {
            this.state.isDrawing = true; this.state.startX = pos.x; this.state.startY = pos.y; this.shapeIdCounterRef.value++;
            const shape = ShapeFactory.createShape(this.shapeType, `shape_${this.shapeIdCounterRef.value}`, this.state.startX, this.state.startY, this.state.currentStrokeWidth, this.state.currentStrokeColor, this.state.currentFillColor, { opacity: this.state.currentOpacity });
            if (shape) { this.state.currentShape = shape; this.workspace.appendChild(shape.element); }
        } else {
            if (this.state.currentShape) { this.state.currentShape.update(pos.x, pos.y, e.shiftKey); this.completeDrawing(); }
        }
    }

    onMouseMove(e) {
        if (!this.state.isDrawing || !this.state.currentShape) return;
        const pos = this.getMousePosition(e); this.lastMousePos = pos;
        this.state.currentShape.update(pos.x, pos.y, e.shiftKey);
    }

    onMouseUp(e) {}

    completeDrawing() {
        HistoryManager.getInstance(this.state, this.workspace).saveState();
        this.state.shapes.push(this.state.currentShape);
        if (typeof this.state.requestSelection === 'function') this.state.requestSelection(this.state.currentShape);
        this.state.isDrawing = false; this.state.currentShape = null; this.lastMousePos = null;
        if (this.state.renderLayers) this.state.renderLayers(); // [추가] 레이어 렌더링 훅
    }

    cancelDrawing() {
        if (!this.state.isDrawing) return;
        if (this.state.currentShape && this.state.currentShape.element && this.state.currentShape.element.parentNode) this.state.currentShape.element.parentNode.removeChild(this.state.currentShape.element);
        this.state.isDrawing = false; this.state.currentShape = null; this.lastMousePos = null;
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase(); if (key === 'escape') { this.cancelDrawing(); return true; }
        if (e.key === 'Shift' && this.state.isDrawing && this.state.currentShape && this.lastMousePos) { this.state.currentShape.update(this.lastMousePos.x, this.lastMousePos.y, true); return true; }
        return false;
    }

    handleKeyUp(e) {
        if (e.key === 'Shift' && this.state.isDrawing && this.state.currentShape && this.lastMousePos) { this.state.currentShape.update(this.lastMousePos.x, this.lastMousePos.y, false); return true; }
        return false;
    }

    onDeactivate() { if (this.state.isDrawing) this.cancelDrawing(); super.onDeactivate(); }
}