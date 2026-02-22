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
        console.log(`[CLASS HistoryManager] 싱글톤 히스토리 매니저 가동 완료`);
    }

    saveState() {
        const snapshot = this.cloneShapes(this.state.shapes);
        this.undoStack.push(snapshot);
        this.redoStack = [];
    }

    cloneShapes(shapes) {
        return shapes.map(shape => {
            const clonedShape = Object.assign(Object.create(Object.getPrototypeOf(shape)), shape);
            clonedShape.points = shape.points.map(p => ({...p}));
            clonedShape.element = shape.element.cloneNode(true);
            clonedShape.isLocked = shape.isLocked; // [신규] Undo/Redo 시 잠금 상태도 100% 복제
            
            // 그룹(GroupShape)인 경우 자식 객체까지 재귀적으로 깊은 복사(Deep Clone) 수행
            if (shape.type === 'group' && shape.children) {
                clonedShape.children = this.cloneShapes(shape.children);
                clonedShape.element.innerHTML = ''; 
                clonedShape.children.forEach(c => clonedShape.element.appendChild(c.element));
            }
            
            return clonedShape;
        });
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const currentState = this.cloneShapes(this.state.shapes);
        this.redoStack.push(currentState);
        this.restoreState(this.undoStack.pop());
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const currentState = this.cloneShapes(this.state.shapes);
        this.undoStack.push(currentState);
        this.restoreState(this.redoStack.pop());
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

        if (this.state.colorManager) {
            this.state.colorManager.updateUI(this.state.selectedShapes);
        }
        
        if (this.state.renderLayers) {
            this.state.renderLayers();
        }
    }
}