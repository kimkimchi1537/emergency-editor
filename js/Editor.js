import { CONSTANTS, ICONS } from './constants.js';
import { createSVG } from './utils.js';
// [LOG] Editor.js: shapes 폴더의 index.js를 참조하도록 경로 수정
import { LineShape, IconShape, TextShape } from './shapes/index.js';
import { breakLine } from './wallBreaker.js';

/**
 * EvacuationEditor: 피난안내도 에디터의 핵심 클래스
 */
export class EvacuationEditor {
    constructor() {
        // --- 1. 상태 관리 데이터 ---
        this.elements = [];
        this.history = [];
        this.mode = 'select';
        this.selectedIconType = 'extinguisher';
        this.selectedIds = new Set();
        this.paperSize = 'A3';
        this.projectInfo = { name: 'OO빌딩', floor: '1' };
        this.scale = 3;
        
        // --- 2. 인터랙션 상태 ---
        this.isDrawing = false;
        this.isDraggingShape = false;
        this.isDraggingDimension = false;
        this.isRotating = false;
        this.isDragSelecting = false;

        this.startPos = { x: 0, y: 0 };
        this.currentPos = { x: 0, y: 0 };
        this.dragOffset = { x: 0, y: 0 };
        this.rotationStartAngle = 0;
        this.groupRotationCenter = null;
        this.initialElementsState = new Map(); 
        this.ctrlKey = false;
        this.baseGroupRotation = 0;

        // --- 3. DOM 요소 참조 ---
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
        this.setupPaper();
        this.setupTools();
        this.renderIconsToolbar();
        this.renderLegend();
        this.setupEvents();
        if (window.lucide) window.lucide.createIcons();
    }

    getSmartCoords(evt) {
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
            if (el.type === 'line' || el.type === 'arrow') {
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
        if (!this.ctrlKey) return current;
        switch(this.mode) {
            case 'wall': case 'window': case 'route': case 'breaker':
                const dx = Math.abs(current.x - start.x);
                const dy = Math.abs(current.y - start.y);
                return dx > dy ? { x: current.x, y: start.y } : { x: start.x, y: current.y };
            case 'rect_wall':
                const side = Math.max(Math.abs(current.x - start.x), Math.abs(current.y - start.y));
                return {
                    x: start.x + (current.x >= start.x ? side : -side),
                    y: start.y + (current.y >= start.y ? side : -side)
                };
            default: return current;
        }
    }

    renderMergedWalls() {
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
            curr = {x: startWall.x1, y: startWall.y1};
            while(true) {
                const key = getPointKey(curr.x, curr.y);
                const neighbors = adj[key] || [];
                const nextWall = neighbors.find(w => pool.has(w));
                if(nextWall) {
                    pool.delete(nextWall);
                    const p1 = {x: nextWall.x1, y: nextWall.y1};
                    const p2 = {x: nextWall.x2, y: nextWall.y2};
                    const nextPoint = (Math.abs(p1.x - curr.x) < 0.1 && Math.abs(p1.y - curr.y) < 0.1) ? p2 : p1;
                    chain.unshift(nextPoint);
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
        if(d) {
            const path = createSVG("path", { d, fill: "none", stroke: "black", "stroke-width": 6, "stroke-linecap": "butt", "stroke-linejoin": "round" });
            this.mergedWallLayer.appendChild(path);
        }
    }

    getSelectionBounds() {
        if (this.selectedIds.size === 0) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.elements.forEach(el => {
            if (this.selectedIds.has(el.id)) {
                if (el.type === 'line' || el.type === 'arrow') {
                    minX = Math.min(minX, el.x1, el.x2); minY = Math.min(minY, el.y1, el.y2);
                    maxX = Math.max(maxX, el.x1, el.x2); maxY = Math.max(maxY, el.y1, el.y2);
                } else if (el.type === 'icon') {
                    const ic = ICONS[el.iconType];
                    minX = Math.min(minX, el.x); minY = Math.min(minY, el.y);
                    maxX = Math.max(maxX, el.x + ic.w); maxY = Math.max(maxY, el.y + ic.h);
                } else if (el.type === 'text') {
                    minX = Math.min(minX, el.x); minY = Math.min(minY, el.y-16);
                    maxX = Math.max(maxX, el.x + 50); maxY = Math.max(maxY, el.y);
                }
            }
        });
        if (minX === Infinity) return null;
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY, cx: (minX+maxX)/2, cy: (minY+maxY)/2 };
    }

    renderUI(callSource = "Unknown") {
        this.uiLayer.innerHTML = '';
        if (this.isDragSelecting) {
            const x = Math.min(this.startPos.x, this.currentPos.x); const y = Math.min(this.startPos.y, this.currentPos.y);
            const w = Math.abs(this.currentPos.x - this.startPos.x); const h = Math.abs(this.currentPos.y - this.startPos.y);
            const rect = createSVG("rect", { x, y, width: w, height: h, fill: "rgba(0,100,255,0.1)", stroke: "#3b82f6", "stroke-width": 1, "stroke-dasharray": "4,2" });
            this.uiLayer.appendChild(rect);
        }
        if (!this.isRotating) {
            const bounds = this.getSelectionBounds();
            if (bounds) {
                const g = createSVG("g", { "data-type": "rotation-handle", style: "cursor: alias;" });
                const line = createSVG("line", { x1: bounds.cx, y1: bounds.y, x2: bounds.cx, y2: bounds.y - 40, stroke: "#3b82f6", "stroke-width": 1, "stroke-dasharray": "3,3" });
                const circle = createSVG("circle", { cx: bounds.cx, cy: bounds.y - 40, r: 6, fill: "#22c55e", stroke: "white", "stroke-width": 2 });
                g.appendChild(line); g.appendChild(circle);
                this.uiLayer.appendChild(g);
            }
        }
    }

    handleMouseDown(e) {
        if (e.button === 2) return;
        const pos = this.getSmartCoords(e);
        if (pos.x < CONSTANTS.SIDEBAR_WIDTH || pos.y < CONSTANTS.HEADER_HEIGHT) { if(this.mode !== 'select') return; }
        this.startPos = pos; this.currentPos = pos;
        if (this.mode === 'select') {
            const rotateHandle = e.target.closest('[data-type="rotation-handle"]');
            const targetText = e.target.closest('[data-type="dimension-text"]');
            const targetShape = e.target.closest('[data-id]');
            if (rotateHandle) {
                this.isRotating = true;
                const bounds = this.getSelectionBounds();
                this.groupRotationCenter = { x: bounds.cx, y: bounds.cy };
                const dx = pos.x - bounds.cx; const dy = pos.y - bounds.cy;
                this.rotationStartAngle = Math.atan2(dy, dx) * 180 / Math.PI;
                this.initialElementsState.clear();
                this.elements.forEach(el => { if (this.selectedIds.has(el.id)) this.initialElementsState.set(el.id, JSON.parse(JSON.stringify(el))); });
                this.renderUI("RotateStart");
            } else if (targetText) {
                const id = parseInt(targetText.closest('[data-id]').dataset.id);
                this.isDraggingDimension = true;
                this.selectedIds.clear(); this.selectedIds.add(id);
                const el = this.elements.find(el => el.id === id);
                const renderer = new LineShape(el); const ref = renderer.getDimensionRefPoint();
                this.dragOffset = { x: pos.x - (ref.x + el.dimOffset.x), y: pos.y - (ref.y + el.dimOffset.y) };
                this.renderElements(); this.renderUI("DimDragStart");
            } else if (targetShape) {
                const id = parseInt(targetShape.dataset.id);
                const clickedEl = this.elements.find(el => el.id === id);
                if (clickedEl.groupId) {
                    if (!this.selectedIds.has(id)) { if(!this.ctrlKey) this.selectedIds.clear(); this.elements.forEach(el => { if(el.groupId === clickedEl.groupId) this.selectedIds.add(el.id); }); }
                } else { if (!this.selectedIds.has(id)) { if(!this.ctrlKey) this.selectedIds.clear(); this.selectedIds.add(id); } }
                this.isDraggingShape = true;
                this.initialElementsState.clear();
                this.elements.forEach(el => { if (this.selectedIds.has(el.id)) this.initialElementsState.set(el.id, JSON.parse(JSON.stringify(el))); });
                this.renderElements(); this.renderUI("ShapeMouseDown");
            } else {
                this.isDragSelecting = true;
                if (!this.ctrlKey) this.selectedIds.clear();
                this.renderElements(); this.renderUI("DragSelectStart");
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
        if (this.isDragSelecting) this.renderUI("DragSelecting");
        else if (this.isRotating) {
            const center = this.groupRotationCenter;
            const dx = pos.x - center.x; const dy = pos.y - center.y;
            let delta = (Math.atan2(dy, dx) * 180 / Math.PI) - this.rotationStartAngle;
            if (this.ctrlKey) delta = Math.round(delta / 15) * 15;
            const rad = delta * Math.PI / 180; const cos = Math.cos(rad); const sin = Math.sin(rad);
            this.elements.forEach(el => {
                if (this.selectedIds.has(el.id)) {
                    const base = this.initialElementsState.get(el.id);
                    const rotatePoint = (x, y) => ({ x: center.x + (x - center.x) * cos - (y - center.y) * sin, y: center.y + (x - center.x) * sin + (y - center.y) * cos });
                    if (el.type === 'line' || el.type === 'arrow') { const p1 = rotatePoint(base.x1, base.y1); const p2 = rotatePoint(base.x2, base.y2); el.x1 = p1.x; el.y1 = p1.y; el.x2 = p2.x; el.y2 = p2.y; }
                    else {
                        let cx = base.x, cy = base.y; if(el.type === 'icon') { const ic = ICONS[el.iconType]; cx += ic.w/2; cy += ic.h/2; }
                        const p = rotatePoint(cx, cy); if(el.type === 'icon') { const ic = ICONS[el.iconType]; el.x = p.x - ic.w/2; el.y = p.y - ic.h/2; } else { el.x = p.x; el.y = p.y; }
                        el.rotation = (base.rotation || 0) + delta;
                    }
                }
            });
            this.renderElements(); this.renderUI("Rotating");
        } else if (this.isDraggingDimension) {
            const id = this.selectedIds.values().next().value;
            const el = this.elements.find(el => el.id === id);
            const renderer = new LineShape(el); const ref = renderer.getDimensionRefPoint();
            el.dimOffset = { x: pos.x - ref.x - this.dragOffset.x, y: pos.y - ref.y - this.dragOffset.y };
            this.renderElements(); this.renderUI("DimDragging");
        } else if (this.isDraggingShape) {
            let dx = pos.x - this.startPos.x, dy = pos.y - this.startPos.y;
            if(this.ctrlKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
            this.elements.forEach(el => {
                if (this.selectedIds.has(el.id)) {
                    const base = this.initialElementsState.get(el.id);
                    if (el.type === 'line' || el.type === 'arrow') { el.x1 = base.x1 + dx; el.y1 = base.y1 + dy; el.x2 = base.x2 + dx; el.y2 = base.y2 + dy; }
                    else { el.x = base.x + dx; el.y = base.y + dy; }
                }
            });
            this.renderElements(); this.renderUI("ShapeDragging");
        }
        if (this.isDrawing) this.renderTempShape();
    }

    handleMouseUp() {
        if (this.isDragSelecting) {
            this.isDragSelecting = false;
            const xMin = Math.min(this.startPos.x, this.currentPos.x), xMax = Math.max(this.startPos.x, this.currentPos.x);
            const yMin = Math.min(this.startPos.y, this.currentPos.y), yMax = Math.max(this.startPos.y, this.currentPos.y);
            this.elements.forEach(el => {
                let hit = false;
                if (el.type === 'line' || el.type === 'arrow') { const cx = (el.x1+el.x2)/2, cy = (el.y1+el.y2)/2; if (cx >= xMin && cx <= xMax && cy >= yMin && cy <= yMax) hit = true; }
                else if (el.x >= xMin && el.x <= xMax && el.y >= yMin && el.y <= yMax) hit = true;
                if (hit) this.selectedIds.add(el.id);
            });
            this.renderElements(); this.renderUI("DragSelectEnd");
        }
        if (this.isRotating || this.isDraggingShape || this.isDraggingDimension) { this.isRotating = false; this.isDraggingShape = false; this.isDraggingDimension = false; this.saveHistory(); this.renderUI("MouseUp"); }
        if (this.isDrawing) {
            this.isDrawing = false; this.tempLayer.innerHTML = '';
            const endPos = this.getSnappedPos(this.startPos, this.currentPos);
            if (this.startPos.x === endPos.x && this.startPos.y === endPos.y) return;
            const now = Date.now();
            if (['wall', 'window', 'route'].includes(this.mode)) this.addElement({ id: now, type: 'line', subType: this.mode, x1: this.startPos.x, y1: this.startPos.y, x2: endPos.x, y2: endPos.y, dimOffset: {x:0, y:-20}, rotation: 0 });
            else if (this.mode === 'breaker') this.breakWalls(this.startPos, endPos);
            else if (this.mode === 'eraser') this.eraseArea(this.startPos, endPos);
        }
    }

    breakWalls(p1, p2) {
        const rect = { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y), w: Math.abs(p2.x-p1.x), h: Math.abs(p2.y-p1.y) };
        let changed = false; const newElements = [];
        this.elements.forEach(el => {
            if (el.type === 'line' && (el.subType === 'wall' || el.subType === 'window')) {
                const fragments = breakLine(el, rect);
                if (fragments.length === 1 && fragments[0].x1 === el.x1 && fragments[0].y1 === el.y1) newElements.push(el);
                else { changed = true; fragments.forEach(f => newElements.push({...el, id: Date.now()+Math.random(), x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2, p1Pierced: f.p1Pierced, p2Pierced: f.p2Pierced })); }
            } else newElements.push(el);
        });
        if (changed) { this.saveHistory(); this.elements = newElements; this.renderElements(); }
    }

    addElement(el, save = true) { if (save) this.saveHistory(); this.elements.push(el); this.renderElements(); }
    deleteSelected() { if (this.selectedIds.size === 0) return; this.saveHistory(); this.elements = this.elements.filter(el => !this.selectedIds.has(el.id)); this.selectedIds.clear(); this.renderElements(); }
    eraseArea(p1, p2) {
        const xMin = Math.min(p1.x, p2.x), xMax = Math.max(p1.x, p2.x), yMin = Math.min(p1.y, p2.y), yMax = Math.max(p1.y, p2.y);
        const prevLen = this.elements.length;
        this.elements = this.elements.filter(el => {
            let ex, ey, ew, eh; if (el.type === 'line') { ex = Math.min(el.x1, el.x2); ey = Math.min(el.y1, el.y2); ew = Math.abs(el.x2-el.x1); eh = Math.abs(el.y2-el.y1); }
            else { ex = el.x; ey = el.y; if(el.type === 'icon') { const ic = ICONS[el.iconType]; ew = ic.w; eh = ic.h; } else { ew = 50; eh = 16; } }
            return (ex > xMax || ex + ew < xMin || ey > yMax || ey + eh < yMin);
        });
        if(this.elements.length !== prevLen) { this.saveHistory(); this.renderElements(); }
    }

    cancelAction() { this.isDrawing = false; this.isDraggingShape = false; this.isDraggingDimension = false; this.isRotating = false; this.isDragSelecting = false; this.tempLayer.innerHTML = ''; this.uiLayer.innerHTML = ''; this.setMode('select'); }
    saveHistory() { this.history.push(JSON.parse(JSON.stringify(this.elements))); if (this.history.length > 30) this.history.shift(); }
    undo() { if (this.history.length === 0) return; this.elements = this.history.pop(); this.selectedIds.clear(); this.renderElements(); this.renderUI("Undo"); }
    handleImage(e) { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = (evt) => { this.bgImageEl.setAttribute('href', evt.target.result); this.bgImageEl.style.display = 'block'; document.getElementById('image-controls').classList.remove('hidden'); }; r.readAsDataURL(f); }

    renderElements() {
        this.elementsLayer.innerHTML = ''; this.renderMergedWalls();
        this.elements.forEach(el => {
            let shape; switch(el.type) { case 'line': case 'arrow': shape = new LineShape(el); break; case 'icon': shape = new IconShape(el); break; case 'text': shape = new TextShape(el); break; }
            if (shape) this.elementsLayer.appendChild(shape.render(this.selectedIds.has(el.id), this.isRotating));
        });
    }

    renderTempShape() {
        this.tempLayer.innerHTML = ''; const endPos = this.getSnappedPos(this.startPos, this.currentPos);
        if (['wall', 'window', 'route'].includes(this.mode)) {
            const s = CONSTANTS.STYLES[this.mode] || CONSTANTS.STYLES.wall;
            const l = createSVG("line", { x1: this.startPos.x, y1: this.startPos.y, x2: endPos.x, y2: endPos.y, stroke: s.stroke, "stroke-width": s.width, "stroke-dasharray": "5,5" });
            this.tempLayer.appendChild(l);
        } else if (['rect_wall', 'eraser', 'breaker'].includes(this.mode)) {
            const x = Math.min(this.startPos.x, endPos.x), y = Math.min(this.startPos.y, endPos.y), w = Math.abs(endPos.x-this.startPos.x), h = Math.abs(endPos.y-this.startPos.y);
            const r = createSVG("rect", { x, y, width: w, height: h, fill: this.mode === 'eraser' ? 'rgba(255,0,0,0.2)' : (this.mode === 'breaker' ? 'rgba(255,165,0,0.2)' : 'none'), stroke: this.mode === 'eraser' ? 'red' : (this.mode === 'breaker' ? 'orange' : 'black'), "stroke-width": this.mode === 'rect_wall' ? 6 : 1 });
            this.tempLayer.appendChild(r);
        }
    }

    setupPaper() {
        const size = CONSTANTS.PAPER_SIZES[this.paperSize]; const width = size.width * this.scale, height = size.height * this.scale;
        this.paperContainer.style.width = `${width}px`; this.paperContainer.style.height = `${height}px`;
        this.bgImageEl.setAttribute('width', width - CONSTANTS.SIDEBAR_WIDTH); this.bgImageEl.setAttribute('height', height - CONSTANTS.HEADER_HEIGHT);
        this.bgImageEl.setAttribute('x', CONSTANTS.SIDEBAR_WIDTH); this.bgImageEl.setAttribute('y', CONSTANTS.HEADER_HEIGHT);
        document.getElementById('legend-group').setAttribute('transform', `translate(0, ${height - CONSTANTS.LEGEND_HEIGHT})`);
        document.getElementById('header-title').textContent = `${this.projectInfo.name} ${this.projectInfo.floor}층`;
    }

    renderIconsToolbar() {
        const container = document.getElementById('icon-tools'); if(!container) return; container.innerHTML = '';
        for (const [key, icon] of Object.entries(ICONS)) {
            const btn = document.createElement('button'); btn.className = `tool-btn w-full p-2 rounded flex flex-col items-center border border-transparent hover:bg-gray-50 transition`;
            btn.innerHTML = `<div class="w-8 h-8 mb-1 pointer-events-none"><svg viewBox="0 0 ${icon.w} ${icon.h}">${icon.svg}</svg></div><span class="text-[10px] text-gray-600 font-medium pointer-events-none">${icon.label}</span>`;
            btn.addEventListener('click', () => { this.setMode('icon'); this.selectedIconType = key; this.highlightTool(btn); });
            container.appendChild(btn);
        }
    }

    renderLegend() {
        const container = document.getElementById('legend-items'); if(!container) return; let x = 0;
        const items = [{ label: '소화기', color: 'red', type: 'rect' }, { label: '발신기', color: 'red', type: 'circle' }, { label: '비상구', color: 'green', type: 'rect' }, { label: '현위치', color: 'blue', type: 'circle' }, { label: '피난동선', color: '#32CD32', type: 'line' }];
        items.forEach(item => {
            let shape = ''; if(item.type === 'rect') shape = `<rect width="15" height="15" fill="${item.color}" rx="2" />`; else if(item.type === 'circle') shape = `<circle cx="7.5" cy="7.5" r="7.5" fill="${item.color}" />`; else shape = `<line x1="0" y1="8" x2="20" y2="8" stroke="${item.color}" stroke-width="4" />`;
            const g = createSVG("g", { transform: `translate(${x}, 0)` }); g.innerHTML = `${shape}<text x="25" y="13" font-size="12" fill="#374151">${item.label}</text>`;
            container.appendChild(g); x += 90;
        });
    }

    highlightTool(activeBtn) { document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active')); if(activeBtn) activeBtn.classList.add('active'); }
    setMode(mode) { this.mode = mode; this.selectedIds.clear(); this.renderElements(); this.renderUI("ModeChange"); if(mode !== 'icon') this.highlightTool(document.querySelector(`.tool-btn[data-mode="${mode}"]`)); }

    setupTools() {
        document.querySelectorAll('.tool-btn[data-mode]').forEach(btn => { if (btn.dataset.mode !== 'icon') btn.addEventListener('click', () => this.setMode(btn.dataset.mode)); });
        document.getElementById('input-name').addEventListener('input', (e) => { this.projectInfo.name = e.target.value; this.setupPaper(); });
        document.getElementById('input-floor').addEventListener('input', (e) => { this.projectInfo.floor = e.target.value; this.setupPaper(); });
        document.getElementById('select-paper').addEventListener('change', (e) => { this.paperSize = e.target.value; this.setupPaper(); });
        document.getElementById('btn-grid').addEventListener('click', () => { const gl = document.getElementById('grid-layer'); gl.style.display = gl.style.display === 'none' ? 'block' : 'none'; });
        document.getElementById('file-upload').addEventListener('change', (e) => this.handleImage(e));
        document.getElementById('bg-opacity').addEventListener('input', (e) => this.bgImageEl.setAttribute('opacity', e.target.value));
        document.getElementById('btn-remove-bg').addEventListener('click', () => { this.bgImageEl.setAttribute('href', ''); this.bgImageEl.style.display = 'none'; document.getElementById('image-controls').classList.add('hidden'); });
        document.getElementById('btn-undo').addEventListener('click', () => this.undo());
    }

    setupEvents() {
        window.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) return;
            if (e.key === 'Control') { e.preventDefault(); this.ctrlKey = true; if(this.isDrawing) this.renderTempShape(); }
            if (e.key === 'Escape') this.cancelAction();
            if (e.key === 'Delete' || e.key === 'Backspace') this.deleteSelected();
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') this.undo();
            if (e.key.toLowerCase() === 's') this.setMode('select');
        });
        window.addEventListener('keyup', (e) => { if (e.key === 'Control') { this.ctrlKey = false; if(this.isDrawing) this.renderTempShape(); } });
        this.svg.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.svg.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.svg.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.svg.addEventListener('contextmenu', (e) => { e.preventDefault(); this.cancelAction(); });
    }
}