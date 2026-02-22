import { BaseTool } from './BaseTool.js';
import { ShapeFactory } from '../factory/ShapeFactory.js';
import { HistoryManager } from '../managers/HistoryManager.js';

export class TextTool extends BaseTool {
    constructor(state, workspace, shapeIdCounterRef) {
        super(state, workspace);
        this.shapeIdCounterRef = shapeIdCounterRef;
        this.shapeType = 'text';
    }

    onMouseDown(e) {
        if (e.button === 2) { this.cancelDrawing(); return; }
        const pos = this.getMousePosition(e);
        this.lastMousePos = pos;

        if (!this.state.isDrawing) {
            this.state.isDrawing = true;
            this.state.startX = pos.x;
            this.state.startY = pos.y;
            this.shapeIdCounterRef.value++;
            
            const shape = ShapeFactory.createShape(
                this.shapeType,
                `shape_${this.shapeIdCounterRef.value}`,
                this.state.startX,
                this.state.startY,
                1,
                'rgba(0,0,0,1)',
                'transparent',
                { 
                    opacity: this.state.currentOpacity,
                    content: this.state.currentTextContent || "텍스트",
                    fontSize: this.state.currentTextSize,
                    fontColor: this.state.currentTextColor,
                    fontWeight: this.state.currentTextBold ? "bold" : "normal",
                    fontStyle: this.state.currentTextItalic ? "italic" : "normal",
                    textDecoration: this.state.currentTextUnderline ? "underline" : "none",
                    textAlign: this.state.currentTextAlign,
                    verticalAlign: this.state.currentTextVAlign
                }
            );

            if (shape) {
                this.state.currentShape = shape;
                this.workspace.appendChild(shape.element);
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
        if (e.button === 2) return;
        if (this.state.isDrawing && this.state.currentShape) {
            this.completeDrawing();
        }
    }

    completeDrawing() {
        HistoryManager.getInstance(this.state, this.workspace).saveState();
        const createdShape = this.state.currentShape; // [신규] 생성된 객체를 변수에 저장해둡니다.
        this.state.shapes.push(createdShape);
        
        if (typeof this.state.requestSelection === 'function') {
            this.state.requestSelection(createdShape);
        }
        
        this.state.isDrawing = false;
        this.state.currentShape = null;
        this.lastMousePos = null;
        
        if (this.state.renderLayers) this.state.renderLayers();
        if (this.state.setTool) this.state.setTool('select');
        
        // [수정] 박스 생성이 끝나면 캔버스 내 에디터를 즉시 활성화시킵니다.
        setTimeout(() => {
            if (createdShape && typeof createdShape.enableEditing === 'function') {
                createdShape.enableEditing(() => {
                    if (this.state.activeTool && typeof this.state.activeTool.syncStateUI === 'function') {
                        this.state.activeTool.syncStateUI();
                    }
                    import('../managers/HistoryManager.js').then(({HistoryManager}) => {
                        HistoryManager.getInstance(this.state, this.workspace).saveState();
                    });
                });
            }
        }, 50);
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
        if (key === 'escape') { this.cancelDrawing(); return true; }
        if (e.key === 'Shift' && this.state.isDrawing && this.state.currentShape && this.lastMousePos) { this.state.currentShape.update(this.lastMousePos.x, this.lastMousePos.y, true); return true; }
        return false;
    }

    handleKeyUp(e) {
        if (e.key === 'Shift' && this.state.isDrawing && this.state.currentShape && this.lastMousePos) { this.state.currentShape.update(this.lastMousePos.x, this.lastMousePos.y, false); return true; }
        return false;
    }

    onDeactivate() {
        if (this.state.isDrawing) this.cancelDrawing();
        super.onDeactivate();
    }
}