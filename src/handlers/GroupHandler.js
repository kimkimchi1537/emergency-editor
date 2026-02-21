import { BaseHandler } from './BaseHandler.js';

export class GroupHandler extends BaseHandler {
    // [해결] 임시 그룹용 렌더링. AABB 박스를 받아오며 회전하지 않을 때는 항상 0도에서 반듯하게 시작합니다.
    renderUI(overlay, shapes, isRotating, currentDeltaAngle, rotationCenter, calculatedBox) {
        const padding = 5;
        const box = calculatedBox; // 진짜 회전까지 반영된 정확한 다중 선택 AABB
        
        let overlayTransform = "";
        
        // 드래그하여 회전할 때만 임시 각도를 주고, 평소엔(0도) 아무 각도도 주지 않아 AABB가 삐뚤어지지 않게 만듦.
        if (isRotating) {
            overlayTransform = `rotate(${currentDeltaAngle}, ${rotationCenter.x}, ${rotationCenter.y})`;
        }
        
        if (overlayTransform) overlay.setAttribute('transform', overlayTransform);

        this.drawBoundingBox(overlay, box, padding);
        this.drawRotateHandle(overlay, box, padding);
        console.log(`[GROUP-HANDLER] 임시 그룹 다중 선택 핸들러 렌더링 완료 (항상 0도 기준 AABB)`);
    }

    containsPoint(pos, shapes, padding, currentDeltaAngle, isRotating, rotationCenter, calculatedBox) {
        const box = calculatedBox;
        const cx = box.minX + box.width / 2;
        const cy = box.minY + box.height / 2;
        
        // 그룹은 조작 중이 아닐 때는 무조건 0도 (자식 요소들의 회전값은 계산된 박스 자체에 이미 적용됨)
        const angleDeg = isRotating ? (currentDeltaAngle || 0) : 0; 
        
        const dx = pos.x - cx;
        const dy = pos.y - cy;
        const angleRad = -angleDeg * (Math.PI / 180);
        const rx = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
        const ry = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);

        const halfW = (box.width / 2) + padding;
        const halfH = (box.height / 2) + padding;

        return Math.abs(rx) <= halfW && Math.abs(ry) <= halfH;
    }
}