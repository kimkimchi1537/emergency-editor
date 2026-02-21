import { BaseTool } from './BaseTool.js';
import { ShapeFactory } from '../factory/ShapeFactory.js';
import { HistoryManager } from '../managers/HistoryManager.js';

export class LineTool extends BaseTool {
    constructor(state, workspace, shapeIdCounterRef) {
        super(state, workspace);
        this.shapeIdCounterRef = shapeIdCounterRef;
        this.shapeType = 'line'; // 자신의 역할을 명확하게 하드코딩
        console.log(`[CLASS LineTool] 선 그리기 독립 도구 초기화 완료`);
    }

    onMouseDown(e) {
        if (e.button === 2) {
            this.cancelDrawing();
            return;
        }

        const pos = this.getMousePosition(e);
        this.lastMousePos = pos;

        if (!this.state.isDrawing) {
            this.state.isDrawing = true;
            this.state.startX = pos.x;
            this.state.startY = pos.y;
            
            this.shapeIdCounterRef.value++;
            
            console.log(`[LINE-TOOL] 신규 선 생성 시작 | ID: shape_${this.shapeIdCounterRef.value}`);
            const shape = ShapeFactory.createShape(
                this.shapeType,
                `shape_${this.shapeIdCounterRef.value}`,
                this.state.startX,
                this.state.startY,
                this.state.currentStrokeWidth
            );

            if (shape) {
                this.state.currentShape = shape;
                this.workspace.appendChild(shape.element);
            }
        } else {
            if (this.state.currentShape) {
                this.state.currentShape.update(pos.x, pos.y, e.shiftKey);
                this.completeDrawing();
            }
        }
    }

    onMouseMove(e) {
        if (!this.state.isDrawing || !this.state.currentShape) return;
        const pos = this.getMousePosition(e);
        this.lastMousePos = pos;
        this.state.currentShape.update(pos.x, pos.y, e.shiftKey);
    }

    onMouseUp(e) {
        // Click-to-Click 방식 유지
    }

    completeDrawing() {
        console.log(`[LINE-TOOL] 선 완성 확정 (연속 그리기 대기)`);
        
        HistoryManager.getInstance(this.state, this.workspace).saveState();
        this.state.shapes.push(this.state.currentShape);
        
        if (typeof this.state.requestSelection === 'function') {
            this.state.requestSelection(this.state.currentShape);
        }
        
        // 도구 전환(setTool) 없이 상태만 깔끔하게 비우고 대기 (연속 그리기 적용)
        this.state.isDrawing = false;
        this.state.currentShape = null;
        this.lastMousePos = null;
    }

    cancelDrawing() {
        if (!this.state.isDrawing) return;
        console.log(`[LINE-TOOL] 선 그리기 취소`);
        if (this.state.currentShape && this.state.currentShape.element && this.state.currentShape.element.parentNode) {
            this.state.currentShape.element.parentNode.removeChild(this.state.currentShape.element);
        }
        this.state.isDrawing = false;
        this.state.currentShape = null;
        this.lastMousePos = null;
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        if (key === 'escape') {
            this.cancelDrawing();
            return true;
        }
        if (e.key === 'Shift' && this.state.isDrawing && this.state.currentShape && this.lastMousePos) {
            this.state.currentShape.update(this.lastMousePos.x, this.lastMousePos.y, true);
            return true;
        }
        return false;
    }

    handleKeyUp(e) {
        if (e.key === 'Shift' && this.state.isDrawing && this.state.currentShape && this.lastMousePos) {
            this.state.currentShape.update(this.lastMousePos.x, this.lastMousePos.y, false);
            return true;
        }
        return false;
    }

    onDeactivate() {
        if (this.state.isDrawing) {
            this.cancelDrawing();
        }
        super.onDeactivate();
    }
}