import { EvacuationEditor } from './Editor.js';

// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', () => {
    const editor = new EvacuationEditor();
    
    // 전역 변수로 노출 (디버깅 용)
    window.editor = editor;
    
    console.log("Evacuation Editor Initialized");
});