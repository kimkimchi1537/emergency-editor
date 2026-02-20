export class BaseTool {
    constructor(state, workspace) {
        this.state = state;
        this.workspace = workspace;
        this.lastMousePos = null;
        console.log(`[CLASS BaseTool] 도구 기본 인스턴스 초기화 | 상태 및 워크스페이스 참조 저장`);
    }

    onMouseDown(e) {
        console.log(`[METHOD onMouseDown] 기본 도구 - 재정의 필요`);
    }

    onMouseMove(e) {
        // 기본 동작 없음
    }

    onMouseUp(e) {
        console.log(`[METHOD onMouseUp] 기본 도구 - 재정의 필요`);
    }

    onDeactivate() {
        console.log(`[METHOD onDeactivate] 도구 비활성화 시점 정리 로직 실행`);
    }

    handleKeyDown(e) {
        console.log(`[METHOD handleKeyDown] 기본 도구 - 키 입력 무시됨: ${e.key}`);
        return false;
    }

    handleKeyUp(e) {
        console.log(`[METHOD handleKeyUp] 기본 도구 - 키 뗌 무시됨: ${e.key}`);
        return false;
    }
    
    onWheel(e) {
        console.log(`[METHOD onWheel] 기본 도구 - 휠 이벤트 무시됨 (ZoomManager로 위임)`);
        return false;
    }

    getMousePosition(e) {
        const pt = this.workspace.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        
        const svgP = pt.matrixTransform(this.workspace.getScreenCTM().inverse());
        
        console.log(`[METHOD getMousePosition] 원본: (${e.clientX}, ${e.clientY}) -> 논리 좌표(CTM): (${svgP.x.toFixed(1)}, ${svgP.y.toFixed(1)})`);
        return { x: svgP.x, y: svgP.y };
    }
}