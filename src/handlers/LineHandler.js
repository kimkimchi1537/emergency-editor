import { BaseHandler } from './BaseHandler.js';

export class LineHandler extends BaseHandler {
    // 선은 자신만의 각도가 있으므로 Box와 Overlay 전체를 오버라이딩
    renderUI(overlay, shape, isRotating, currentDeltaAngle, rotationCenter) {
        const padding = 5;
        const p1 = shape.points[0];
        const p2 = shape.points[1];
        const length = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
        
        const box = { minX: 0, minY: -padding, width: length, height: padding * 2 };
        let overlayTransform = `translate(${p1.x}, ${p1.y}) rotate(${angle})`;
        
        if (isRotating) {
            overlayTransform = `rotate(${currentDeltaAngle}, ${rotationCenter.x}, ${rotationCenter.y}) ${overlayTransform}`;
        } else {
            const currentTransform = shape.element.getAttribute('transform') || '';
            const match = currentTransform.match(/rotate\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/);
            if (match) overlayTransform = `${match[0]} ${overlayTransform}`;
        }
        
        if (overlayTransform) overlay.setAttribute('transform', overlayTransform);

        this.drawBoundingBox(overlay, box, padding);
        this.drawRotateHandle(overlay, box, padding);
        this.renderHandles(overlay, shape, box);
    }

    containsPoint(pos, shape, padding, currentDeltaAngle, isRotating, rotationCenter) {
        const p1 = shape.points[0];
        const p2 = shape.points[1];
        const length = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        
        let baseAngleDeg = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
        let transformAngleDeg = 0;
        
        if (isRotating) {
            transformAngleDeg = currentDeltaAngle || 0;
        } else {
            const currentTransform = shape.element.getAttribute('transform') || '';
            const match = currentTransform.match(/rotate\(([-\d.]+)/);
            if (match) transformAngleDeg = parseFloat(match[1]);
        }
        
        const angleDeg = baseAngleDeg + transformAngleDeg;
        
        const dx = pos.x - p1.x;
        const dy = pos.y - p1.y;
        const angleRad = -angleDeg * (Math.PI / 180);
        const rx = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
        const ry = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);

        return rx >= -padding && rx <= length + padding && ry >= -padding && ry <= padding;
    }

    renderHandles(overlay, shape, box) {
        const p1 = shape.points[0];
        const p2 = shape.points[1];
        const length = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        overlay.appendChild(this.createHandle(0, 0, 0));
        overlay.appendChild(this.createHandle(length, 0, 1));
    }
}