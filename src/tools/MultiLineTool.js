import { BaseTool } from './BaseTool.js';
import { ShapeFactory } from '../factory/ShapeFactory.js';
import { HistoryManager } from '../managers/HistoryManager.js';

export class MultiLineTool extends BaseTool {
    constructor(state, workspace, shapeIdCounterRef) {
        super(state, workspace);
        this.shapeIdCounterRef = shapeIdCounterRef;
        console.log(`[CLASS MultiLineTool] 연속선 그리기 도구 초기화 완료`);
    }

    onMouseDown(e) {
        if (e.button === 2) {
            this.finishDrawing();
            return;
        }

        const pos = this.getMousePosition(e);
        this.lastMousePos = pos;
        
        if (!this.state.isDrawing) {
            this.state.isDrawing = true;
            this.shapeIdCounterRef.value++;
            
            console.log(`[MULTILINE-TOOL] 신규 연속선 생성 시작 | ID: shape_${this.shapeIdCounterRef.value}`);
            const shape = ShapeFactory.createShape(
                'multiline',
                `shape_${this.shapeIdCounterRef.value}`,
                pos.x,
                pos.y,
                this.state.currentStrokeWidth
            );

            if (shape) {
                this.state.currentShape = shape;
                this.workspace.appendChild(shape.element);
                console.log(`[MULTILINE-TOOL] 워크스페이스에 SVG 엘리먼트 부착 성공`);
            }
        } else {
            if (this.state.currentShape) {
                this.state.currentShape.addPoint(pos.x, pos.y);
                console.log(`[MULTILINE-TOOL] 점 추가 완료 | 현재 점 개수: ${this.state.currentShape.points.length}`);
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
        console.log(`[MULTILINE-TOOL] 마우스업 무시`);
    }

    finishDrawing() {
        if (!this.state.isDrawing || !this.state.currentShape) {
            console.log(`[MULTILINE-TOOL] finishDrawing 거부됨 - 이미 종료되었거나 대상 도형 없음 (무한 루프 방어 완료)`);
            return;
        }
        
        console.log(`[MULTILINE-TOOL] 그리기 종료 진입 - 재귀 호출 차단 Lock 활성화`);
        this.state.isDrawing = false;
        const targetShape = this.state.currentShape;
        this.state.currentShape = null;
        this.lastMousePos = null;

        targetShape.finish();
        
        if (targetShape.points.length >= 2) {
            HistoryManager.getInstance(this.state, this.workspace).saveState();
            this.state.shapes.push(targetShape);
            console.log(`[MULTILINE-TOOL] 연속선 드로잉 완료 및 데이터 저장 (총 ${this.state.shapes.length}개)`);

            this.state.selectedShapes.forEach(s => s.element.style.filter = '');
            this.state.selectedShapes = [targetShape];
            targetShape.element.style.filter = 'drop-shadow(0 0 5px #0066cc)';
            console.log(`[MULTILINE-TOOL] 방금 그린 연속선 자동 선택 적용 완료`);

            if (typeof this.state.setTool === 'function') {
                console.log(`[MULTILINE-TOOL] 정상 로직: state.setTool API를 통한 'select' 모드 전환 호출`);
                this.state.setTool('select');
            } else {
                console.log(`[MULTILINE-TOOL] Fallback 로직: state.setTool 부재로 인한 단축키 우회 호출`);
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
            }

            setTimeout(() => {
                if (this.state.activeTool && typeof this.state.activeTool.renderSelectionUI === 'function') {
                    this.state.activeTool.renderSelectionUI();
                    console.log(`[MULTILINE-TOOL] 지연 호출: 전환된 SelectTool의 UI 핸들 강제 렌더링 완료`);
                }
            }, 10);

        } else {
            console.log(`[MULTILINE-TOOL] 유효한 점 부족(2개 미만) - 생성 파기 및 DOM 엘리먼트 롤백`);
            if (targetShape.element && targetShape.element.parentNode) {
                targetShape.element.parentNode.removeChild(targetShape.element);
            }
        }
    }

    handleUndo() {
        if (this.state.isDrawing && this.state.currentShape) {
            console.log(`[MULTILINE-TOOL] 로컬 Undo 프로세스 진입`);
            const removed = this.state.currentShape.removeLastFixedPoint();
            
            if (!removed) {
                console.log(`[MULTILINE-TOOL] 로컬 Undo: 초기 생성 지점이므로 연속선 전체 취소`);
                if (this.state.currentShape.element && this.state.currentShape.element.parentNode) {
                    this.state.currentShape.element.parentNode.removeChild(this.state.currentShape.element);
                }
                this.state.isDrawing = false;
                this.state.currentShape = null;
                this.lastMousePos = null;
            } else if (this.lastMousePos) {
                this.state.currentShape.update(this.lastMousePos.x, this.lastMousePos.y, false);
            }
            return true;
        }
        return false;
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        if (key === 'escape') {
            console.log(`[MULTILINE-TOOL-KEY] Escape 감지 - 연속선 완료 처리 시도`);
            this.finishDrawing();
            return true;
        }
        if (e.key === 'Shift' && this.state.isDrawing && this.state.currentShape && this.lastMousePos) {
            console.log(`[MULTILINE-TOOL] Shift 눌림 - 실시간 스냅 적용`);
            this.state.currentShape.update(this.lastMousePos.x, this.lastMousePos.y, true);
            return true;
        }
        return false;
    }

    handleKeyUp(e) {
        if (e.key === 'Shift' && this.state.isDrawing && this.state.currentShape && this.lastMousePos) {
            console.log(`[MULTILINE-TOOL] Shift 뗌 - 실시간 스냅 해제`);
            this.state.currentShape.update(this.lastMousePos.x, this.lastMousePos.y, false);
            return true;
        }
        return false;
    }

    onDeactivate() {
        console.log(`[MULTILINE-TOOL] 도구 비활성화(onDeactivate) 트리거됨`);
        this.finishDrawing();
        super.onDeactivate();
    }
}