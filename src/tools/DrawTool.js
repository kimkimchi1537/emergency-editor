import { BaseTool } from './BaseTool.js';
import { ShapeFactory } from '../factory/ShapeFactory.js';
import { HistoryManager } from '../managers/HistoryManager.js';

export class DrawTool extends BaseTool {
    constructor(state, workspace, shapeIdCounterRef) {
        super(state, workspace);
        this.shapeIdCounterRef = shapeIdCounterRef;
        console.log(`[CLASS DrawTool] 그리기 도구 초기화 완료 (Click-to-Click 방식 적용)`);
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
            
            console.log(`[DRAW-TOOL] 신규 ${this.state.currentTool} 생성 시작 (첫 번째 클릭) | ID: shape_${this.shapeIdCounterRef.value}`);
            const shape = ShapeFactory.createShape(
                this.state.currentTool,
                `shape_${this.shapeIdCounterRef.value}`,
                this.state.startX,
                this.state.startY,
                this.state.currentStrokeWidth
            );

            if (shape) {
                this.state.currentShape = shape;
                this.workspace.appendChild(shape.element);
                console.log(`[DRAW-TOOL] 워크스페이스에 SVG 엘리먼트 부착 성공`);
            }
        } else {
            console.log(`[DRAW-TOOL] 도형 완성 확정 (두 번째 클릭)`);
            if (this.state.currentShape) {
                this.state.currentShape.update(pos.x, pos.y, e.shiftKey);
                HistoryManager.getInstance(this.state, this.workspace).saveState();
                this.state.shapes.push(this.state.currentShape);
                console.log(`[DRAW-TOOL] 드로잉 완료 및 데이터 저장 (총 ${this.state.shapes.length}개)`);
            }
            
            this.state.isDrawing = false;
            this.state.currentShape = null;
            this.lastMousePos = null;
        }
    }

    onMouseMove(e) {
        if (!this.state.isDrawing || !this.state.currentShape) return;
        const pos = this.getMousePosition(e);
        this.lastMousePos = pos;
        this.state.currentShape.update(pos.x, pos.y, e.shiftKey);
    }

    onMouseUp(e) {
        console.log(`[DRAW-TOOL] 마우스업 무시 (Click-to-Click 방식 적용됨)`);
    }

    cancelDrawing() {
        if (!this.state.isDrawing) return;
        console.log(`[DRAW-TOOL] 작업 취소 요청 (ESC/우클릭)`);
        if (this.state.currentShape && this.state.currentShape.element && this.state.currentShape.element.parentNode) {
            this.state.currentShape.element.parentNode.removeChild(this.state.currentShape.element);
        }
        this.state.isDrawing = false;
        this.state.currentShape = null;
        this.lastMousePos = null;
        console.log(`[DRAW-TOOL] 작업이 정상적으로 취소되었습니다.`);
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        if (key === 'escape') {
            console.log(`[DRAW-TOOL-KEY] Escape 감지 - 현재 드로잉 취소 시도`);
            this.cancelDrawing();
            return true;
        }
        if (e.key === 'Shift' && this.state.isDrawing && this.state.currentShape && this.lastMousePos) {
            console.log(`[DRAW-TOOL] Shift 눌림 - 실시간 스냅 적용`);
            this.state.currentShape.update(this.lastMousePos.x, this.lastMousePos.y, true);
            return true;
        }
        return false;
    }

    handleKeyUp(e) {
        if (e.key === 'Shift' && this.state.isDrawing && this.state.currentShape && this.lastMousePos) {
            console.log(`[DRAW-TOOL] Shift 뗌 - 실시간 스냅 해제`);
            this.state.currentShape.update(this.lastMousePos.x, this.lastMousePos.y, false);
            return true;
        }
        return false;
    }

    onDeactivate() {
        this.cancelDrawing();
        super.onDeactivate();
    }
}