export class BaseHandler {
    constructor() {
        console.log(`[CLASS BaseHandler] 핸들러 기본 인스턴스 생성`);
    }

    getBox(shape) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        shape.points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
        return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
    }

    // [핵심] 이제 핸들러가 바운딩 박스부터 회전 아이콘까지 전부 알아서 그립니다.
    renderUI(overlay, shape, isRotating, currentDeltaAngle, rotationCenter) {
        const padding = 5;
        const box = this.getBox(shape);
        
        let overlayTransform = "";
        if (isRotating) {
            overlayTransform = `rotate(${currentDeltaAngle}, ${rotationCenter.x}, ${rotationCenter.y})`;
        } else {
            const currentTransform = shape.element.getAttribute('transform') || '';
            const match = currentTransform.match(/rotate\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/);
            if (match) overlayTransform = match[0];
        }
        
        if (overlayTransform) overlay.setAttribute('transform', overlayTransform);

        this.drawBoundingBox(overlay, box, padding);
        this.drawRotateHandle(overlay, box, padding);
        this.renderHandles(overlay, shape, box);
    }

    drawBoundingBox(overlay, box, padding) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', box.minX - padding);
        rect.setAttribute('y', box.minY - padding);
        rect.setAttribute('width', box.width + padding * 2);
        rect.setAttribute('height', box.height + padding * 2);
        rect.setAttribute('fill', 'transparent'); 
        rect.setAttribute('stroke', '#0066cc');
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('stroke-dasharray', '4,2');
        rect.style.pointerEvents = 'none';
        overlay.appendChild(rect);
    }

    drawRotateHandle(overlay, box, padding) {
        const handleLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        handleLine.setAttribute('x1', box.minX + box.width / 2);
        handleLine.setAttribute('y1', box.minY - padding);
        handleLine.setAttribute('x2', box.minX + box.width / 2);
        handleLine.setAttribute('y2', box.minY - 25);
        handleLine.setAttribute('stroke', '#0066cc');
        handleLine.style.pointerEvents = 'none';
        overlay.appendChild(handleLine);

        const rotateHandleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        rotateHandleGroup.setAttribute('class', 'rotate-handle');
        rotateHandleGroup.style.cursor = 'grab';
        rotateHandleGroup.style.pointerEvents = 'auto';

        const rotateCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        rotateCircle.setAttribute('class', 'rotate-handle');
        rotateCircle.setAttribute('cx', box.minX + box.width / 2);
        rotateCircle.setAttribute('cy', box.minY - 25);
        rotateCircle.setAttribute('r', '10');
        rotateCircle.setAttribute('fill', '#fff');
        rotateCircle.setAttribute('stroke', '#0066cc');
        rotateCircle.setAttribute('stroke-width', '1');
        rotateHandleGroup.appendChild(rotateCircle);

        const rotateIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        rotateIcon.setAttribute('class', 'rotate-handle material-icons');
        rotateIcon.setAttribute('x', box.minX + box.width / 2);
        rotateIcon.setAttribute('y', box.minY - 25); 
        rotateIcon.setAttribute('dominant-baseline', 'central');
        rotateIcon.setAttribute('text-anchor', 'middle');
        rotateIcon.setAttribute('font-size', '14px');
        rotateIcon.setAttribute('fill', '#0066cc');
        rotateIcon.style.userSelect = 'none';
        rotateIcon.style.webkitUserSelect = 'none';
        rotateIcon.style.msUserSelect = 'none';
        rotateIcon.style.mozUserSelect = 'none';
        rotateIcon.textContent = 'rotate_right';
        rotateHandleGroup.appendChild(rotateIcon);

        overlay.appendChild(rotateHandleGroup);
    }

    containsPoint(pos, shape, padding, currentDeltaAngle, isRotating, rotationCenter) {
        const box = this.getBox(shape);
        const cx = box.minX + box.width / 2;
        const cy = box.minY + box.height / 2;
        let angleDeg = 0;
        
        if (isRotating) {
            angleDeg = currentDeltaAngle || 0;
        } else {
            const currentTransform = shape.element.getAttribute('transform') || '';
            const match = currentTransform.match(/rotate\(([-\d.]+)/);
            if (match) angleDeg = parseFloat(match[1]);
        }
        
        const dx = pos.x - cx;
        const dy = pos.y - cy;
        const angleRad = -angleDeg * (Math.PI / 180);
        const rx = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
        const ry = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);

        const halfW = (box.width / 2) + padding;
        const halfH = (box.height / 2) + padding;

        return Math.abs(rx) <= halfW && Math.abs(ry) <= halfH;
    }

    createHandle(x, y, index) {
        const handle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        handle.setAttribute('class', 'resize-handle');
        handle.setAttribute('data-index', index);
        handle.setAttribute('x', x - 4);
        handle.setAttribute('y', y - 4);
        handle.setAttribute('width', 8);
        handle.setAttribute('height', 8);
        handle.setAttribute('fill', '#fff');
        handle.setAttribute('stroke', '#0066cc');
        handle.setAttribute('stroke-width', 1.5);
        handle.style.cursor = 'crosshair';
        handle.style.pointerEvents = 'auto';
        return handle;
    }

    renderHandles(overlay, shape, box) {}
}