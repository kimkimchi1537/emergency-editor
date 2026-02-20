export class HistoryManager {
    static instance = null;

    static getInstance(state, workspace) {
        if (!HistoryManager.instance) {
            HistoryManager.instance = new HistoryManager(state, workspace);
        }
        return HistoryManager.instance;
    }

    constructor(state, workspace) {
        this.state = state;
        this.workspace = workspace;
        this.undoStack = [];
        this.redoStack = [];
        console.log(`[CLASS HistoryManager] 싱글톤 히스토리 매니저 가동 완료 | 상태 스냅샷 시스템 준비`);
    }

    saveState() {
        const snapshot = this.cloneShapes(this.state.shapes);
        this.undoStack.push(snapshot);
        this.redoStack = [];
        console.log(`[HISTORY] 상태 저장 완료 | Undo 스택: ${this.undoStack.length}개`);
    }

    cloneShapes(shapes) {
        return shapes.map(shape => {
            const clonedShape = Object.assign(Object.create(Object.getPrototypeOf(shape)), shape);
            clonedShape.points = shape.points.map(p => ({...p}));
            clonedShape.element = shape.element.cloneNode(true);
            clonedShape.element.style.filter = '';
            return clonedShape;
        });
    }

    undo() {
        if (this.undoStack.length === 0) {
            console.log(`[HISTORY] Undo 거부: 스택이 비어있음`);
            return;
        }
        
        const currentState = this.cloneShapes(this.state.shapes);
        this.redoStack.push(currentState);
        
        const previousState = this.undoStack.pop();
        this.restoreState(previousState);
        console.log(`[HISTORY] Undo 실행 완료 | 남은 Undo: ${this.undoStack.length}개, Redo: ${this.redoStack.length}개`);
    }

    redo() {
        if (this.redoStack.length === 0) {
            console.log(`[HISTORY] Redo 거부: 스택이 비어있음`);
            return;
        }

        const currentState = this.cloneShapes(this.state.shapes);
        this.undoStack.push(currentState);

        const nextState = this.redoStack.pop();
        this.restoreState(nextState);
        console.log(`[HISTORY] Redo 실행 완료 | 남은 Undo: ${this.undoStack.length}개, Redo: ${this.redoStack.length}개`);
    }

    restoreState(snapshot) {
        this.state.shapes.forEach(shape => {
            if (shape.element && shape.element.parentNode) {
                shape.element.parentNode.removeChild(shape.element);
            }
        });
        
        this.state.shapes = this.cloneShapes(snapshot);
        this.state.selectedShapes = [];
        
        this.state.shapes.forEach(shape => {
            this.workspace.appendChild(shape.element);
        });
    }
}