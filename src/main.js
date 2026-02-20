import { ShapeFactory } from './factory/ShapeFactory.js';

console.log("[SYSTEM] Main Entry 진입");

const state = {
    currentTool: 'select',
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentShape: null,
    shapes: []
};

let shapeIdCounter = 0;
const workspace = document.getElementById('workspace');
const sidebar = document.getElementById('sidebar');

sidebar.addEventListener('click', (e) => {
    if (e.target.classList.contains('tool-btn')) {
        const toolId = e.target.id.replace('tool-', '');
        state.currentTool = toolId;
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        console.log(`[SYSTEM] 툴 변경: ${toolId}`);
    }
});

workspace.addEventListener('mousedown', (e) => {
    if (state.currentTool === 'select') return;

    state.isDrawing = true;
    state.startX = e.offsetX;
    state.startY = e.offsetY;
    shapeIdCounter++;

    const shape = ShapeFactory.createShape(state.currentTool, `shape_${shapeIdCounter}`, state.startX, state.startY);
    
    if (shape) {
        state.currentShape = shape;
        workspace.appendChild(shape.element);
        console.log("[EVENT] mousedown 드로잉 시작");
    }
});

workspace.addEventListener('mousemove', (e) => {
    if (!state.isDrawing || !state.currentShape) return;
    state.currentShape.update(e.offsetX, e.offsetY);
});

workspace.addEventListener('mouseup', (e) => {
    if (!state.isDrawing) return;
    
    if (state.currentShape) {
        state.shapes.push(state.currentShape);
        console.log(`[EVENT] mouseup 도형 저장 완료 | 총 개수: ${state.shapes.length}`);
    }
    
    state.isDrawing = false;
    state.currentShape = null;
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'F1') {
        e.preventDefault();
        console.log("[DEBUG] 현재 저장된 도형 데이터 구조 (리터럴):");
        const data = state.shapes.map(s => ({
            id: s.id,
            type: s.type,
            points: s.points.map(p => ({x: p.x, y: p.y}))
        }));
        console.table(data);
    }
});