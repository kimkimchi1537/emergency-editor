import { HistoryManager } from './HistoryManager.js';

export class ShortcutManager {
    constructor(state, workspace) {
        this.state = state;
        this.workspace = workspace;
        this.shortcuts = {};
        this.init();
        console.log(`[CLASS ShortcutManager] 단축키 매니저 초기화 완료`);
    }

    init() {
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    register(key, callback) {
        this.shortcuts[key.toLowerCase()] = callback;
        console.log(`[SHORTCUT] 단축키 등록 완료: ${key}`);
    }

    handleKeyDown(e) {
        console.log(`[EVENT keydown] 시스템 레벨 감지: ${e.key} (Shift: ${e.shiftKey}, Ctrl/Meta: ${e.ctrlKey || e.metaKey})`);

        const isCtrlOrMeta = e.ctrlKey || e.metaKey;
        const key = e.key.toLowerCase();

        if (isCtrlOrMeta && key === 'z') {
            e.preventDefault();
            
            if (this.state.activeTool && typeof this.state.activeTool.handleUndo === 'function') {
                if (this.state.activeTool.handleUndo()) {
                    console.log(`[SHORTCUT] 전역 Undo 차단 - 활성 도구의 로컬 Undo 위임 처리 완료`);
                    return;
                }
            }
            
            if (e.shiftKey) {
                HistoryManager.getInstance(this.state, this.workspace).redo();
            } else {
                HistoryManager.getInstance(this.state, this.workspace).undo();
            }
            this.clearToolSelection();
            return;
        }

        if (isCtrlOrMeta && key === 'y') {
            e.preventDefault();
            HistoryManager.getInstance(this.state, this.workspace).redo();
            this.clearToolSelection();
            return;
        }

        if (!isCtrlOrMeta && this.shortcuts[key]) {
            e.preventDefault();
            this.shortcuts[key]();
            return;
        }

        console.log(`[SHORTCUT] 활성 도구(${this.state.currentTool})에게 키 이벤트 위임 시도`);
        if (this.state.activeTool && typeof this.state.activeTool.handleKeyDown === 'function') {
            this.state.activeTool.handleKeyDown(e);
        }
    }

    handleKeyUp(e) {
        if (e.key === 'Shift') {
            console.log(`[EVENT keyup] 시스템 레벨 Shift 뗌 감지 - 도구 위임 시도`);
            if (this.state.activeTool && typeof this.state.activeTool.handleKeyUp === 'function') {
                this.state.activeTool.handleKeyUp(e);
            }
        }
    }

    clearToolSelection() {
        if (this.state.activeTool && typeof this.state.activeTool.clearSelection === 'function') {
            this.state.activeTool.clearSelection();
        }
    }
}