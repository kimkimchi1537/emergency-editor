import { HistoryManager } from './HistoryManager.js';

export class LayerManager {
    constructor(state, workspace, container) {
        this.state = state;
        this.workspace = workspace;
        this.container = container;
        this.draggedShapeIndex = null; 
        
        this.iconMap = {
            'rect': 'crop_square',
            'circle': 'radio_button_unchecked',
            'line': 'remove',
            'multiline': 'show_chart',
            'image': 'image',
            'group': 'workspaces',
            'text': 'text_fields' // [추가]
        };

        this.nameMap = {
            'rect': '사각형',
            'circle': '원형',
            'line': '직선',
            'multiline': '연속선',
            'image': '이미지',
            'group': '그룹',
            'text': '텍스트' // [추가]
        };
        console.log(`[CLASS LayerManager] 생성자 호출 완료`);
    }

    render() {
        this.container.innerHTML = '';
        
        if (this.state.shapes.length === 0) {
            this.container.innerHTML = '<div style="color: #888; text-align: center; padding-top: 20px; font-size: 12px;">레이어가 없습니다.</div>';
            return;
        }

        const reversedShapes = [...this.state.shapes].reverse();

        reversedShapes.forEach((shape, reversedIndex) => {
            const originalIndex = this.state.shapes.length - 1 - reversedIndex;
            
            const item = document.createElement('div');
            item.className = 'layer-item';
            
            if (!shape.isLocked) {
                item.setAttribute('draggable', 'true');
            }

            if (this.state.selectedShapes.includes(shape)) {
                item.classList.add('active');
            }

            if (shape.isLocked) {
                item.style.opacity = '0.5';
                item.style.cursor = 'not-allowed';
            }

            const infoDiv = document.createElement('div');
            infoDiv.className = 'layer-info';
            
            const icon = document.createElement('span');
            icon.className = 'material-icons layer-icon';
            icon.textContent = this.iconMap[shape.type] || 'category';
            
            const name = document.createElement('span');
            name.className = 'layer-name';
            name.textContent = `${this.nameMap[shape.type] || shape.type} (${shape.id.split('_')[1] || shape.id})`;

            infoDiv.appendChild(icon);
            infoDiv.appendChild(name);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'layer-actions';
            
            if (shape.isLocked) {
                actionsDiv.style.display = 'flex';
            }

            const btnLock = document.createElement('button');
            btnLock.className = 'layer-action-btn';
            btnLock.innerHTML = shape.isLocked ? '<span class="material-icons" style="color:#e63946;">lock</span>' : '<span class="material-icons">lock_open</span>';
            btnLock.title = shape.isLocked ? '잠금 해제' : '잠금';
            
            btnLock.onclick = (e) => {
                e.stopPropagation(); 
                HistoryManager.getInstance(this.state, this.workspace).saveState();
                shape.isLocked = !shape.isLocked; 
                
                if (shape.isLocked) {
                    this.state.selectedShapes = this.state.selectedShapes.filter(s => s !== shape);
                    if (this.state.activeTool && typeof this.state.activeTool.renderSelectionUI === 'function') {
                        this.state.activeTool.renderSelectionUI();
                    }
                    if (this.state.colorManager) this.state.colorManager.updateUI(this.state.selectedShapes);
                }
                
                this.render(); 
                console.log(`[LAYER-MANAGER] 도형 잠금 상태 변경: ${shape.id} -> ${shape.isLocked ? '잠김' : '해제'}`);
            };
            
            actionsDiv.appendChild(btnLock);

            if (!shape.isLocked) {
                const btnUp = document.createElement('button');
                btnUp.className = 'layer-action-btn';
                btnUp.innerHTML = '<span class="material-icons">arrow_upward</span>';
                btnUp.title = '앞으로 가져오기';
                btnUp.onclick = (e) => {
                    e.stopPropagation();
                    if (originalIndex < this.state.shapes.length - 1) {
                        HistoryManager.getInstance(this.state, this.workspace).saveState();
                        const shapeToMove = this.state.shapes[originalIndex];
                        const shapeAbove = this.state.shapes[originalIndex + 1];
                        
                        this.state.shapes[originalIndex] = shapeAbove;
                        this.state.shapes[originalIndex + 1] = shapeToMove;
                        
                        const nextNode = shapeAbove.element.nextSibling;
                        if (nextNode) this.workspace.insertBefore(shapeToMove.element, nextNode);
                        else this.workspace.appendChild(shapeToMove.element);
                        
                        if (this.state.renderLayers) this.state.renderLayers();
                    }
                };

                const btnDown = document.createElement('button');
                btnDown.className = 'layer-action-btn';
                btnDown.innerHTML = '<span class="material-icons">arrow_downward</span>';
                btnDown.title = '뒤로 보내기';
                btnDown.onclick = (e) => {
                    e.stopPropagation();
                    if (originalIndex > 0) {
                        HistoryManager.getInstance(this.state, this.workspace).saveState();
                        const shapeToMove = this.state.shapes[originalIndex];
                        const shapeBelow = this.state.shapes[originalIndex - 1];
                        
                        this.state.shapes[originalIndex] = shapeBelow;
                        this.state.shapes[originalIndex - 1] = shapeToMove;
                        
                        this.workspace.insertBefore(shapeToMove.element, shapeBelow.element);
                        if (this.state.renderLayers) this.state.renderLayers();
                    }
                };

                const btnDelete = document.createElement('button');
                btnDelete.className = 'layer-action-btn';
                btnDelete.innerHTML = '<span class="material-icons">delete</span>';
                btnDelete.title = '삭제';
                btnDelete.onclick = (e) => {
                    e.stopPropagation();
                    HistoryManager.getInstance(this.state, this.workspace).saveState();
                    if (shape.element.parentNode) shape.element.parentNode.removeChild(shape.element);
                    
                    this.state.shapes.splice(originalIndex, 1);
                    this.state.selectedShapes = this.state.selectedShapes.filter(s => s !== shape);
                    
                    if (this.state.activeTool && typeof this.state.activeTool.renderSelectionUI === 'function') this.state.activeTool.renderSelectionUI();
                    if (this.state.colorManager) this.state.colorManager.updateUI(this.state.selectedShapes);
                    if (this.state.renderLayers) this.state.renderLayers();
                };

                actionsDiv.appendChild(btnUp);
                actionsDiv.appendChild(btnDown);
                actionsDiv.appendChild(btnDelete);
            }

            item.appendChild(infoDiv);
            item.appendChild(actionsDiv);

            if (!shape.isLocked) {
                item.addEventListener('dragstart', (e) => {
                    this.draggedShapeIndex = originalIndex;
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', originalIndex); 
                    setTimeout(() => item.style.opacity = '0.3', 0); 
                    console.log(`[LAYER-MANAGER] 👆 드래그 시작 | 대상: ${shape.id} (인덱스: ${originalIndex})`);
                });

                item.addEventListener('dragend', (e) => {
                    item.style.opacity = '1';
                    document.querySelectorAll('.layer-item').forEach(el => {
                        el.style.borderTop = '1px solid transparent';
                        el.style.borderBottom = '1px solid transparent';
                    });
                    this.draggedShapeIndex = null;
                    console.log(`[LAYER-MANAGER] ✋ 드래그 종료 (초기화)`);
                });
            }

            item.addEventListener('dragover', (e) => {
                e.preventDefault(); 
                if (this.draggedShapeIndex === null || this.draggedShapeIndex === originalIndex) return;

                e.dataTransfer.dropEffect = 'move';
                const rect = item.getBoundingClientRect();
                const relY = e.clientY - rect.top;

                if (relY < rect.height / 2) {
                    item.style.borderTop = '2px solid #0066cc';
                    item.style.borderBottom = '1px solid transparent';
                } else {
                    item.style.borderTop = '1px solid transparent';
                    item.style.borderBottom = '2px solid #0066cc';
                }
            });

            item.addEventListener('dragleave', (e) => {
                item.style.borderTop = '1px solid transparent';
                item.style.borderBottom = '1px solid transparent';
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.style.borderTop = '1px solid transparent';
                item.style.borderBottom = '1px solid transparent';

                if (this.draggedShapeIndex === null || this.draggedShapeIndex === originalIndex) return;

                console.log(`[LAYER-MANAGER] 🛑 드롭 발생 | 타겟: ${shape.id}`);
                HistoryManager.getInstance(this.state, this.workspace).saveState();

                const draggedShape = this.state.shapes[this.draggedShapeIndex];
                const targetShape = shape;

                this.state.shapes = this.state.shapes.filter(s => s !== draggedShape);

                const newTargetIndex = this.state.shapes.indexOf(targetShape);

                const rect = item.getBoundingClientRect();
                const relY = e.clientY - rect.top;
                const dropVisuallyAbove = relY < rect.height / 2; 

                const insertIndex = dropVisuallyAbove ? newTargetIndex + 1 : newTargetIndex;

                this.state.shapes.splice(insertIndex, 0, draggedShape);
                console.log(`[LAYER-MANAGER] 🔄 배열 재배치 완료 | ${draggedShape.id}를 인덱스 ${insertIndex}로 이동`);

                this.state.shapes.forEach(s => {
                    this.workspace.appendChild(s.element);
                });
                console.log(`[LAYER-MANAGER] 🎨 캔버스 SVG DOM 물리적 순서 일괄 갱신 완료`);

                if (this.state.renderLayers) this.state.renderLayers();
            });

            item.addEventListener('click', (e) => {
                if (shape.isLocked) return;

                if (this.state.currentTool !== 'select') this.state.setTool('select');
                
                if (!e.shiftKey) {
                    if (this.state.activeTool && typeof this.state.activeTool.clearSelection === 'function') {
                        this.state.activeTool.clearSelection();
                    }
                }
                
                if (!this.state.selectedShapes.includes(shape)) {
                    this.state.selectedShapes.push(shape);
                } else if (e.shiftKey) {
                    this.state.selectedShapes = this.state.selectedShapes.filter(s => s !== shape);
                }

                if (this.state.activeTool && typeof this.state.activeTool.renderSelectionUI === 'function') {
                    this.state.activeTool.renderSelectionUI();
                }
                
                if (this.state.colorManager) this.state.colorManager.updateUI(this.state.selectedShapes);
                
                if (this.state.selectedShapes.length === 1) {
                    const strokeInput = document.getElementById('stroke-width-input');
                    if (strokeInput && this.state.selectedShapes[0].strokeWidth !== undefined) {
                        strokeInput.value = this.state.selectedShapes[0].strokeWidth;
                        this.state.currentStrokeWidth = this.state.selectedShapes[0].strokeWidth;
                        console.log(`[LAYER-MANAGER] 📏 선 굵기 UI 동기화 완료: ${this.state.currentStrokeWidth}`);
                    }
                }
                
                // [신규] SelectTool 내장 syncStateUI()로 위임하여 텍스트 패널도 동기화
                if (this.state.activeTool && typeof this.state.activeTool.syncStateUI === 'function') {
                    this.state.activeTool.syncStateUI();
                }

                this.render(); 
            });

            this.container.appendChild(item);
        });
    }
}