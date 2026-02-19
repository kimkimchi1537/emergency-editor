import { EvacuationEditor } from './Editor.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("[LOG] js/main.js: DOMContentLoaded 이벤트 발생");
    const editor = new EvacuationEditor();
    window.editor = editor;
    console.log("[LOG] js/main.js: Evacuation Editor 초기화 성공");
});