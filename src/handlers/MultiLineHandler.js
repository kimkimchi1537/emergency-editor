import { BaseHandler } from './BaseHandler.js';

export class MultiLineHandler extends BaseHandler {
    renderHandles(overlay, shape, box) {
        shape.points.forEach((p, i) => {
            overlay.appendChild(this.createHandle(p.x, p.y, i));
        });
        console.log(`[MULTILINE-HANDLER] 다중선 리사이즈 핸들 ${shape.points.length}개 렌더링 위임 완료`);
    }
}