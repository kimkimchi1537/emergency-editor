import { CONSTANTS, ICONS } from './constants.js';
import { createSVG } from './utils.js';
import { LineShape, IconShape, TextShape, DimensionShape, RectShape } from './shapes/index.js';
import { breakLine } from './wallBreaker.js';
import { MeasurementStrategies } from './measurementStrategies.js';
import { DimensionLayout } from './dimensionLayout.js';

export class EvacuationEditor {
    constructor() {
        console.log("[LOG] js/Editor.js: constructor 실행 - 에디터 엔진 인스턴스화 시작");
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
        console.log("[LOG] js/Editor.js: init() - 초기 설정 프로세스 가동");
        this.setupPaper();
        this.setupTools();
        this.renderIconsToolbar();
        this.renderLegend();
        this.setupEvents();
        if (window.lucide) {
            console.log("[LOG] js/Editor.js: lucide 아이콘 생성 실행");
            window.lucide.createIcons();
        }
    }

    getSmartCoords(evt) {
        const pt = this.svg.createSVGPoint();
        pt.x = evt.clientX; pt.y = evt.clientY;
        const ctm = this.svg.getScreenCTM();
        if (!ctm) {
            console.error("[LOG] js/Editor.js: getSmartCoords - CTM 획득 실패");
            return { x: 0, y: 0 };
        }
        const rawPos = pt.matrixTransform(ctm.inverse());
        console.log(`[LOG] js/Editor.js: getSmartCoords - 입력 좌표(Raw): X=${rawPos.x.toFixed(1)}, Y=${rawPos.y.toFixed(1)}`);
        
        let snappedVertex = null;
        const threshold = CONSTANTS.VERTEX_SNAP_DIST;
        const check = (x, y, label) => {
            const dist = Math.sqrt(Math.pow(rawPos.x - x, 2) + Math.pow(rawPos.y - y, 2));
            if (dist < threshold) {
                console.log(`[LOG] js/Editor.js: 스냅 감지 - 대상: ${label}, 거리: ${dist.toFixed(2)}px`);
                return { x, y, dist };
            }
            return null;
        };

        let minDist = Infinity;
        for (const el of this.elements) {
            if (el.snappable === false) {
                console.log(`[LOG] js/Editor.js: 스냅 무시 - ID: ${el.id}, Type: ${el.type} (snappable: false)`);
                continue;
            }
            if (el.type === 'line' || el.type === 'arrow') {
                const s = check(el.x1, el.y1, `Line(${el.id}) Start`);
                if (s && s.dist < minDist) { minDist = s.dist; snappedVertex = s; }
                const e = check(el.x2, el.y2, `Line(${el.id}) End`);
                if (e && e.dist < minDist) { minDist = e.dist; snappedVertex = e; }
            } else if (el.type === 'rect_group') {
                const corners = [
                    {x: el.x1, y: el.y1, l: "LT"}, {x: el.x2, y: el.y1, l: "RT"},
                    {x: el.x2, y: el.y2, l: "RB"}, {x: el.x1, y: el.y2, l: "LB"}
                ];
                corners.forEach(c => {
                    const s = check(c.x, c.y, `Rect(${el.id}) ${c.l}`);
                    if (s && s.dist < minDist) { minDist = s.dist; snappedVertex = s; }
                });
            }
        }

        if (snappedVertex) {
            console.log(`[LOG] js/Editor.js: 정점 스냅 확정 - 좌표: (${snappedVertex.x}, ${snappedVertex.y})`);
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
        console.log(`[LOG] js/Editor.js: 격자 스냅 적용 - 좌표: (${gridSnapped.x}, ${gridSnapped.y})`);
        this.posInfo.textContent = `X:${gridSnapped.x}, Y:${gridSnapped.y}`;
        return gridSnapped;
    }

    getSnappedPos(start, current) {
        if (!this.ctrlKey) return current;
        console.log("[LOG] js/Editor.js: getSnappedPos - Ctrl 키 스냅(15도/직교) 계산");
        switch(this.mode) {
            case 'wall': case 'window': case 'route': case 'breaker':
                const dx = Math.abs(current.x - start.x);
                const dy = Math.abs(current.y - start.y);
                const res = dx > dy ? { x: current.x, y: start.y } : { x: start.x, y: current.y };
                console.log(`[LOG] js/Editor.js: 직교 스냅 결과 - (${res.x}, ${res.y})`);
                return res;
            case 'rect_wall':
                const side = Math.max(Math.abs(current.x - start.x), Math.abs(current.y - start.y));
                const sqRes = { x: start.x + (current.x >= start.x ? side : -side), y: start.y + (current.y >= start.y ? side : -side) };
                console.log(`[LOG] js/Editor.js: 정사각형 스냅 결과 - (${sqRes.x}, ${sqRes.y})`);
                return sqRes;
            default: return current;
        }
    }

    renderMergedWalls() {
        console.log("[LOG] js/Editor.js: renderMergedWalls() - 벽 병합 프로세스 시작");
        this.mergedWallLayer.innerHTML = '';
        const walls = this.elements.filter(el => el.type === 'line' && el.subType === 'wall');
        
        if (walls.length === 0) {
            console.log("[LOG] js/Editor.js: 병합할 벽 요소가 없음");
            return;
        }
        
        const getPointKey = (x, y) => `${Number(x).toFixed(1)},${Number(y).toFixed(1)}`;
        const adj = {};
        walls.forEach(w => {
            const p1 = getPointKey(w.x1, w.y1); const p2 = getPointKey(w.x2, w.y2);
            if(!adj[p1]) adj[p1] = []; adj[p1].push(w);
            if(!adj[p2]) adj[p2] = []; adj[p2].push(w);
        });
        
        console.log("[LOG] js/Editor.js: 인접 리스트 빌드 완료. 분기점 점검:");
        Object.keys(adj).forEach(key => {
            if (adj[key].length > 2) {
                console.log(`[LOG] js/Editor.js: 다중 분기점(Junction) 발견! 위치: ${key}, 연결된 벽: ${adj[key].length}개`);
            }
        });

        const chains = [];
        const pool = new Set(walls);
        while(pool.size > 0) {
            const startWall = pool.values().next().value;
            pool.delete(startWall);
            console.log(`[LOG] js/Editor.js: 새 체인 탐색 시작 - 기준 벽 ID: ${startWall.id}`);
            
            const chain = [ {x: startWall.x1, y: startWall.y1}, {x: startWall.x2, y: startWall.y2} ];
            
            const startKey = getPointKey(startWall.x1, startWall.y1);
            if (adj[startKey] && adj[startKey].length > 1) {
                console.log(`[LOG] js/Editor.js: 주의! 기준 벽의 시작점(x1,y1)에 다른 벽이 붙어있으나 현재 로직은 이를 탐색하지 않음 (방향성 버그 지점)`);
            }

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
                    console.log(`[LOG] js/Editor.js: 체인 확장 - 벽 ID: ${nextWall.id} 연결됨`);
                } else {
                    console.log(`[LOG] js/Editor.js: 체인 끝 도달 - 현재 위치에서 연결 가능한 미사용 벽 없음`);
                    break;
                }
            }
            chains.push(chain);
        }

        let d = "";
        chains.forEach((chain, idx) => {
            if(chain.length < 2) return;
            d += `M ${chain[0].x} ${chain[0].y} `;
            for(let i=1; i<chain.length; i++) {
                d += `L ${chain[i].x} ${chain[i].y} `;
            }
            const start = chain[0];
            const last = chain[chain.length - 1];
            if (Math.abs(start.x - last.x) < 0.1 && Math.abs(start.y - last.y) < 0.1 && chain.length > 2) {
                d += `L ${chain[1].x} ${chain[1].y} `;
            }
        });

        if(d) {
            this.mergedWallLayer.appendChild(createSVG("path", { 
                d, fill: "none", stroke: "black", "stroke-width": 6, 
                "stroke-linecap": "butt", "stroke-linejoin": "round" 
            }));
        }
    }

    renderElements() {
        console.log("[LOG] js/Editor.js: renderElements() - 전체 화면 갱신 시작");
        this.elementsLayer.innerHTML = ''; 
        this.renderMergedWalls();
        this.elements.forEach(el => {
            if (el.type === 'dimension') return;
            let shape;
            switch(el.type) { 
                case 'line': case 'arrow': shape = new LineShape(el); break; 
                case 'icon': shape = new IconShape(el); break; 
                case 'text': shape = new TextShape(el); break; 
                case 'rect_group': shape = new RectShape(el); break;
            }
            if (shape) {
                const isSelected = this.selectedIds.has(el.id);
                this.elementsLayer.appendChild(shape.render(isSelected, this.isRotating));
            }
        });
        this.elements.forEach(el => {
            if (el.type !== 'dimension') return;
            const parent = this.elements.find(p => p.id === el.parentId);
            if (!parent) return;
            const dimShape = new DimensionShape(el);
            const rendered = dimShape.render(this.selectedIds.has(el.id), this.isRotating, parent);
            if (rendered) this.elementsLayer.appendChild(rendered);
        });
    }

    handleMouseDown(e) {
        if (e.button === 2) return;
        const pos = this.getSmartCoords(e);
        console.log(`[LOG] js/Editor.js: handleMouseDown() - 모드: ${this.mode}, 위치: (${pos.x}, ${pos.y})`);
        
        if (pos.x < CONSTANTS.SIDEBAR_WIDTH || pos.y < CONSTANTS.HEADER_HEIGHT) { 
            if(this.mode !== 'select') return; 
        }
        
        this.startPos = pos; this.currentPos = pos;
        if (this.mode === 'select') {
            const targetDim = e.target.closest('[data-type="dimension-text"]');
            const targetShape = e.target.closest('[data-id]');
            if (targetDim) {
                const id = parseInt(targetDim.closest('[data-id]').dataset.id);
                this.isDraggingDimension = true;
                this.selectedIds.clear(); this.selectedIds.add(id);
                const el = this.elements.find(e => e.id === id);
                this.dragOffset = { x: pos.x - (el.dimOffset?.x || 0), y: pos.y - (el.dimOffset?.y || 0) };
                this.renderElements();
            } else if (targetShape) {
                const id = parseInt(targetShape.dataset.id);
                if (!this.selectedIds.has(id)) { 
                    if(!this.ctrlKey) this.selectedIds.clear(); 
                    this.selectedIds.add(id); 
                }
                this.isDraggingShape = true;
                this.initialElementsState.clear();
                const getAllDescendants = (parentId, resultSet) => {
                    this.elements.forEach(el => {
                        if (el.parentId === parentId && !resultSet.has(el.id)) {
                            resultSet.add(el.id);
                            getAllDescendants(el.id, resultSet);
                        }
                    });
                };
                const finalSetToMove = new Set(this.selectedIds);
                this.selectedIds.forEach(id => getAllDescendants(id, finalSetToMove));
                finalSetToMove.forEach(id => {
                    const el = this.elements.find(e => e.id === id);
                    if (el) this.initialElementsState.set(id, JSON.parse(JSON.stringify(el)));
                });
                this.renderElements();
            } else {
                this.isDragSelecting = true;
                if (!this.ctrlKey) this.selectedIds.clear();
                this.renderElements();
            }
        } else if (this.mode === 'text') {
            const text = prompt("텍스트 입력:", "사무실");
            if (text) this.addElement({ id: Date.now(), type: 'text', text, x: pos.x, y: pos.y, fontSize: 16, rotation: 0, snappable: true });
        } else if (this.mode === 'icon') {
            const ic = ICONS[this.selectedIconType];
            this.addElement({ id: Date.now(), type: 'icon', iconType: this.selectedIconType, x: pos.x - ic.w/2, y: pos.y - ic.h/2, rotation: 0, snappable: true });
        } else {
            this.isDrawing = true;
        }
    }

    handleMouseMove(e) {
        const pos = this.getSmartCoords(e); this.currentPos = pos;
        if (this.isDraggingDimension) {
            const id = this.selectedIds.values().next().value;
            const el = this.elements.find(e => e.id === id);
            if (el) {
                el.dimOffset = { x: pos.x - this.dragOffset.x, y: pos.y - this.dragOffset.y };
                this.renderElements();
            }
        } else if (this.isDraggingShape) {
            let dx = pos.x - this.startPos.x, dy = pos.y - this.startPos.y;
            this.initialElementsState.forEach((base, id) => {
                const el = this.elements.find(e => e.id === id);
                if (!el) return;
                if (el.type === 'line' || el.type === 'arrow' || el.type === 'rect_group') { 
                    el.x1 = (base.x1 || 0) + dx; el.y1 = (base.y1 || 0) + dy; el.x2 = (base.x2 || 0) + dx; el.y2 = (base.y2 || 0) + dy; 
                } else if (el.type === 'dimension') {
                    if (this.selectedIds.has(el.id)) {
                        el.dimOffset = { x: (base.dimOffset?.x || 0) + dx, y: (base.dimOffset?.y || 0) + dy };
                    }
                } else { 
                    el.x = (base.x || 0) + dx; el.y = (base.y || 0) + dy; 
                }
            });
            this.renderElements();
        }
        if (this.isDrawing) this.renderTempShape();
    }

    handleMouseUp() {
        this.isDragSelecting = false;
        this.isDraggingShape = false;
        this.isDraggingDimension = false;
        if (this.isDrawing) {
            this.isDrawing = false;
            this.tempLayer.innerHTML = '';
            const endPos = this.getSnappedPos(this.startPos, this.currentPos);
            if (Math.abs(this.startPos.x - endPos.x) < 0.1 && Math.abs(this.startPos.y - endPos.y) < 0.1) return;
            const now = Date.now();
            let newElements = [];
            if (['wall', 'window', 'route'].includes(this.mode)) {
                console.log(`[LOG] js/Editor.js: 신규 선분 추가 시도 - 타입: ${this.mode}, 시작: (${this.startPos.x}, ${this.startPos.y}), 끝: (${endPos.x}, ${endPos.y})`);
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
        const rect = { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y), w: Math.abs(p2.x-p1.x), h: Math.abs(p2.y-p1.y) };
        let changed = false; 
        const newElements = [];
        this.elements.forEach(el => {
            if (el.type === 'line' && (el.subType === 'wall' || el.subType === 'window')) {
                const fragments = breakLine(el, rect);
                if (fragments.length === 1 && fragments[0].x1 === el.x1 && fragments[0].y1 === el.y1) {
                    newElements.push(el);
                } else { 
                    changed = true; 
                    fragments.forEach(f => newElements.push({...el, id: Date.now()+Math.random(), x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2, p1Pierced: f.p1Pierced, p2Pierced: f.p2Pierced })); 
                }
            } else newElements.push(el);
        });
        if (changed) { 
            this.saveHistory(); this.elements = newElements; this.renderElements(); 
        }
    }

    eraseArea(p1, p2) {
        const xMin = Math.min(p1.x, p2.x), xMax = Math.max(p1.x, p2.x), yMin = Math.min(p1.y, p2.y), yMax = Math.max(p1.y, p2.y);
        const prevLen = this.elements.length;
        this.elements = this.elements.filter(el => {
            let ex, ey, ew, eh; 
            if (el.type === 'line' || el.type === 'rect_group' || el.type === 'arrow') { 
                ex = Math.min(el.x1, el.x2); ey = Math.min(el.y1, el.y2); ew = Math.abs(el.x2-el.x1); eh = Math.abs(el.y2-el.y1); 
            } else { 
                ex = el.x; ey = el.y; 
                if(el.type === 'icon') { const ic = ICONS[el.iconType]; ew = ic.w; eh = ic.h; } 
                else { ew = 50; eh = 16; } 
            }
            const isOverlap = !(ex > xMax || ex + ew < xMin || ey > yMax || ey + eh < yMin);
            return !isOverlap;
        });
        if(this.elements.length !== prevLen) { 
            this.saveHistory(); this.renderElements(); 
        }
    }

    addElement(el, render = true) {
        console.log(`[LOG] js/Editor.js: addElement - Type: ${el.type}, ID: ${el.id}`);
        this.elements.push(el);
        if (render) this.renderElements();
    }

    deleteSelected() {
        if (this.selectedIds.size === 0) return;
        this.saveHistory();
        const toDelete = new Set(this.selectedIds);
        const findChildren = (pid) => {
            this.elements.forEach(el => {
                if (el.parentId === pid && !toDelete.has(el.id)) {
                    toDelete.add(el.id);
                    findChildren(el.id);
                }
            });
        };
        this.selectedIds.forEach(id => findChildren(id));
        this.elements = this.elements.filter(el => !toDelete.has(el.id));
        this.selectedIds.clear();
        this.renderElements();
    }

    renderTempShape() {
        this.tempLayer.innerHTML = '';
        const endPos = this.getSnappedPos(this.startPos, this.currentPos);
        const shapeClassMap = {
            'wall': LineShape,
            'window': LineShape,
            'route': LineShape,
            'rect_wall': RectShape
        };
        const TargetClass = shapeClassMap[this.mode];
        if (TargetClass && TargetClass.renderLive) {
            TargetClass.renderLive(this.tempLayer, this.startPos, endPos, this.mode);
        }
    }

    saveHistory() { 
        this.history.push(JSON.parse(JSON.stringify(this.elements))); 
        if (this.history.length > 30) this.history.shift(); 
    }

    undo() {
        if (this.history.length === 0) return;
        this.elements = this.history.pop();
        this.selectedIds.clear();
        this.renderElements();
    }

    setupPaper() {
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
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        if(activeBtn) activeBtn.classList.add('active');
    }

    setMode(mode) {
        this.mode = mode;
        this.selectedIds.clear();
        this.renderElements();
        const activeBtn = document.querySelector(`.tool-btn[data-mode="${mode}"]`);
        if(activeBtn) this.highlightTool(activeBtn);
    }

    setupTools() {
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
        window.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) return;
            if (e.key === 'Control') { 
                e.preventDefault(); this.ctrlKey = true; 
            }
            if (e.key === 'Escape') this.setMode('select');
            if (e.key === 'Delete' || e.key === 'Backspace') this.deleteSelected();
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') this.undo();
        });
        window.addEventListener('keyup', (e) => { 
            if (e.key === 'Control') {
                this.ctrlKey = false; 
            }
        });
        this.svg.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.svg.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.svg.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.svg.addEventListener('contextmenu', (e) => e.preventDefault());
    }
}