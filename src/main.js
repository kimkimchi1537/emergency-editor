import { ShortcutManager } from './managers/ShortcutManager.js';
import { ZoomManager } from './managers/ZoomManager.js';
import { ColorManager } from './managers/ColorManager.js';
import { SelectTool } from './tools/SelectTool.js';
import { MultiLineTool } from './tools/MultiLineTool.js';
import { LineTool } from './tools/LineTool.js';
import { RectTool } from './tools/RectTool.js';
import { CircleTool } from './tools/CircleTool.js';

console.log("[SYSTEM] Main Entry 진입 - 큐(Queue) 기반 선택 및 독립 도구 클래스 아키텍처 적용");

const state = {
    currentTool: 'select',
    currentStrokeWidth: 4,
    currentStrokeColor: '#e63946',
    currentFillColor: '#1d3557',
    currentSizePreset: 'fit',
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentShape: null,
    selectedShapes: [],
    selectionQueue: [],
    shapes: [],
    activeTool: null,
    setTool: null,
    requestSelection: function(shape) {
        this.selectionQueue.push(shape);
        console.log(`[STATE] 도형 선택 큐에 추가됨 | ID: ${shape.id}, 대기열 크기: ${this.selectionQueue.length}`);
    }
};

const PRESETS = {
    'A4_P': { w: 794, h: 1123 },
    'A4_L': { w: 1123, h: 794 },
    'A3_P': { w: 1123, h: 1587 },
    'A3_L': { w: 1587, h: 1123 },
    'B4_P': { w: 971, h: 1375 },
    'B4_L': { w: 1375, h: 971 }
};

let shapeIdCounter = { value: 0 };
const workspace = document.getElementById('workspace');
const sidebar = document.getElementById('sidebar');
const workspaceContainer = document.getElementById('workspace-container');
const strokeWidthInput = document.getElementById('stroke-width-input');
const sizePresetSelect = document.getElementById('canvas-size-preset');
const customSizeControls = document.getElementById('custom-size-controls');
const customWidthInput = document.getElementById('custom-width');
const customHeightInput = document.getElementById('custom-height');

const colorManager = new ColorManager(state, workspace);
state.colorManager = colorManager;

// DrawTool 폐기 후 각 도형 도구를 독립적인 인스턴스로 분리 생성
const tools = {
    'select': new SelectTool(state, workspace),
    'line': new LineTool(state, workspace, shapeIdCounter),
    'rect': new RectTool(state, workspace, shapeIdCounter),
    'circle': new CircleTool(state, workspace, shapeIdCounter),
    'multiline': new MultiLineTool(state, workspace, shapeIdCounter)
};

function setTool(toolId) {
    console.log(`[SYSTEM] 도구 변경 프로세스 시작: ${state.currentTool} -> ${toolId}`);
    
    if (state.activeTool) {
        state.activeTool.onDeactivate();
    }

    state.currentTool = toolId;
    
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`tool-${toolId}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        console.log(`[UI] 사이드바 버튼 활성 상태 동기화: tool-${toolId}`);
    }

    if (toolId === 'select') {
        state.activeTool = tools['select'];
        workspace.style.cursor = 'default';
    } else {
        state.activeTool = tools[toolId];
        workspace.style.cursor = 'crosshair';
    }
    
    console.log(`[SYSTEM] 현재 활성 도구 인스턴스: ${state.activeTool.constructor.name}`);

    if (state.activeTool && typeof state.activeTool.onActivate === 'function') {
        state.activeTool.onActivate();
    }
}

state.setTool = setTool;

const showDebugData = () => {
    console.log("[DEBUG-ACTION] 캔버스 내부 데이터 무결성 검사 및 로그 출력");
    const data = state.shapes.map(s => ({
        id: s.id,
        type: s.type,
        strokeWidth: s.strokeWidth,
        points: s.points.map(p => ({x: p.x, y: p.y}))
    }));
    console.log(`[DEBUG-ACTION] 추출 완료 (총 ${data.length}개 데이터)`);
    console.table(data);
};

const shortcutManager = new ShortcutManager(state, workspace);
shortcutManager.register('s', () => setTool('select'));
shortcutManager.register('l', () => setTool('line'));
shortcutManager.register('r', () => setTool('rect'));
shortcutManager.register('c', () => setTool('circle'));
shortcutManager.register('p', () => setTool('multiline'));

const zoomManager = ZoomManager.getInstance(workspaceContainer, workspace);

workspaceContainer.addEventListener('wheel', (e) => {
    if (state.activeTool && typeof state.activeTool.onWheel === 'function') {
        const handled = state.activeTool.onWheel(e);
        if (handled) return;
    }
    zoomManager.handleWheel(e);
}, { passive: false });

function updateCanvasSize() {
    let width = 800;
    let height = 600;
    
    if (state.currentSizePreset === 'custom') {
        width = parseInt(customWidthInput.value, 10) || 800;
        height = parseInt(customHeightInput.value, 10) || 600;
    } else if (PRESETS[state.currentSizePreset]) {
        width = PRESETS[state.currentSizePreset].w;
        height = PRESETS[state.currentSizePreset].h;
    } else if (state.currentSizePreset === 'fit') {
        const rect = workspaceContainer.getBoundingClientRect();
        width = rect.width > 0 ? rect.width - 80 : 800;
        height = rect.height > 0 ? rect.height - 80 : 600;
    }

    workspace.setAttribute('viewBox', `0 0 ${width} ${height}`);
    
    workspace.setAttribute('width', width);
    workspace.setAttribute('height', height);
    
    console.log(`[SYSTEM] 캔버스 논리 해상도(viewBox) 업데이트 완료 | ${width}x${height} (모드: ${state.currentSizePreset})`);
}

sizePresetSelect.addEventListener('change', (e) => {
    state.currentSizePreset = e.target.value;
    console.log(`[EVENT change] 용지 프리셋 변경 감지: ${state.currentSizePreset}`);
    
    if (state.currentSizePreset === 'custom') {
        customSizeControls.classList.add('visible');
    } else {
        customSizeControls.classList.remove('visible');
    }
    
    updateCanvasSize();
    
    setTimeout(() => {
        zoomManager.fitToScreen();
    }, 50);
});

[customWidthInput, customHeightInput].forEach(input => {
    input.addEventListener('change', () => {
        updateCanvasSize();
        setTimeout(() => {
            zoomManager.fitToScreen();
        }, 50);
    });
});

window.addEventListener('load', () => {
    zoomManager.fitToScreen();
});

window.addEventListener('resize', () => {
    zoomManager.fitToScreen();
});

updateCanvasSize();
setTool('select');

sidebar.addEventListener('click', (e) => {
    if (e.target.classList.contains('tool-btn')) {
        const toolId = e.target.id.replace('tool-', '');
        setTool(toolId);
    }
});

strokeWidthInput.addEventListener('change', (e) => {
    state.currentStrokeWidth = parseInt(e.target.value, 10) || 4;
    console.log(`[STATE] 선 굵기 업데이트: ${state.currentStrokeWidth}`);
});

workspace.addEventListener('mousedown', (e) => {
    if (state.activeTool) {
        console.log(`[EVENT mousedown] 워크스페이스 클릭 감지 -> 도구 전달 | 버튼: ${e.button}`);
        state.activeTool.onMouseDown(e);
    }
});

workspace.addEventListener('mousemove', (e) => {
    if (state.activeTool) {
        state.activeTool.onMouseMove(e);
    }
});

workspace.addEventListener('mouseup', (e) => {
    if (state.activeTool) {
        console.log(`[EVENT mouseup] 클릭 종료 감지 -> 도구 전달`);
        state.activeTool.onMouseUp(e);
    }
});

workspace.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    console.log(`[EVENT contextmenu] 우클릭 감지 - 브라우저 기본 메뉴 차단`);
});

document.getElementById('btn-export-svg').addEventListener('click', () => {
    console.log("[EXPORT] SVG 형식 데이터 직렬화 및 다운로드 시작");
    
    const viewBox = workspace.getAttribute('viewBox');
    let w = 800, h = 600;
    if (viewBox) {
        const parts = viewBox.split(' ');
        w = parseFloat(parts[2]);
        h = parseFloat(parts[3]);
    }
    
    const oldWidth = workspace.getAttribute('width');
    const oldHeight = workspace.getAttribute('height');
    
    workspace.setAttribute('width', w);
    workspace.setAttribute('height', h);
    
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(workspace);
    
    workspace.setAttribute('width', oldWidth);
    workspace.setAttribute('height', oldHeight);

    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
    const link = document.createElement("a");
    link.href = url;
    link.download = `emergency_map_${Date.now()}.svg`;
    link.click();
});

document.getElementById('btn-export-png').addEventListener('click', () => {
    console.log("[EXPORT] PNG 래스터 이미지 렌더링 및 다운로드 시작");
    
    const viewBox = workspace.getAttribute('viewBox');
    let w = 800, h = 600;
    if (viewBox) {
        const parts = viewBox.split(' ');
        w = parseFloat(parts[2]);
        h = parseFloat(parts[3]);
    }
    
    const oldWidth = workspace.getAttribute('width');
    const oldHeight = workspace.getAttribute('height');
    
    workspace.setAttribute('width', w);
    workspace.setAttribute('height', h);
    
    const svgData = new XMLSerializer().serializeToString(workspace);
    
    workspace.setAttribute('width', oldWidth);
    workspace.setAttribute('height', oldHeight);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    canvas.width = w; 
    canvas.height = h;
    
    const svgBlob = new Blob([svgData], {type: "image/svg+xml;charset=utf-8"});
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = `emergency_map_${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
    };
    img.src = url;
});