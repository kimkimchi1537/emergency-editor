import { CONSTANTS, ICONS } from './constants.js';
import { createSVG } from './utils.js';
import { LineShape, IconShape, TextShape, DimensionShape, RectShape } from './shapes/index.js';
import { breakLine } from './wallBreaker.js';
import { MeasurementStrategies } from './measurementStrategies.js';
import { DimensionLayout } from './dimensionLayout.js';

export class EvacuationEditor {
    constructor() {
        console.log("[LOG] js/Editor.js: constructor 시작");
        this.elements = [];
        this.history = [];
        this.mode = 'select';
        this.selectedIconType = 'extinguisher';
        this.selectedIds = new Set();
        this.paperSize = 'A3';
        this.projectInfo = { name: 'OO빌딩', floor: '1' };
        this.scale = 3;
        this.isDrawing = false;
        this.isDraggingShape = false;
        this.isDraggingDimension = false;
        this.isRotating = false;
        this.isDragSelecting = false;
        this.startPos = { x: 0, y: 0 };
        this.currentPos = { x: 0, y: 0 };
        this.dragOffset = { x: 0, y: 0 };
        this.initialElementsState = new Map(); 
        this.ctrlKey = false;
        this.svg = document.getElementById('main-svg');
        this.mergedWallLayer = document.getElementById('merged-wall-layer');
        this.elementsLayer = document.getElementById('elements-layer');
        this.uiLayer = document.getElementById('ui-layer'); 
        this.tempLayer = document.getElementById('temp-layer');
        this.paperContainer = document.getElementById('paper-container');
        this.bgImageEl = document.getElementById('bg-image-el');
        this.posInfo = document.getElementById('snapped-pos-info');
        this.snapMarker = document.getElementById('snap-marker');
        this.init();
    }

    init() {
        console.log("[LOG] js/Editor.js: init 호출");
        this.setupPaper();
        this.setupTools();
        this.renderIconsToolbar();
        this.renderLegend();
        this.setupEvents();
        if (window.lucide) window.lucide.createIcons();
    }

    getSmartCoords(evt) {
        console.log("[LOG] js/Editor.js: getSmartCoords 호출");
        const pt = this.svg.createSVGPoint();
        pt.x = evt.clientX; pt.y = evt.clientY;
        const ctm = this.svg.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };
        const rawPos = pt.matrixTransform(ctm.inverse());
        let snappedVertex = null;
        const threshold = CONSTANTS.VERTEX_SNAP_DIST;
        const check = (x, y) => {
            const dist = Math.sqrt(Math.pow(rawPos.x - x, 2) + Math.pow(rawPos.y - y, 2));
            return dist < threshold ? { x, y, dist } : null;
        };
        let minDist = Infinity;
        for (const el of this.elements) {
            if (el.type === 'line') {
                const s = check(el.x1, el.y1); if (s && s.dist < minDist) { minDist = s.dist; snappedVertex = s; }
                const e = check(el.x2, el.y2); if (e && e.dist < minDist) { minDist = e.dist; snappedVertex = e; }
            }
        }
        if (snappedVertex) {
            this.snapMarker.setAttribute("cx", snappedVertex.x);
            this.snapMarker.setAttribute("cy", snappedVertex.y);
            this.snapMarker.style.display = "block";
            return { x: snappedVertex.x, y: snappedVertex.y };
        }
        this.snapMarker.style.display = "none";
        const gridSnapped = {
            x: Math.round(rawPos.x / CONSTANTS.SNAP_INTERVAL) * CONSTANTS.SNAP_INTERVAL,
            y: Math.round(rawPos.y / CONSTANTS.SNAP_INTERVAL) * CONSTANTS.SNAP_INTERVAL
        };
        this.posInfo.textContent = `X:${gridSnapped.x}, Y:${gridSnapped.y}`;
        return gridSnapped;
    }

    getSnappedPos(start, current) {
        console.log("[LOG] js/Editor.js: getSnappedPos 호출");
        if (!this.ctrlKey) return current;
        switch(this.mode) {
            case 'wall': case 'window': case 'route': case 'breaker':
                const dx = Math.abs(current.x - start.x);
                const dy = Math.abs(current.y - start.y);
                return dx > dy ? { x: current.x, y: start.y } : { x: start.x, y: current.y };
            case 'rect_wall':
                const side = Math.max(Math.abs(current.x - start.x), Math.abs(current.y - start.y));
                return { x: start.x + (current.x >= start.x ? side : -side), y: start.y + (current.y >= start.y ? side : -side) };
            default: return current;
        }
    }

    renderMergedWalls() {
        console.log("[LOG] js/Editor.js: renderMergedWalls 호출");
        this.mergedWallLayer.innerHTML = '';
        const walls = this.elements.filter(el => el.type === 'line' && el.subType === 'wall');
        if (walls.length === 0) return;
        const getPointKey = (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;
        const adj = {};
        walls.forEach(w => {
            const p1 = getPointKey(w.x1, w.y1); const p2 = getPointKey(w.x2, w.y2);
            if(!adj[p1]) adj[p1] = []; adj[p1].push(w);
            if(!adj[p2]) adj[p2] = []; adj[p2].push(w);
        });
        const chains = [];
        const pool = new Set(walls);
        while(pool.size > 0) {
            const startWall = pool.values().next().value;
            pool.delete(startWall);
            const chain = [ {x: startWall.x1, y: startWall.y1}, {x: startWall.x2, y: startWall.y2} ];
            let curr = {x: startWall.x2, y: startWall.y2};
            while(true) {
                const key = getPointKey(curr.x, curr.y);
                const neighbors = adj[key] || [];
                const nextWall = neighbors.find(w => pool.has(w));
                if(nextWall) {
                    pool.delete(nextWall);
                    const p1 = {x: nextWall.x1, y: nextWall.y1};
                    const p2 = {x: nextWall.x2, y: nextWall.y2};
                    const nextPoint = (Math.abs(p1.x - curr.x) < 0.1 && Math.abs(p1.y - curr.y) < 0.1) ? p2 : p1;
                    chain.push(nextPoint);
                    curr = nextPoint;
                } else break;
            }
            chains.push(chain);
        }
        let d = "";
        chains.forEach(chain => {
            if(chain.length < 2) return;
            d += `M ${chain[0].x} ${chain[0].y} `;
            for(let i=1; i<chain.length; i++) d += `L ${chain[i].x} ${chain[i].y} `;
        });
        if(d) this.mergedWallLayer.appendChild(createSVG("path", { d, fill: "none", stroke: "black", "stroke-width": 6, "stroke-linecap": "butt", "stroke-linejoin": "round" }));
    }

    renderElements() {
        console.log("[LOG] js/Editor.js: renderElements 호출");
        this.elementsLayer.innerHTML = ''; 
        this.renderMergedWalls();
        this.elements.forEach(el => {
            if (el.type === 'dimension') return;
            let shape;
            switch(el.type) { 
                case 'line': case 'arrow': shape = new LineShape(el); break; 
                case 'icon': shape = new IconShape(el); break; 
                case 'text': shape = new TextShape(el); break; 
            }
            if (shape) this.elementsLayer.appendChild(shape.render(this.selectedIds.has(el.id), this.isRotating));
        });
        this.elements.forEach(el => {
            if (el.type !== 'dimension') return;
            const parent = this.elements.find(p => p.id === el.parentId);
            const dimShape = new DimensionShape(el);
            const rendered = dimShape.render(this.selectedIds.has(el.id), this.isRotating, parent);
            if (rendered) this.elementsLayer.appendChild(rendered);
        });
    }

    handleMouseDown(e) {
        console.log("[LOG] js/Editor.js: handleMouseDown 호출");
        if (e.button === 2) return;
        const pos = this.getSmartCoords(e);
        if (pos.x < CONSTANTS.SIDEBAR_WIDTH || pos.y < CONSTANTS.HEADER_HEIGHT) { if(this.mode !== 'select') return; }
        this.startPos = pos; this.currentPos = pos;
        if (this.mode === 'select') {
            const targetDim = e.target.closest('[data-type="dimension-text"]');
            const targetShape = e.target.closest('[data-id]');
            if (targetDim) {
                const id = parseInt(targetDim.closest('[data-id]').dataset.id);
                this.isDraggingDimension = true;
                this.selectedIds.clear(); this.selectedIds.add(id);
                const el = this.elements.find(e => e.id === id);
                this.dragOffset = { x: pos.x - el.dimOffset.x, y: pos.y - el.dimOffset.y };
                this.renderElements();
            } else if (targetShape) {
                const id = parseInt(targetShape.dataset.id);
                if (!this.selectedIds.has(id)) { if(!this.ctrlKey) this.selectedIds.clear(); this.selectedIds.add(id); }
                this.isDraggingShape = true;
                this.initialElementsState.clear();
                this.elements.forEach(el => { if (this.selectedIds.has(el.id)) this.initialElementsState.set(el.id, JSON.parse(JSON.stringify(el))); });
                this.renderElements();
            } else {
                this.isDragSelecting = true;
                if (!this.ctrlKey) this.selectedIds.clear();
                this.renderElements();
            }
        } else if (this.mode === 'text') {
            const text = prompt("텍스트 입력:", "사무실");
            if (text) this.addElement({ id: Date.now(), type: 'text', text, x: pos.x, y: pos.y, fontSize: 16, rotation: 0 });
        } else if (this.mode === 'icon') {
            const ic = ICONS[this.selectedIconType];
            this.addElement({ id: Date.now(), type: 'icon', iconType: this.selectedIconType, x: pos.x - ic.w/2, y: pos.y - ic.h/2, rotation: 0 });
        } else this.isDrawing = true;
    }

    handleMouseMove(e) {
        const pos = this.getSmartCoords(e); this.currentPos = pos;
        if (this.isDraggingDimension) {
            const id = this.selectedIds.values().next().value;
            const el = this.elements.find(e => e.id === id);
            el.dimOffset = { x: pos.x - this.dragOffset.x, y: pos.y - this.dragOffset.y };
            this.renderElements();
        } else if (this.isDraggingShape) {
            let dx = pos.x - this.startPos.x, dy = pos.y - this.startPos.y;
            this.elements.forEach(el => {
                if (this.selectedIds.has(el.id)) {
                    const base = this.initialElementsState.get(el.id);
                    if (el.type === 'line' || el.type === 'arrow') { el.x1 = base.x1 + dx; el.y1 = base.y1 + dy; el.x2 = base.x2 + dx; el.y2 = base.y2 + dy; }
                    else if (el.type === 'rect_group') { el.x1 = base.x1 + dx; el.y1 = base.y1 + dy; el.x2 = base.x2 + dx; el.y2 = base.y2 + dy; }
                    else { el.x = base.x + dx; el.y = base.y + dy; }
                }
            });
            this.renderElements();
        }
        if (this.isDrawing) this.renderTempShape();
    }

    handleMouseUp() {
        console.log("[LOG] js/Editor.js: handleMouseUp 호출");
        this.isDragSelecting = false;
        this.isDraggingShape = false;
        this.isDraggingDimension = false;
        if (this.isDrawing) {
            this.isDrawing = false;
            this.tempLayer.innerHTML = '';
            const endPos = this.getSnappedPos(this.startPos, this.currentPos);
            if (this.startPos.x === endPos.x && this.startPos.y === endPos.y) return;
            const now = Date.now();
            let newElements = [];
            if (['wall', 'window', 'route'].includes(this.mode)) {
                newElements = LineShape.onDrawFinish(now, this.startPos, endPos, this.mode);
            } else if (this.mode === 'rect_wall') {
                newElements = RectShape.onDrawFinish(now, this.startPos, endPos);
            }
            if (newElements.length > 0) {
                newElements.forEach((el, idx) => {
                    this.addElement(el, idx === newElements.length - 1);
                });
                this.saveHistory();
            }
        } else if (this.mode === 'breaker') {
            const endPos = this.getSnappedPos(this.startPos, this.currentPos);
            this.breakWalls(this.startPos, endPos);
        } else if (this.mode === 'eraser') {
            const endPos = this.getSnappedPos(this.startPos, this.currentPos);
            this.eraseArea(this.startPos, endPos);
        }
        this.renderElements();
    }

    breakWalls(p1, p2) {
        console.log("[LOG] js/Editor.js: breakWalls 호출");
        const rect = { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y), w: Math.abs(p2.x-p1.x), h: Math.abs(p2.y-p1.y) };
        let changed = false; 
        const newElements = [];
        this.elements.forEach(el => {
            if (el.type === 'line' && (el.subType === 'wall' || el.subType === 'window')) {
                const fragments = breakLine(el, rect);
                if (fragments.length === 1 && fragments[0].x1 === el.x1 && fragments[0].y1 === el.y1) newElements.push(el);
                else { 
                    changed = true; 
                    fragments.forEach(f => newElements.push({...el, id: Date.now()+Math.random(), x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2, p1Pierced: f.p1Pierced, p2Pierced: f.p2Pierced })); 
                }
            } else newElements.push(el);
        });
        if (changed) { this.saveHistory(); this.elements = newElements; this.renderElements(); }
    }

    eraseArea(p1, p2) {
        console.log("[LOG] js/Editor.js: eraseArea 호출");
        const xMin = Math.min(p1.x, p2.x), xMax = Math.max(p1.x, p2.x), yMin = Math.min(p1.y, p2.y), yMax = Math.max(p1.y, p2.y);
        const prevLen = this.elements.length;
        this.elements = this.elements.filter(el => {
            let ex, ey, ew, eh; 
            if (el.type === 'line') { ex = Math.min(el.x1, el.x2); ey = Math.min(el.y1, el.y2); ew = Math.abs(el.x2-el.x1); eh = Math.abs(el.y2-el.y1); }
            else { ex = el.x; ey = el.y; if(el.type === 'icon') { const ic = ICONS[el.iconType]; ew = ic.w; eh = ic.h; } else { ew = 50; eh = 16; } }
            return (ex > xMax || ex + ew < xMin || ey > yMax || ey + eh < yMin);
        });
        if(this.elements.length !== prevLen) { this.saveHistory(); this.renderElements(); }
    }

    addElement(el, render = true) {
        console.log(`[LOG] js/Editor.js: addElement 호출 (Type: ${el.type}, ID: ${el.id})`);
        this.elements.push(el);
        if (render) this.renderElements();
    }

    deleteSelected() {
        console.log("[LOG] js/Editor.js: deleteSelected 호출");
        if (this.selectedIds.size === 0) return;
        this.saveHistory();
        const toDelete = new Set(this.selectedIds);
        this.elements.forEach(el => { if (toDelete.has(el.parentId)) toDelete.add(el.id); });
        this.elements = this.elements.filter(el => !toDelete.has(el.id));
        this.selectedIds.clear();
        this.renderElements();
    }

    renderTempShape() {
        console.log("[LOG] js/Editor.js: renderTempShape 호출");
        this.tempLayer.innerHTML = '';
        const endPos = this.getSnappedPos(this.startPos, this.currentPos);
        if (['wall', 'window', 'route'].includes(this.mode)) {
            this.tempLayer.appendChild(createSVG("line", { x1: this.startPos.x, y1: this.startPos.y, x2: endPos.x, y2: endPos.y, stroke: "#3b82f6", "stroke-width": 2, "stroke-dasharray": "5,5" }));
            const layout = DimensionLayout.getLineLayout(this.startPos, endPos);
            const dist = MeasurementStrategies.line.format(MeasurementStrategies.line.calculate(this.startPos, endPos));
            const text = createSVG("text", { x: layout.x, y: layout.y, fill: "#3b82f6", "font-size": 12, "text-anchor": "middle" });
            text.textContent = dist;
            this.tempLayer.appendChild(text);
        } else if (this.mode === 'rect_wall') {
            const minX = Math.min(this.startPos.x, endPos.x), minY = Math.min(this.startPos.y, endPos.y), w = Math.abs(endPos.x-this.startPos.x), h = Math.abs(endPos.y-this.startPos.y);
            this.tempLayer.appendChild(createSVG("rect", { x: minX, y: minY, width: w, height: h, fill: "none", stroke: "#3b82f6", "stroke-width": 2, "stroke-dasharray": "5,5" }));
        }
    }

    saveHistory() { 
        console.log("[LOG] js/Editor.js: saveHistory 호출");
        this.history.push(JSON.parse(JSON.stringify(this.elements))); 
        if (this.history.length > 30) this.history.shift(); 
    }

    undo() {
        console.log("[LOG] js/Editor.js: undo 호출");
        if (this.history.length === 0) return;
        this.elements = this.history.pop();
        this.selectedIds.clear();
        this.renderElements();
    }

    setupPaper() {
        console.log("[LOG] js/Editor.js: setupPaper 호출");
        const size = CONSTANTS.PAPER_SIZES[this.paperSize];
        const width = size.width * this.scale;
        const height = size.height * this.scale;
        this.paperContainer.style.width = `${width}px`;
        this.paperContainer.style.height = `${height}px`;
        this.bgImageEl.setAttribute('width', width - CONSTANTS.SIDEBAR_WIDTH);
        this.bgImageEl.setAttribute('height', height - CONSTANTS.HEADER_HEIGHT);
        this.bgImageEl.setAttribute('x', CONSTANTS.SIDEBAR_WIDTH);
        this.bgImageEl.setAttribute('y', CONSTANTS.HEADER_HEIGHT);
        document.getElementById('legend-group').setAttribute('transform', `translate(0, ${height - CONSTANTS.LEGEND_HEIGHT})`);
        document.getElementById('header-title').textContent = `${this.projectInfo.name} ${this.projectInfo.floor}층`;
    }

    renderIconsToolbar() {
        console.log("[LOG] js/Editor.js: renderIconsToolbar 호출");
        const container = document.getElementById('icon-tools');
        if(!container) return;
        container.innerHTML = '';
        for (const [key, icon] of Object.entries(ICONS)) {
            const btn = document.createElement('button');
            btn.className = `tool-btn w-full p-2 rounded flex flex-col items-center border border-transparent hover:bg-gray-50 transition`;
            btn.innerHTML = `<div class="w-8 h-8 mb-1 pointer-events-none"><svg viewBox="0 0 ${icon.w} ${icon.h}">${icon.svg}</svg></div><span class="text-[10px] text-gray-600 font-medium pointer-events-none">${icon.label}</span>`;
            btn.addEventListener('click', () => {
                this.setMode('icon');
                this.selectedIconType = key;
                this.highlightTool(btn);
            });
            container.appendChild(btn);
        }
    }

    renderLegend() {
        console.log("[LOG] js/Editor.js: renderLegend 호출");
        const container = document.getElementById('legend-items');
        if(!container) return;
        let x = 0;
        const items = [
            { label: '소화기', color: 'red', type: 'rect' },
            { label: '발신기', color: 'red', type: 'circle' },
            { label: '비상구', color: 'green', type: 'rect' },
            { label: '현위치', color: 'blue', type: 'circle' },
            { label: '피난동선', color: '#32CD32', type: 'line' }
        ];
        items.forEach(item => {
            let shape = '';
            if(item.type === 'rect') shape = `<rect width="15" height="15" fill="${item.color}" rx="2" />`;
            else if(item.type === 'circle') shape = `<circle cx="7.5" cy="7.5" r="7.5" fill="${item.color}" />`;
            else shape = `<line x1="0" y1="8" x2="20" y2="8" stroke="${item.color}" stroke-width="4" />`;
            const g = createSVG("g", { transform: `translate(${x}, 0)` });
            g.innerHTML = `${shape}<text x="25" y="13" font-size="12" fill="#374151">${item.label}</text>`;
            container.appendChild(g);
            x += 90;
        });
    }

    highlightTool(activeBtn) {
        console.log("[LOG] js/Editor.js: highlightTool 호출");
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        if(activeBtn) activeBtn.classList.add('active');
    }

    setMode(mode) {
        console.log(`[LOG] js/Editor.js: setMode 호출 (Mode: ${mode})`);
        this.mode = mode;
        this.selectedIds.clear();
        this.renderElements();
        const activeBtn = document.querySelector(`.tool-btn[data-mode="${mode}"]`);
        if(activeBtn) this.highlightTool(activeBtn);
    }

    setupTools() {
        console.log("[LOG] js/Editor.js: setupTools 호출");
        document.querySelectorAll('.tool-btn[data-mode]').forEach(btn => {
            if (btn.dataset.mode !== 'icon') btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
        });
        document.getElementById('input-name').addEventListener('input', (e) => {
            this.projectInfo.name = e.target.value;
            this.setupPaper();
        });
        document.getElementById('input-floor').addEventListener('input', (e) => {
            this.projectInfo.floor = e.target.value;
            this.setupPaper();
        });
        document.getElementById('select-paper').addEventListener('change', (e) => {
            this.paperSize = e.target.value;
            this.setupPaper();
        });
        document.getElementById('btn-grid').addEventListener('click', () => {
            const gl = document.getElementById('grid-layer');
            gl.style.display = gl.style.display === 'none' ? 'block' : 'none';
        });
        document.getElementById('file-upload').addEventListener('change', (e) => {
            const f = e.target.files[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = (evt) => {
                this.bgImageEl.setAttribute('href', evt.target.result);
                this.bgImageEl.style.display = 'block';
                document.getElementById('image-controls').classList.remove('hidden');
            };
            r.readAsDataURL(f);
        });
        document.getElementById('bg-opacity').addEventListener('input', (e) => this.bgImageEl.setAttribute('opacity', e.target.value));
        document.getElementById('btn-remove-bg').addEventListener('click', () => {
            this.bgImageEl.setAttribute('href', '');
            this.bgImageEl.style.display = 'none';
            document.getElementById('image-controls').classList.add('hidden');
        });
        document.getElementById('btn-undo').addEventListener('click', () => this.undo());
    }

    setupEvents() {
        console.log("[LOG] js/Editor.js: setupEvents 호출");
        window.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) return;
            if (e.key === 'Control') { e.preventDefault(); this.ctrlKey = true; }
            if (e.key === 'Escape') this.setMode('select');
            if (e.key === 'Delete' || e.key === 'Backspace') this.deleteSelected();
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') this.undo();
        });
        window.addEventListener('keyup', (e) => { if (e.key === 'Control') this.ctrlKey = false; });
        this.svg.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.svg.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.svg.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.svg.addEventListener('contextmenu', (e) => e.preventDefault());
    }
}