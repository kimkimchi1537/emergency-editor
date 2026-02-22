import { ShortcutManager } from './managers/ShortcutManager.js';
import { ZoomManager } from './managers/ZoomManager.js';
import { ColorManager } from './managers/ColorManager.js';
import { LayerManager } from './managers/LayerManager.js';
import { SelectTool } from './tools/SelectTool.js';
import { MultiLineTool } from './tools/MultiLineTool.js';
import { LineTool } from './tools/LineTool.js';
import { RectTool } from './tools/RectTool.js';
import { CircleTool } from './tools/CircleTool.js';
import { ImageTool } from './tools/ImageTool.js';
import { TextTool } from './tools/TextTool.js'; 
import { ShapeFactory } from './factory/ShapeFactory.js';
import { HistoryManager } from './managers/HistoryManager.js';

const state = {
    currentTool: 'select',
    currentStrokeWidth: 4,
    currentStrokeColor: '#e63946',
    currentFillColor: 'rgba(52, 152, 219, 1.0)', 
    currentOpacity: 1.0,
    currentSizePreset: 'fit',
    pendingImageUrl: null,
    
    currentTextSize: 18,
    currentTextColor: '#000000',
    currentTextBold: false,
    currentTextItalic: false,
    currentTextUnderline: false,
    currentTextAlign: 'center',
    currentTextVAlign: 'middle',
    
    isSnapEnabled: true, // [신규] 자석(스냅) 기능 상태 (기본값 true)
    
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentShape: null,
    selectedShapes: [],
    selectionQueue: [],
    shapes: [],
    activeTool: null,
    setTool: null,
    renderLayers: null,
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
const layerListContainer = document.getElementById('layer-list');

const colorManager = new ColorManager(state, workspace);
state.colorManager = colorManager;

const layerManager = new LayerManager(state, workspace, layerListContainer);
state.renderLayers = () => layerManager.render();

const tools = {
    'select': new SelectTool(state, workspace),
    'line': new LineTool(state, workspace, shapeIdCounter),
    'rect': new RectTool(state, workspace, shapeIdCounter),
    'circle': new CircleTool(state, workspace, shapeIdCounter),
    'multiline': new MultiLineTool(state, workspace, shapeIdCounter),
    'image': new ImageTool(state, workspace, shapeIdCounter),
    'text': new TextTool(state, workspace, shapeIdCounter) 
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
    
    const textOnlyOptions = document.getElementById('text-only-options');
    if (textOnlyOptions) {
        if (toolId === 'text' || (toolId === 'select' && state.selectedShapes.length === 1 && state.selectedShapes[0].type === 'text')) {
            textOnlyOptions.style.display = 'flex';
        } else {
            textOnlyOptions.style.display = 'none';
        }
    }
}

state.setTool = setTool;

const shortcutManager = new ShortcutManager(state, workspace);
shortcutManager.register('s', () => setTool('select'));
shortcutManager.register('l', () => setTool('line'));
shortcutManager.register('r', () => setTool('rect'));
shortcutManager.register('c', () => setTool('circle'));
shortcutManager.register('p', () => setTool('multiline'));
shortcutManager.register('t', () => setTool('text')); 
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
state.renderLayers(); 

sidebar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tool-btn');
    if (btn) setTool(btn.id.replace('tool-', ''));
});

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
        });
    }
});

const opacitySlider = document.getElementById('opacity-slider');
const opacityVal = document.getElementById('opacity-val');
opacitySlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    opacityVal.textContent = Math.round(val * 100) + '%';
    state.currentOpacity = val;
    
    if (state.selectedShapes.length > 0) {
        state.selectedShapes.forEach(s => s.setOpacity(val));
    }
});
opacitySlider.addEventListener('change', (e) => {
    if (state.selectedShapes.length > 0) {
        import('./managers/HistoryManager.js').then(({HistoryManager}) => {
            HistoryManager.getInstance(state, workspace).saveState();
            state.selectedShapes.forEach(s => s.setOpacity(parseFloat(e.target.value)));
        });
    }
});

const textInputEl = document.getElementById('text-content-input');
const textSizeEl = document.getElementById('text-size-input');

textInputEl.addEventListener('input', (e) => {
    if(state.selectedShapes.length === 1 && state.selectedShapes[0].type === 'text') {
        state.selectedShapes[0].textProps.content = e.target.value;
        state.selectedShapes[0].applyTextProps();
    }
});
textInputEl.addEventListener('change', (e) => {
    if(state.selectedShapes.length === 1 && state.selectedShapes[0].type === 'text') {
        import('./managers/HistoryManager.js').then(({HistoryManager}) => HistoryManager.getInstance(state, workspace).saveState());
    }
});

textSizeEl.addEventListener('change', (e) => {
    const val = parseInt(e.target.value, 10) || 20;
    state.currentTextSize = val;
    if(state.selectedShapes.length === 1 && state.selectedShapes[0].type === 'text') {
        import('./managers/HistoryManager.js').then(({HistoryManager}) => {
            HistoryManager.getInstance(state, workspace).saveState();
            state.selectedShapes[0].textProps.fontSize = val;
            state.selectedShapes[0].applyTextProps();
        });
    }
});

function setupTextToggle(btnId, stateProp, trueVal, falseVal, propName) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
        const isActive = btn.classList.contains('active');
        const newVal = isActive ? falseVal : trueVal;
        if(isActive) btn.classList.remove('active'); else btn.classList.add('active');
        
        state[stateProp] = !isActive;
        if(state.selectedShapes.length === 1 && state.selectedShapes[0].type === 'text') {
            import('./managers/HistoryManager.js').then(({HistoryManager}) => {
                HistoryManager.getInstance(state, workspace).saveState();
                state.selectedShapes[0].textProps[propName] = newVal;
                state.selectedShapes[0].applyTextProps();
            });
        }
    });
}

function setupTextRadio(btnIds, stateProp, values, propName) {
    btnIds.forEach((id, index) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('click', () => {
            btnIds.forEach(bId => document.getElementById(bId).classList.remove('active'));
            btn.classList.add('active');
            
            const val = values[index];
            state[stateProp] = val;
            if(state.selectedShapes.length === 1 && state.selectedShapes[0].type === 'text') {
                import('./managers/HistoryManager.js').then(({HistoryManager}) => {
                    HistoryManager.getInstance(state, workspace).saveState();
                    state.selectedShapes[0].textProps[propName] = val;
                    state.selectedShapes[0].applyTextProps();
                });
            }
        });
    });
}

setupTextToggle('btn-text-bold', 'currentTextBold', 'bold', 'normal', 'fontWeight');
setupTextToggle('btn-text-italic', 'currentTextItalic', 'italic', 'normal', 'fontStyle');
setupTextToggle('btn-text-underline', 'currentTextUnderline', 'underline', 'none', 'textDecoration');

setupTextRadio(['btn-align-left', 'btn-align-center', 'btn-align-right'], 'currentTextAlign', ['left', 'center', 'right'], 'textAlign');
setupTextRadio(['btn-valign-top', 'btn-valign-middle', 'btn-valign-bottom'], 'currentTextVAlign', ['top', 'middle', 'bottom'], 'verticalAlign');

// [신규] 스냅 토글 체크박스 이벤트 연결
const snapToggleChk = document.getElementById('snap-toggle-chk');
if (snapToggleChk) {
    snapToggleChk.addEventListener('change', (e) => {
        state.isSnapEnabled = e.target.checked;
    });
}

['shape-pos-x', 'shape-pos-y'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', (e) => {
        if (state.selectedShapes.length === 1) {
            import('./managers/HistoryManager.js').then(({HistoryManager}) => {
                HistoryManager.getInstance(state, workspace).saveState();
                
                const shape = state.selectedShapes[0];
                let minX = Infinity, minY = Infinity;
                shape.points.forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); });
                if(minX === Infinity) minX = 0;
                if(minY === Infinity) minY = 0;
                
                const newX = parseFloat(document.getElementById('shape-pos-x').value);
                const newY = parseFloat(document.getElementById('shape-pos-y').value);
                
                if (!isNaN(newX) && !isNaN(newY)) {
                    const dx = newX - minX;
                    const dy = newY - minY;
                    shape.move(dx, dy);
                    
                    if (state.activeTool && typeof state.activeTool.renderSelectionUI === 'function') {
                        state.activeTool.renderSelectionUI();
                    }
                }
            });
        }
    });
});

workspace.addEventListener('mousedown', (e) => { if (state.activeTool) state.activeTool.onMouseDown(e); });
workspace.addEventListener('mousemove', (e) => { if (state.activeTool) state.activeTool.onMouseMove(e); });
workspace.addEventListener('mouseup', (e) => { if (state.activeTool) state.activeTool.onMouseUp(e); });

// [신규] 더블 클릭을 하위 툴로 연결하여 텍스트 에디터를 열도록 처리
workspace.addEventListener('dblclick', (e) => {
    if (state.activeTool && typeof state.activeTool.onDoubleClick === 'function') {
        state.activeTool.onDoubleClick(e);
    }
});

workspace.addEventListener('contextmenu', (e) => {
    e.preventDefault(); if (state.activeTool && typeof state.activeTool.onContextMenu === 'function') state.activeTool.onContextMenu(e);
});

document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#context-menu')) { const cm = document.getElementById('context-menu'); if (cm) cm.style.display = 'none'; }
});


const btnUploadImage = document.getElementById('btn-upload-image');
const imageUploadInput = document.getElementById('image-upload-input');
const toolImageBtn = document.getElementById('tool-image');

btnUploadImage.addEventListener('click', () => imageUploadInput.click());

imageUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) loadFileAsImage(file);
    e.target.value = ''; 
});

window.addEventListener('paste', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.isContentEditable) return;
    
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
            
            if (w > canvasW || h > canvasH) {
                const ratio = Math.min(canvasW / w, canvasH / h);
                w *= ratio;
                h *= ratio;
            }
            
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
                    originalRatio: img.naturalWidth / img.naturalHeight 
                }
            );
            
            shape.points[0] = {x: startX, y: startY};
            shape.points[1] = {x: startX + w, y: startY};
            shape.points[2] = {x: startX + w, y: startY + h};
            shape.points[3] = {x: startX, y: startY + h};
            shape.updateAttributes();
            
            workspace.appendChild(shape.element);
            state.shapes.push(shape);
            
            state.requestSelection(shape);
            setTool('select');
            
            if (state.renderLayers) state.renderLayers();
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