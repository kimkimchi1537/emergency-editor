export class ZoomManager {
    static instance = null;

    static getInstance(workspaceContainer, workspace) {
        if (!ZoomManager.instance) {
            ZoomManager.instance = new ZoomManager(workspaceContainer, workspace);
        }
        return ZoomManager.instance;
    }

    constructor(workspaceContainer, workspace) {
        this.workspaceContainer = workspaceContainer;
        this.workspace = workspace;
        this.scale = 1.0;
        this.MIN_SCALE = 0.1;
        this.MAX_SCALE = 5.0;

        this.workspaceContainer.style.justifyContent = 'safe center';
        this.workspaceContainer.style.alignItems = 'safe center';
        this.workspace.style.margin = 'auto';

        console.log(`[CLASS ZoomManager] 줌 매니저 가동 완료 (viewBox 방식) | 최소:${this.MIN_SCALE}, 최대:${this.MAX_SCALE}`);
        console.log(`[ZOOM-LAYOUT] Flexbox safe center 및 margin auto 속성 주입 완료 | 상단/좌측 스크롤 잘림(Clipping) 원천 차단`);
    }

    getScale() {
        return this.scale;
    }

    setScale(newScale) {
        const oldScale = this.scale;
        this.scale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, newScale));
        this.applyScale();
        console.log(`[ZOOM] 물리적 배율 변경: ${oldScale.toFixed(2)} -> ${this.scale.toFixed(2)}`);
    }

    applyScale() {
        const viewBox = this.workspace.getAttribute('viewBox');
        if (viewBox) {
            const parts = viewBox.split(' ');
            const logicalW = parseFloat(parts[2]);
            const logicalH = parseFloat(parts[3]);
            this.workspace.setAttribute('width', logicalW * this.scale);
            this.workspace.setAttribute('height', logicalH * this.scale);
        }
    }

    fitToScreen() {
        const containerRect = this.workspaceContainer.getBoundingClientRect();
        
        const viewBox = this.workspace.getAttribute('viewBox');
        let logicalW = 800;
        let logicalH = 600;
        
        if (viewBox) {
            const parts = viewBox.split(' ');
            logicalW = parseFloat(parts[2]);
            logicalH = parseFloat(parts[3]);
        } else {
            logicalW = parseFloat(this.workspace.getAttribute('width')) || containerRect.width;
            logicalH = parseFloat(this.workspace.getAttribute('height')) || containerRect.height;
        }

        const padding = 80;
        const availableWidth = containerRect.width - padding;
        const availableHeight = containerRect.height - padding;

        const scaleX = availableWidth / logicalW;
        const scaleY = availableHeight / logicalH;
        
        const fitScale = Math.min(scaleX, scaleY);
        
        console.log(`[ZOOM] 화면 맞춤 계산 | 컨테이너:(${containerRect.width.toFixed(1)}x${containerRect.height.toFixed(1)}), 논리용지:(${logicalW}x${logicalH}), 목표 배율:${fitScale.toFixed(2)}`);
        
        this.setScale(fitScale);
    }

    handleWheel(e) {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            
            const rect = this.workspace.getBoundingClientRect();
            const cursorX = e.clientX - rect.left;
            const cursorY = e.clientY - rect.top;
            
            const ratioX = cursorX / rect.width;
            const ratioY = cursorY / rect.height;

            const zoomSensitivity = 0.05;
            const delta = e.deltaY < 0 ? (1 + zoomSensitivity) : (1 - zoomSensitivity);
            const targetScale = this.scale * delta;
            const finalScale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, targetScale));

            if (this.scale === finalScale) {
                console.log(`[ZOOM] 배율 한계 도달 | 현재: ${this.scale.toFixed(2)}`);
                return;
            }
            
            console.log(`[ZOOM] 휠 감지 (커서 기준 확대/축소) | DeltaY: ${e.deltaY}, 증감 비율: ${delta}`);
            console.log(`[ZOOM-MATH] 확대 전 커서 물리 좌표: (${cursorX.toFixed(1)}, ${cursorY.toFixed(1)}) | 캔버스 내 비율: ${(ratioX * 100).toFixed(1)}%, ${(ratioY * 100).toFixed(1)}%`);
            
            this.setScale(finalScale);
            
            const newRect = this.workspace.getBoundingClientRect();
            const newCursorX = newRect.width * ratioX;
            const newCursorY = newRect.height * ratioY;
            
            const diffX = newCursorX - cursorX;
            const diffY = newCursorY - cursorY;
            
            this.workspaceContainer.scrollLeft += diffX;
            this.workspaceContainer.scrollTop += diffY;
            
            console.log(`[ZOOM-MATH] 확대 후 목표 물리 좌표: (${newCursorX.toFixed(1)}, ${newCursorY.toFixed(1)}) | 스크롤 보정량: dx=${diffX.toFixed(1)}, dy=${diffY.toFixed(1)}`);
        }
    }
}