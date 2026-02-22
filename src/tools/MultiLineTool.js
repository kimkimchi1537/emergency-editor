import { BaseTool } from './BaseTool.js';
import { ShapeFactory } from '../factory/ShapeFactory.js';
import { HistoryManager } from '../managers/HistoryManager.js';

export class MultiLineTool extends BaseTool {
    constructor(state, workspace, shapeIdCounterRef) {
        super(state, workspace);
        this.shapeIdCounterRef = shapeIdCounterRef;
        this.shapeType = 'multiline';
        this.snapIndicator = null;
        console.log(`[CLASS MultiLineTool] 다중선 도구 초기화 완료`);
    }

    getSnapPoint(currentPos) {
        if (!this.state.isSnapEnabled) return { pos: currentPos, snapped: false };
        
        const snapRadius = 15;
        let closestDist = snapRadius;
        let snapPos = { x: currentPos.x, y: currentPos.y };
        let snapped = false;

        this.state.shapes.forEach(shape => {
            if (shape === this.state.currentShape || shape.isLocked) return;
            
            const match = (shape.element.getAttribute('transform') || '').match(/rotate\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/);
            let angleRad = 0, cx = 0, cy = 0;
            if (match) { 
                angleRad = parseFloat(match[1]) * (Math.PI / 180); 
                cx = parseFloat(match[2]); 
                cy = parseFloat(match[3]); 
            }

            if (shape.points) {
                shape.points.forEach(p => {
                    let tx = p.x, ty = p.y;
                    if (match) {
                        const dx = p.x - cx; 
                        const dy = p.y - cy;
                        tx = cx + dx * Math.cos(angleRad) - dy * Math.sin(angleRad); 
                        ty = cy + dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
                    }

                    const dist = Math.sqrt(Math.pow(currentPos.x - tx, 2) + Math.pow(currentPos.y - ty, 2));
                    if (dist < closestDist) {
                        closestDist = dist;
                        snapPos = { x: tx, y: ty };
                        snapped = true;
                    }
                });
            }
        });

        return { pos: snapPos, snapped };
    }

    updateSnapIndicator(pos, snapped) {
        if (snapped) {
            if (!this.snapIndicator) {
                this.snapIndicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                this.snapIndicator.setAttribute('r', '6');
                this.snapIndicator.setAttribute('fill', 'rgba(0, 255, 255, 0.4)');
                this.snapIndicator.setAttribute('stroke', '#00ffff');
                this.snapIndicator.setAttribute('stroke-width', '2');
                this.snapIndicator.style.pointerEvents = 'none';
                this.workspace.appendChild(this.snapIndicator);
            }
            this.snapIndicator.setAttribute('cx', pos.x);
            this.snapIndicator.setAttribute('cy', pos.y);
            this.snapIndicator.style.display = 'block';
        } else {
            if (this.snapIndicator) {
                this.snapIndicator.style.display = 'none';
            }
        }
    }

    onMouseDown(e) {
        if (e.button === 2) { this.completeDrawing(); return; }
        let pos = this.getMousePosition(e);
        
        const snapInfo = this.getSnapPoint(pos);
        if (snapInfo.snapped) {
            pos = snapInfo.pos;
        }

        this.lastMousePos = pos;

        if (!this.state.isDrawing) {
            this.state.isDrawing = true;
            this.shapeIdCounterRef.value++;
            const shape = ShapeFactory.createShape(
                this.shapeType,
                `shape_${this.shapeIdCounterRef.value}`,
                pos.x,
                pos.y,
                this.state.currentStrokeWidth,
                this.state.currentStrokeColor,
                this.state.currentFillColor || 'transparent'
            );

            if (shape) {
                this.state.currentShape = shape;
                if (this.state.currentOpacity !== undefined) shape.setOpacity(this.state.currentOpacity);
                this.workspace.appendChild(shape.element);
            }
        } else if (this.state.currentShape) {
            this.state.currentShape.addPoint(pos.x, pos.y);
        }
    }

    onMouseMove(e) {
        let pos = this.getMousePosition(e);
        
        const snapInfo = this.getSnapPoint(pos);
        if (snapInfo.snapped && !e.shiftKey) {
            pos = snapInfo.pos;
        }
        
        this.updateSnapIndicator(pos, snapInfo.snapped);
        this.lastMousePos = pos;

        if (this.state.isDrawing && this.state.currentShape) {
            this.state.currentShape.update(pos.x, pos.y, e.shiftKey);
        }
    }

    onMouseUp(e) {
    }

    onDoubleClick(e) {
        if (this.state.isDrawing) {
            if (this.state.currentShape) this.state.currentShape.removeLastFixedPoint();
            this.completeDrawing();
        }
    }

    completeDrawing() {
        if (!this.state.isDrawing || !this.state.currentShape) return;

        this.state.currentShape.finish();
        
        if (this.state.currentShape.points.length < 2) {
            if (this.state.currentShape.element.parentNode) {
                this.state.currentShape.element.parentNode.removeChild(this.state.currentShape.element);
            }
        } else {
            HistoryManager.getInstance(this.state, this.workspace).saveState();
            this.state.shapes.push(this.state.currentShape);
            if (typeof this.state.requestSelection === 'function') {
                this.state.requestSelection(this.state.currentShape);
            }
        }

        this.state.isDrawing = false;
        this.state.currentShape = null;
        this.lastMousePos = null;
        this.updateSnapIndicator(null, false);

        if (this.state.renderLayers) this.state.renderLayers();
        if (this.state.setTool) this.state.setTool('select');
    }

    cancelDrawing() {
        if (!this.state.isDrawing) return;
        if (this.state.currentShape && this.state.currentShape.element && this.state.currentShape.element.parentNode) {
            this.state.currentShape.element.parentNode.removeChild(this.state.currentShape.element);
        }
        this.state.isDrawing = false;
        this.state.currentShape = null;
        this.lastMousePos = null;
        this.updateSnapIndicator(null, false);
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        if (key === 'escape') { this.cancelDrawing(); return true; }
        
        // [복구 완료] 회원님께서 원래 작성하셨던 엔터키 확정 코드 복원
        if (key === 'enter') { 
            this.completeDrawing(); 
            return true; 
        }

        if (key === 'backspace' || key === 'delete') {
            if (this.state.isDrawing && this.state.currentShape) {
                this.state.currentShape.removeLastFixedPoint();
                if (this.lastMousePos) {
                    this.state.currentShape.update(this.lastMousePos.x, this.lastMousePos.y, e.shiftKey);
                }
                return true;
            }
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
            this.completeDrawing();
        }
        this.updateSnapIndicator(null, false);
        super.onDeactivate();
    }
}