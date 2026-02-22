import { BaseShape } from './BaseShape.js';

export class TextShape extends BaseShape {
    constructor(id, startX, startY, strokeWidth, strokeColor, fillColor, extraData = {}) {
        super(id, 'text', startX, startY, strokeWidth, strokeColor, fillColor);
        
        this.textProps = {
            content: extraData.content || "텍스트",
            fontSize: extraData.fontSize || 18,
            fontColor: extraData.fontColor || "#000000",
            fontWeight: extraData.fontWeight || "normal",
            fontStyle: extraData.fontStyle || "normal",
            textDecoration: extraData.textDecoration || "none",
            textAlign: extraData.textAlign || "center",
            verticalAlign: extraData.verticalAlign || "middle"
        };

        this.points = [
            this.createPoint(startX, startY),
            this.createPoint(startX, startY),
            this.createPoint(startX, startY),
            this.createPoint(startX, startY)
        ];

        this.element = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('pointer-events', 'all');
        this.element.appendChild(bgRect);
        
        const foreignObj = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        foreignObj.style.pointerEvents = 'none'; 
        
        const textDiv = document.createElement('div');
        textDiv.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        
        textDiv.style.fontFamily = "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";
        textDiv.style.width = "100%";
        textDiv.style.height = "100%";
        textDiv.style.display = "flex";
        textDiv.style.boxSizing = "border-box";
        textDiv.style.padding = "5px";
        textDiv.style.wordBreak = "break-word";
        textDiv.style.whiteSpace = "pre-wrap";
        textDiv.style.overflow = "hidden";
        textDiv.style.userSelect = "none";
        textDiv.style.cursor = "default";
        textDiv.style.pointerEvents = "none";
        
        foreignObj.appendChild(textDiv);
        this.element.appendChild(foreignObj);

        this.applyColors();
        this.applyTextProps();
        this.updateAttributes();
        
        if (extraData.opacity !== undefined) {
            this.setOpacity(extraData.opacity);
        }
    }

    get bgRect() { return this.element.querySelector('rect'); }
    get foreignObj() { return this.element.querySelector('foreignObject'); }
    get textDiv() { return this.foreignObj ? this.foreignObj.querySelector('div') : null; }

    applyColors() {
        if (this.bgRect) {
            this.bgRect.setAttribute('stroke', this.strokeColor === 'transparent' ? 'none' : this.strokeColor);
            this.bgRect.setAttribute('fill', this.fillColor === 'transparent' ? 'none' : this.fillColor);
            this.bgRect.setAttribute('stroke-width', this.strokeWidth);
        }
    }

    setOpacity(opacity) {
        super.setOpacity(opacity);
        if(this.element) this.element.setAttribute('opacity', opacity);
    }

    applyTextProps() {
        const div = this.textDiv;
        if (!div) return;
        
        div.innerText = this.textProps.content;
        div.style.fontSize = this.textProps.fontSize + 'px';
        div.style.color = this.textProps.fontColor;
        div.style.fontWeight = this.textProps.fontWeight;
        div.style.fontStyle = this.textProps.fontStyle;
        div.style.textDecoration = this.textProps.textDecoration;
        
        if (this.textProps.textAlign === 'left') {
            div.style.justifyContent = 'flex-start';
            div.style.textAlign = 'left';
        } else if (this.textProps.textAlign === 'right') {
            div.style.justifyContent = 'flex-end';
            div.style.textAlign = 'right';
        } else {
            div.style.justifyContent = 'center';
            div.style.textAlign = 'center';
        }

        if (this.textProps.verticalAlign === 'top') {
            div.style.alignItems = 'flex-start';
        } else if (this.textProps.verticalAlign === 'bottom') {
            div.style.alignItems = 'flex-end';
        } else {
            div.style.alignItems = 'center';
        }
    }

    update(currentX, currentY, isShift = false) {
        let dx = currentX - this.startX;
        let dy = currentY - this.startY;
        if (isShift) {
            const size = Math.max(Math.abs(dx), Math.abs(dy));
            dx = dx < 0 ? -size : size;
            dy = dy < 0 ? -size : size;
        }
        const minX = Math.min(this.startX, this.startX + dx);
        const minY = Math.min(this.startY, this.startY + dy);
        const maxX = Math.max(this.startX, this.startX + dx);
        const maxY = Math.max(this.startY, this.startY + dy);
        this.points[0].x = minX; this.points[0].y = minY;
        this.points[1].x = maxX; this.points[1].y = minY;
        this.points[2].x = maxX; this.points[2].y = maxY;
        this.points[3].x = minX; this.points[3].y = maxY;
        this.updateAttributes();
    }

    updateAttributes() {
        const minX = Math.min(this.points[0].x, this.points[2].x);
        const minY = Math.min(this.points[0].y, this.points[2].y);
        const width = Math.abs(this.points[0].x - this.points[2].x);
        const height = Math.abs(this.points[0].y - this.points[2].y);
        
        if (this.bgRect) {
            this.bgRect.setAttribute('x', minX);
            this.bgRect.setAttribute('y', minY);
            this.bgRect.setAttribute('width', width);
            this.bgRect.setAttribute('height', height);
        }
        
        if (this.foreignObj) {
            this.foreignObj.setAttribute('x', minX);
            this.foreignObj.setAttribute('y', minY);
            this.foreignObj.setAttribute('width', width);
            this.foreignObj.setAttribute('height', height);
        }
    }

    containsPoint(px, py) {
        const minX = Math.min(this.points[0].x, this.points[2].x);
        const maxX = Math.max(this.points[0].x, this.points[2].x);
        const minY = Math.min(this.points[0].y, this.points[2].y);
        const maxY = Math.max(this.points[0].y, this.points[2].y);
        return px >= minX && px <= maxX && py >= minY && py <= maxY;
    }

    resize(handleIndex, newX, newY, isShift = false) {
        if (isShift) {
            let oppX, oppY;
            if (handleIndex === 0) { oppX = this.points[2].x; oppY = this.points[2].y; }
            else if (handleIndex === 1) { oppX = this.points[3].x; oppY = this.points[3].y; }
            else if (handleIndex === 2) { oppX = this.points[0].x; oppY = this.points[0].y; }
            else if (handleIndex === 3) { oppX = this.points[1].x; oppY = this.points[1].y; }

            const dx = Math.abs(newX - oppX);
            const dy = Math.abs(newY - oppY);
            const size = Math.max(dx, dy);

            newX = oppX + (newX > oppX ? size : -size);
            newY = oppY + (newY > oppY ? size : -size);
        }

        if (handleIndex === 0) { this.points[0].x = newX; this.points[0].y = newY; this.points[1].y = newY; this.points[3].x = newX; }
        else if (handleIndex === 1) { this.points[1].x = newX; this.points[1].y = newY; this.points[0].y = newY; this.points[2].x = newX; }
        else if (handleIndex === 2) { this.points[2].x = newX; this.points[2].y = newY; this.points[1].x = newX; this.points[3].y = newY; }
        else if (handleIndex === 3) { this.points[3].x = newX; this.points[3].y = newY; this.points[0].x = newX; this.points[2].y = newY; }
        
        this.updateAttributes();
        
        const cx = (this.points[0].x + this.points[2].x) / 2; 
        const cy = (this.points[0].y + this.points[2].y) / 2;
        const currentTransform = this.element.getAttribute('transform') || '';
        const match = currentTransform.match(/rotate\(([-\d.]+)/);
        if (match) this.element.setAttribute('transform', `rotate(${match[1]}, ${cx}, ${cy})`);
    }

    // [수정] 캔버스 내 직접 텍스트 편집 활성화
    enableEditing(onComplete) {
        const div = this.textDiv;
        const foreignObj = this.foreignObj;
        if (!div || !foreignObj) return;
        
        // 편집 중에는 마우스 이벤트를 받을 수 있도록 복구
        foreignObj.style.pointerEvents = 'auto';
        div.style.pointerEvents = 'auto';
        div.contentEditable = 'true';
        div.style.userSelect = 'text';
        div.style.cursor = 'text';
        div.style.outline = '1px dashed #0066cc'; // 시각적으로 편집 모드임을 강조
        div.focus();
        
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(div);
        selection.removeAllRanges();
        selection.addRange(range);

        // SVG 캔버스로의 클릭 이벤트 전파 차단
        const stopProp = (e) => e.stopPropagation();
        div.addEventListener('mousedown', stopProp);
        div.addEventListener('mousemove', stopProp);
        div.addEventListener('mouseup', stopProp);
        div.addEventListener('dblclick', stopProp);
        
        const onBlur = () => {
            // 편집 종료 후 원래 상태로 복구 (드래그 통과 상태)
            foreignObj.style.pointerEvents = 'none';
            div.style.pointerEvents = 'none';
            div.contentEditable = 'false';
            div.style.userSelect = 'none';
            div.style.cursor = 'default';
            div.style.outline = 'none';
            this.textProps.content = div.innerText;
            
            div.removeEventListener('blur', onBlur);
            div.removeEventListener('mousedown', stopProp);
            div.removeEventListener('mousemove', stopProp);
            div.removeEventListener('mouseup', stopProp);
            div.removeEventListener('dblclick', stopProp);
            
            const contentInput = document.getElementById('text-content-input');
            if (contentInput) contentInput.value = this.textProps.content;
            
            if (typeof onComplete === 'function') onComplete(this);
        };
        
        div.addEventListener('blur', onBlur);
    }
}