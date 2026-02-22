import { RectHandler } from './RectHandler.js';

export class ImageHandler extends RectHandler {
    drawBoundingBox(overlay, box, padding) {
        // [핵심] 부모 클래스(BaseHandler)의 점선 테두리 렌더링을 완전히 무시하도록 오버라이드
        console.log(`[IMAGE-HANDLER] 이미지 전용 핸들러: 파란색 점선(Bounding Box) 렌더링 생략`);
    }
}