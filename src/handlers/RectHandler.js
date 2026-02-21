import { BaseHandler } from './BaseHandler.js';

export class RectHandler extends BaseHandler {
    renderHandles(overlay, shape, box) {
        overlay.appendChild(this.createHandle(box.minX, box.minY, 0));
        overlay.appendChild(this.createHandle(box.minX + box.width, box.minY, 1));
        overlay.appendChild(this.createHandle(box.minX + box.width, box.minY + box.height, 2));
        overlay.appendChild(this.createHandle(box.minX, box.minY + box.height, 3));
        console.log(`[RECT-HANDLER] 사각형 꼭짓점 핸들 4개 렌더링 위임 완료`);
    }
}