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
    }

    register(key, callback) {
        this.shortcuts[key.toLowerCase()] = callback;
        console.log(`[SHORTCUT] 단축키 등록 완료: ${key}`);
    }

    handleKeyDown(e) {
        console.log(`[EVENT keydown] 시스템 레벨 감지: ${e.key} (Shift: ${e.shiftKey}, Ctrl/Meta: ${e.ctrlKey || e.metaKey})`);

        const isCtrlOrMeta = e.ctrlKey || e.metaKey;
        const key = e.key.toLowerCase();

        // --- 시스템 레벨 단축키 (Undo / Redo) ---
        if (isCtrlOrMeta && key === 'z') {
            e.preventDefault();
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

        // 등록된 전역 단축키 실행
        if (!isCtrlOrMeta && this.shortcuts[key]) {
            e.preventDefault();
            this.shortcuts[key]();
            return;
        }

        // --- 도구(Tool) 레벨 단축키 위임 ---
        console.log(`[SHORTCUT] 활성 도구(${this.state.currentTool})에게 키 이벤트 위임 시도`);
        if (this.state.activeTool && typeof this.state.activeTool.handleKeyDown === 'function') {
            this.state.activeTool.handleKeyDown(e);
        }
    }

    clearToolSelection() {
        if (this.state.activeTool && typeof this.state.activeTool.clearSelection === 'function') {
            this.state.activeTool.clearSelection();
        }
    }
}