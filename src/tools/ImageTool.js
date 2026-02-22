import { BaseTool } from './BaseTool.js';
import { ShapeFactory } from '../factory/ShapeFactory.js';
import { HistoryManager } from '../managers/HistoryManager.js';

export class ImageTool extends BaseTool {
    constructor(state, workspace, shapeIdCounterRef) {
        super(state, workspace);
        this.shapeIdCounterRef = shapeIdCounterRef;
        this.shapeType = 'image';
        console.log(`[CLASS ImageTool] 이미지 삽입 도구 초기화 완료`);
    }

    onMouseDown(e) {
        if (e.button === 2) {
            this.cancelDrawing();
            return;
        }

        // 대기 중인 이미지가 없으면 그리지 않음
        if (!this.state.pendingImageUrl) {
            console.log(`[IMAGE-TOOL] 대기 중인 이미지가 없어 드로잉을 무시합니다.`);
            return;
        }

        const pos = this.getMousePosition(e);
        this.lastMousePos = pos;

        if (!this.state.isDrawing) {
            this.state.isDrawing = true;
            this.state.startX = pos.x;
            this.state.startY = pos.y;
            
            this.shapeIdCounterRef.value++;
            
            console.log(`[IMAGE-TOOL] 이미지 영역 드래그 시작 | ID: shape_${this.shapeIdCounterRef.value}`);
            const shape = ShapeFactory.createShape(
                this.shapeType,
                `shape_${this.shapeIdCounterRef.value}`,
                this.state.startX,
                this.state.startY,
                this.state.currentStrokeWidth,
                this.state.currentStrokeColor,
                this.state.currentFillColor,
                { 
                    imageUrl: this.state.pendingImageUrl,
                    opacity: this.state.currentOpacity 
                }
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
        // 드래그 방식 적용
        if (this.state.isDrawing && this.state.currentShape) {
            this.completeDrawing();
        }
    }

    completeDrawing() {
        console.log(`[IMAGE-TOOL] 이미지 배치 완료 (레이어 추가 호출)`);
        
        HistoryManager.getInstance(this.state, this.workspace).saveState();
        this.state.shapes.push(this.state.currentShape);
        
        if (typeof this.state.requestSelection === 'function') {
            this.state.requestSelection(this.state.currentShape);
        }
        
        this.state.isDrawing = false;
        this.state.currentShape = null;
        this.lastMousePos = null;
        
        // 이미지 배치가 끝나면 자동으로 선택(Select) 툴로 전환
        if (this.state.setTool) {
            this.state.setTool('select');
        }

        // 레이어 렌더링 훅
        if (this.state.renderLayers) this.state.renderLayers();
    }

    cancelDrawing() {
        if (!this.state.isDrawing) return;
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