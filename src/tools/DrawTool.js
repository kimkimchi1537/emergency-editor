import { BaseTool } from './BaseTool.js';
import { ShapeFactory } from '../factory/ShapeFactory.js';
import { HistoryManager } from '../managers/HistoryManager.js';

export class DrawTool extends BaseTool {
    constructor(state, workspace, shapeIdCounterRef) {
        super(state, workspace);
        this.shapeIdCounterRef = shapeIdCounterRef;
        console.log(`[CLASS DrawTool] 그리기 도구 초기화 완료`);
    }

    onMouseDown(e) {
        const pos = this.getMousePosition(e);
        this.state.isDrawing = true;
        this.state.startX = pos.x;
        this.state.startY = pos.y;
        
        this.shapeIdCounterRef.value++;
        
        console.log(`[DRAW-TOOL] 신규 ${this.state.currentTool} 생성 시작 | ID: shape_${this.shapeIdCounterRef.value}`);
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
    }

    onMouseMove(e) {
        if (!this.state.isDrawing || !this.state.currentShape) return;
        const pos = this.getMousePosition(e);
        this.state.currentShape.update(pos.x, pos.y, e.shiftKey);
    }

    onMouseUp(e) {
        if (!this.state.isDrawing) return;
        
        if (this.state.currentShape) {
            // [HISTORY] 도형이 최종적으로 그려지기 직전에 상태 저장
            HistoryManager.getInstance(this.state, this.workspace).saveState();
            
            this.state.shapes.push(this.state.currentShape);
            console.log(`[DRAW-TOOL] 드로잉 완료 및 데이터 저장 (총 ${this.state.shapes.length}개)`);
        }
        
        this.state.isDrawing = false;
        this.state.currentShape = null;
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        if (key === 'escape') {
            console.log(`[DRAW-TOOL-KEY] Escape 감지 - 현재 드로잉 취소 시도`);
            if (this.state.isDrawing && this.state.currentShape) {
                if (this.state.currentShape.element && this.state.currentShape.element.parentNode) {
                    this.state.currentShape.element.parentNode.removeChild(this.state.currentShape.element);
                }
                this.state.isDrawing = false;
                this.state.currentShape = null;
                console.log(`[DRAW-TOOL] 작업이 취소되었습니다.`);
                return true;
            }
        }
        return false;
    }
}