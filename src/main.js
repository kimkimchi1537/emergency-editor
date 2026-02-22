import { ShortcutManager } from './managers/ShortcutManager.js';
import { ZoomManager } from './managers/ZoomManager.js';
import { ColorManager } from './managers/ColorManager.js';
import { LayerManager } from './managers/LayerManager.js'; // [추가]
import { SelectTool } from './tools/SelectTool.js';
import { MultiLineTool } from './tools/MultiLineTool.js';
import { LineTool } from './tools/LineTool.js';
import { RectTool } from './tools/RectTool.js';
import { CircleTool } from './tools/CircleTool.js';
import { ImageTool } from './tools/ImageTool.js'; // [추가]
import { ShapeFactory } from './factory/ShapeFactory.js';
import { HistoryManager } from './managers/HistoryManager.js';

console.log("[SYSTEM] Main Entry 진입 - 레이어 및 이미지 삽입 시스템 연동 시작");

const state = {
    currentTool: 'select',
    currentStrokeWidth: 4,
    currentStrokeColor: '#e63946',
    currentFillColor: 'rgba(52, 152, 219, 1.0)', 
    currentOpacity: 1.0, // [신규] 전역 투명도 속성
    currentSizePreset: 'fit',
    pendingImageUrl: null, // [신규] 클립보드/업로드 이미지 대기열
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentShape: null,
    selectedShapes: [],
    selectionQueue: [],
    shapes: [],
    activeTool: null,
    setTool: null,
    renderLayers: null, // [신규] 전역 레이어 렌더링 훅
    requestSelection: function(shape) {
        this.selectionQueue.push(shape);
    }
};

const PRESETS = {
    'A4_P': { w: 794, h: 1123 }, 'A4_L': { w: 1123, h: 794 },
    'A3_P': { w: 1123, h: 1587 }, 'A3_L': { w: 1587, h: 1123 },
    'B4_P': { w: 971, h: 1375 }, 'B4_L': { w: 1375, h: 971 }
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
const layerListContainer = document.getElementById('layer-list'); // [추가]

const colorManager = new ColorManager(state, workspace);
state.colorManager = colorManager;

// [신규] 레이어 매니저 초기화 및 훅 등록
const layerManager = new LayerManager(state, workspace, layerListContainer);
state.renderLayers = () => layerManager.render();

const tools = {
    'select': new SelectTool(state, workspace),
    'line': new LineTool(state, workspace, shapeIdCounter),
    'rect': new RectTool(state, workspace, shapeIdCounter),
    'circle': new CircleTool(state, workspace, shapeIdCounter),
    'multiline': new MultiLineTool(state, workspace, shapeIdCounter),
    'image': new ImageTool(state, workspace, shapeIdCounter) // [신규]
};

function setTool(toolId) {
    if (state.activeTool) state.activeTool.onDeactivate();
    state.currentTool = toolId;
    
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`tool-${toolId}`);
    if (activeBtn) activeBtn.classList.add('active');

    state.activeTool = tools[toolId];
    workspace.style.cursor = toolId === 'select' ? 'default' : 'crosshair';
    
    if (state.activeTool && typeof state.activeTool.onActivate === 'function') {
        state.activeTool.onActivate();
    }
}

state.setTool = setTool;

const shortcutManager = new ShortcutManager(state, workspace);
shortcutManager.register('s', () => setTool('select'));
shortcutManager.register('l', () => setTool('line'));
shortcutManager.register('r', () => setTool('rect'));
shortcutManager.register('c', () => setTool('circle'));
shortcutManager.register('p', () => setTool('multiline'));
shortcutManager.register('i', () => {
    if(state.pendingImageUrl) setTool('image');
    else document.getElementById('image-upload-input').click();
});

const zoomManager = ZoomManager.getInstance(workspaceContainer, workspace);
workspaceContainer.addEventListener('wheel', (e) => {
    if (state.activeTool && typeof state.activeTool.onWheel === 'function' && state.activeTool.onWheel(e)) return;
    zoomManager.handleWheel(e);
}, { passive: false });

function updateCanvasSize() {
    let width = 800; let height = 600;
    if (state.currentSizePreset === 'custom') {
        width = parseInt(customWidthInput.value, 10) || 800; height = parseInt(customHeightInput.value, 10) || 600;
    } else if (PRESETS[state.currentSizePreset]) {
        width = PRESETS[state.currentSizePreset].w; height = PRESETS[state.currentSizePreset].h;
    } else if (state.currentSizePreset === 'fit') {
        const rect = workspaceContainer.getBoundingClientRect();
        width = rect.width > 0 ? rect.width - 80 : 800; height = rect.height > 0 ? rect.height - 80 : 600;
    }
    workspace.setAttribute('viewBox', `0 0 ${width} ${height}`);
    workspace.setAttribute('width', width); workspace.setAttribute('height', height);
}

sizePresetSelect.addEventListener('change', (e) => {
    state.currentSizePreset = e.target.value;
    if (state.currentSizePreset === 'custom') customSizeControls.classList.add('visible'); else customSizeControls.classList.remove('visible');
    updateCanvasSize(); setTimeout(() => { zoomManager.fitToScreen(); }, 50);
});

[customWidthInput, customHeightInput].forEach(input => {
    input.addEventListener('change', () => { updateCanvasSize(); setTimeout(() => { zoomManager.fitToScreen(); }, 50); });
});

window.addEventListener('load', () => zoomManager.fitToScreen());
window.addEventListener('resize', () => zoomManager.fitToScreen());

updateCanvasSize();
setTool('select');
state.renderLayers(); // 최초 빈 레이어 목록 렌더링

sidebar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tool-btn');
    if (btn) setTool(btn.id.replace('tool-', ''));
});

// [수정] 선 굵기 변경 시 선택된 도형에 양방향 실시간 동기화
strokeWidthInput.addEventListener('change', (e) => {
    const newWidth = parseInt(e.target.value, 10) || 4;
    state.currentStrokeWidth = newWidth;
    
    if (state.selectedShapes.length > 0) {
        import('./managers/HistoryManager.js').then(({HistoryManager}) => {
            HistoryManager.getInstance(state, workspace).saveState();
            
            state.selectedShapes.forEach(shape => {
                if (shape.type !== 'image' && shape.type !== 'group') {
                    shape.strokeWidth = newWidth;
                    if (shape.element) {
                        shape.element.setAttribute('stroke-width', newWidth);
                    }
                } else if (shape.type === 'group') {
                    // 그룹 안에 있는 도형들도 모두 찾아서 일괄 선 굵기 변경
                    const updateGroupStroke = (grp) => {
                        grp.children.forEach(child => {
                            if (child.type === 'group') updateGroupStroke(child);
                            else if (child.type !== 'image') {
                                child.strokeWidth = newWidth;
                                if (child.element) child.element.setAttribute('stroke-width', newWidth);
                            }
                        });
                    };
                    updateGroupStroke(shape);
                }
            });
            console.log(`[SYSTEM] 선택된 도형 선 굵기 일괄 변경 완료: ${newWidth}`);
        });
    }
});

// [신규] 불투명도 조절 이벤트 연동
const opacitySlider = document.getElementById('opacity-slider');
const opacityVal = document.getElementById('opacity-val');
opacitySlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    opacityVal.textContent = Math.round(val * 100) + '%';
    state.currentOpacity = val;
    
    // 선택된 도형이 있다면 즉시 적용
    if (state.selectedShapes.length > 0) {
        state.selectedShapes.forEach(s => s.setOpacity(val));
    }
});
opacitySlider.addEventListener('change', (e) => {
    // 마우스를 뗄 때 히스토리 저장
    if (state.selectedShapes.length > 0) {
        import('./managers/HistoryManager.js').then(({HistoryManager}) => {
            HistoryManager.getInstance(state, workspace).saveState();
            state.selectedShapes.forEach(s => s.setOpacity(parseFloat(e.target.value)));
        });
    }
});

workspace.addEventListener('mousedown', (e) => { if (state.activeTool) state.activeTool.onMouseDown(e); });
workspace.addEventListener('mousemove', (e) => { if (state.activeTool) state.activeTool.onMouseMove(e); });
workspace.addEventListener('mouseup', (e) => { if (state.activeTool) state.activeTool.onMouseUp(e); });
workspace.addEventListener('contextmenu', (e) => {
    e.preventDefault(); if (state.activeTool && typeof state.activeTool.onContextMenu === 'function') state.activeTool.onContextMenu(e);
});

document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#context-menu')) { const cm = document.getElementById('context-menu'); if (cm) cm.style.display = 'none'; }
});


// [신규] 이미지 업로드 프로세스 (버튼 및 파일 입력)
const btnUploadImage = document.getElementById('btn-upload-image');
const imageUploadInput = document.getElementById('image-upload-input');
const toolImageBtn = document.getElementById('tool-image');

btnUploadImage.addEventListener('click', () => imageUploadInput.click());

imageUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) loadFileAsImage(file);
    e.target.value = ''; // 초기화
});

// [신규] 클립보드 붙여넣기 (Ctrl+V) 감지
window.addEventListener('paste', (e) => {
    console.log(`[SYSTEM] 클립보드 붙여넣기(Paste) 이벤트 감지`);
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            loadFileAsImage(file);
            break;
        }
    }
});

function loadFileAsImage(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const imgUrl = event.target.result;
        const img = new Image();
        img.onload = () => {
            let w = img.naturalWidth;
            let h = img.naturalHeight;
            
            const canvasW = parseFloat(workspace.getAttribute('width')) || 800;
            const canvasH = parseFloat(workspace.getAttribute('height')) || 600;
            
            // [핵심] 원본 비율을 유지하면서 캔버스 크기를 넘지 않도록 자동 축소 보정
            if (w > canvasW || h > canvasH) {
                const ratio = Math.min(canvasW / w, canvasH / h);
                w *= ratio;
                h *= ratio;
            }
            
            // 캔버스 정중앙 배치 좌표 계산
            const startX = (canvasW - w) / 2;
            const startY = (canvasH - h) / 2;
            
            HistoryManager.getInstance(state, workspace).saveState();
            
            shapeIdCounter.value++;
            const shape = ShapeFactory.createShape(
                'image', 
                `shape_${shapeIdCounter.value}`, 
                startX, 
                startY, 
                0, 
                'transparent', 
                'transparent', 
                { 
                    imageUrl: imgUrl, 
                    opacity: state.currentOpacity,
                    originalRatio: img.naturalWidth / img.naturalHeight // [신규] 원본 비율 데이터 추가
                }
            );
            
            // 계산된 크기와 위치로 이미지 폴리곤 포인트 강제 갱신
            shape.points[0] = {x: startX, y: startY};
            shape.points[1] = {x: startX + w, y: startY};
            shape.points[2] = {x: startX + w, y: startY + h};
            shape.points[3] = {x: startX, y: startY + h};
            shape.updateAttributes();
            
            workspace.appendChild(shape.element);
            state.shapes.push(shape);
            
            // 이미지 삽입 직후 Select(선택) 툴로 자동 전환 및 포커스
            state.requestSelection(shape);
            setTool('select');
            
            if (state.renderLayers) state.renderLayers();
            console.log(`[SYSTEM] 이미지 자동 삽입 완료 | 원본비율 유지 크기: ${w}x${h}`);
        };
        img.src = imgUrl;
    };
    reader.readAsDataURL(file);
}

document.getElementById('btn-export-svg').addEventListener('click', () => {
    const viewBox = workspace.getAttribute('viewBox'); let w = 800, h = 600;
    if (viewBox) { const parts = viewBox.split(' '); w = parseFloat(parts[2]); h = parseFloat(parts[3]); }
    const oldWidth = workspace.getAttribute('width'); const oldHeight = workspace.getAttribute('height');
    workspace.setAttribute('width', w); workspace.setAttribute('height', h);
    let source = new XMLSerializer().serializeToString(workspace);
    workspace.setAttribute('width', oldWidth); workspace.setAttribute('height', oldHeight);
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
    const link = document.createElement("a"); link.href = url; link.download = `emergency_map_${Date.now()}.svg`; link.click();
});

document.getElementById('btn-export-png').addEventListener('click', () => {
    const viewBox = workspace.getAttribute('viewBox'); let w = 800, h = 600;
    if (viewBox) { const parts = viewBox.split(' '); w = parseFloat(parts[2]); h = parseFloat(parts[3]); }
    const oldWidth = workspace.getAttribute('width'); const oldHeight = workspace.getAttribute('height');
    workspace.setAttribute('width', w); workspace.setAttribute('height', h);
    const svgData = new XMLSerializer().serializeToString(workspace);
    workspace.setAttribute('width', oldWidth); workspace.setAttribute('height', oldHeight);
    const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d"); const img = new Image();
    canvas.width = w; canvas.height = h;
    const svgBlob = new Blob([svgData], {type: "image/svg+xml;charset=utf-8"});
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
        ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0);
        const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = `emergency_map_${Date.now()}.png`; link.click(); URL.revokeObjectURL(url);
    }; img.src = url;
});