import { BaseHandler } from './BaseHandler.js';

export class CircleHandler extends BaseHandler {
    renderHandles(overlay, shape, box) {
        overlay.appendChild(this.createHandle(box.minX + box.width / 2, box.minY, 0));
        overlay.appendChild(this.createHandle(box.minX + box.width, box.minY + box.height / 2, 1));
        overlay.appendChild(this.createHandle(box.minX + box.width / 2, box.minY + box.height, 2));
        overlay.appendChild(this.createHandle(box.minX, box.minY + box.height / 2, 3));
        console.log(`[CIRCLE-HANDLER] 원형 엣지 핸들 4개 렌더링 위임 완료`);
    }
}