import { createSVG } from '../utils.js';

/**
 * ShapeRenderer: 모든 도형 렌더링의 기본 추상 클래스
 * [2026-02-19] 순환 참조 해결을 위해 독립 파일로 분리.
 */
export class ShapeRenderer {
    constructor(data) { 
        this.data = data; 
        if(!this.data.dimOffset) this.data.dimOffset = { x:0, y:0 };
        if(this.data.rotation === undefined) this.data.rotation = 0;
    }

    /** 도형 그룹 렌더링 공통 프로세스 */
    render(isSelected, isRotating) {
        const group = createSVG("g", { "data-id": this.data.id });
        
        const geometry = this.createGeometry(); 
        if (geometry) group.appendChild(geometry);
        
        const dimGroup = this.createDimensionGroup(isSelected);
        if (dimGroup) group.appendChild(dimGroup);
        
        const hitArea = this.createHitArea();
        if (hitArea) group.appendChild(hitArea);

        if (isSelected) {
            const highlight = this.createHighlight();
            if (highlight) group.appendChild(highlight);
        }

        this.applyTransform(group);
        return group;
    }

    /** 치수선 텍스트 및 앵커 설정 */
    createDimensionGroup(isSelected) {
        const text = this.createDimension();
        if (!text) return null;
        
        const g = createSVG("g", { "data-type": "dimension-container" });
        const refPoint = this.getDimensionRefPoint();
        const finalX = refPoint.x + this.data.dimOffset.x;
        const finalY = refPoint.y + this.data.dimOffset.y;
        
        text.setAttribute("x", finalX);
        text.setAttribute("y", finalY);
        text.setAttribute("data-type", "dimension-text");
        text.style.cursor = "grab";

        const offX = this.data.dimOffset.x;
        const offY = this.data.dimOffset.y;

        if (Math.abs(offX) > Math.abs(offY)) {
            text.setAttribute("text-anchor", offX > 0 ? "start" : "end");
            text.setAttribute("dominant-baseline", "middle");
        } else {
            text.setAttribute("text-anchor", "middle");
            if (offY < 0) text.setAttribute("dominant-baseline", "alphabetic");
            else text.setAttribute("dominant-baseline", "hanging");
        }
        
        if (isSelected || this.data.dimOffset.x !== 0 || this.data.dimOffset.y !== 0) {
            const link = createSVG("line", {
                x1: refPoint.x, y1: refPoint.y,
                x2: finalX, y2: finalY,
                stroke: "#3b82f6", "stroke-width": 1, "stroke-dasharray": "2,2", "pointer-events": "none"
            });
            g.appendChild(link);
        }
        g.appendChild(text);
        return g;
    }

    createGeometry() { return null; } 
    createHitArea() { return null; }
    createDimension() { throw new Error("createDimension() must be implemented."); }
    getDimensionRefPoint() { throw new Error("getDimensionRefPoint() must be implemented."); }
    createHighlight() { return null; }
    
    applyTransform(group) {
        if (this.data.type === 'line' || this.data.type === 'arrow') return;
        if (this.data.rotation) {
            const ref = this.getDimensionRefPoint();
            group.setAttribute("transform", `translate(${this.data.x}, ${this.data.y}) rotate(${this.data.rotation}, ${ref.x - this.data.x}, ${ref.y - this.data.y})`);
        } else {
            group.setAttribute("transform", `translate(${this.data.x}, ${this.data.y})`);
        }
    }
}