import { BaseTool } from './BaseTool.js';
import { ShapeFactory } from '../factory/ShapeFactory.js';
import { HistoryManager } from '../managers/HistoryManager.js';

export class MultiLineTool extends BaseTool {
    constructor(state, workspace, shapeIdCounterRef) {
        super(state, workspace);
        this.shapeIdCounterRef = shapeIdCounterRef;
    }

    onMouseDown(e) {
        if (e.button === 2) { this.cancelDrawing(); return; }
        const pos = this.getMousePosition(e); this.lastMousePos = pos;
        if (!this.state.isDrawing) {
            this.state.isDrawing = true; this.shapeIdCounterRef.value++;
            const shape = ShapeFactory.createShape('multiline', `shape_${this.shapeIdCounterRef.value}`, pos.x, pos.y, this.state.currentStrokeWidth, this.state.currentStrokeColor, this.state.currentFillColor, { opacity: this.state.currentOpacity });
            if (shape) { this.state.currentShape = shape; this.workspace.appendChild(shape.element); }
        } else { if (this.state.currentShape) this.state.currentShape.addPoint(pos.x, pos.y); }
    }

    onMouseMove(e) {
        if (!this.state.isDrawing || !this.state.currentShape) return;
        const pos = this.getMousePosition(e); this.lastMousePos = pos;
        this.state.currentShape.update(pos.x, pos.y, e.shiftKey);
    }

    onMouseUp(e) {}

    completeDrawing() {
        if (!this.state.isDrawing || !this.state.currentShape) return;
        this.state.isDrawing = false; const targetShape = this.state.currentShape; this.state.currentShape = null; this.lastMousePos = null;
        targetShape.finish(); 
        
        if (targetShape.points.length >= 2) {
            HistoryManager.getInstance(this.state, this.workspace).saveState();
            this.state.shapes.push(targetShape);
            if (typeof this.state.requestSelection === 'function') this.state.requestSelection(targetShape);
            if (typeof this.state.setTool === 'function') this.state.setTool('select');
            if (this.state.renderLayers) this.state.renderLayers(); // [추가] 레이어 렌더링 훅
        } else {
            if (targetShape.element && targetShape.element.parentNode) targetShape.element.parentNode.removeChild(targetShape.element);
        }
    }

    cancelDrawing() {
        if (!this.state.isDrawing) return;
        if (this.state.currentShape && this.state.currentShape.element && this.state.currentShape.element.parentNode) this.state.currentShape.element.parentNode.removeChild(this.state.currentShape.element);
        this.state.isDrawing = false; this.state.currentShape = null; this.lastMousePos = null;
    }

    handleUndo() {
        if (this.state.isDrawing && this.state.currentShape) {
            const removed = this.state.currentShape.removeLastFixedPoint();
            if (!removed) this.cancelDrawing();
            else if (this.lastMousePos) this.state.currentShape.update(this.lastMousePos.x, this.lastMousePos.y, false);
            return true;
        }
        return false;
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase(); if (key === 'enter') { this.completeDrawing(); return true; }
        if (key === 'escape') { this.cancelDrawing(); return true; }
        if (e.key === 'Shift' && this.state.isDrawing && this.state.currentShape && this.lastMousePos) { this.state.currentShape.update(this.lastMousePos.x, this.lastMousePos.y, true); return true; }
        return false;
    }

    handleKeyUp(e) {
        if (e.key === 'Shift' && this.state.isDrawing && this.state.currentShape && this.lastMousePos) { this.state.currentShape.update(this.lastMousePos.x, this.lastMousePos.y, false); return true; }
        return false;
    }

    onDeactivate() { if (this.state.isDrawing) this.cancelDrawing(); super.onDeactivate(); }
}