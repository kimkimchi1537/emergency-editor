import { createSVG } from '../utils.js';

export class ShapeRenderer {
    constructor(data) { 
        console.log(`[LOG] js/shapes/ShapeRenderer.js: constructor 호출 (ID: ${data.id})`);
        this.data = data; 
        if(!this.data.dimOffset) this.data.dimOffset = { x:0, y:0 };
        if(this.data.rotation === undefined) this.data.rotation = 0;
        if(this.data.snappable === undefined) this.data.snappable = true;
    }

    render(isSelected, isRotating) {
        console.log(`[LOG] js/shapes/ShapeRenderer.js: render 실행 (ID: ${this.data.id}, Type: ${this.data.type})`);
        const group = createSVG("g", { 
            "data-id": this.data.id,
            "data-type": this.data.type,
            "stroke-linecap": "butt",
            "stroke-linejoin": "round"
        });
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

    getDimensionLayout(subType, dimOffset) {
        console.log(`[LOG] js/shapes/ShapeRenderer.js: getDimensionLayout (기본)`);
        return null;
    }

    createDimensionGroup(isSelected) {
        console.log(`[LOG] js/shapes/ShapeRenderer.js: createDimensionGroup 호출`);
        const text = this.createDimension();
        if (!text) return null;
        const g = createSVG("g", { "data-type": "dimension-container" });
        const refPoint = this.getDimensionRefPoint();
        const finalX = refPoint.x + this.data.dimOffset.x;
        const finalY = refPoint.y + this.data.dimOffset.y;
        text.setAttribute("x", finalX); text.setAttribute("y", finalY);
        text.setAttribute("data-type", "dimension-text");
        text.style.cursor = "grab";
        const offX = this.data.dimOffset.x, offY = this.data.dimOffset.y;
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
                x1: refPoint.x, y1: refPoint.y, x2: finalX, y2: finalY, 
                stroke: "#3b82f6", "stroke-width": 1, "stroke-dasharray": "2,2", 
                "pointer-events": "none",
                "data-type": "dimension_leader"
            });
            g.appendChild(link);
        }
        g.appendChild(text);
        return g;
    }

    createGeometry() { console.log(`[LOG] js/shapes/ShapeRenderer.js: createGeometry (추상)`); return null; } 
    createHitArea() { console.log(`[LOG] js/shapes/ShapeRenderer.js: createHitArea (추상)`); return null; }
    createDimension() { console.log(`[LOG] js/shapes/ShapeRenderer.js: createDimension (추상)`); return null; }
    getDimensionRefPoint() { console.log(`[LOG] js/shapes/ShapeRenderer.js: getDimensionRefPoint (추상)`); return { x: 0, y: 0 }; }
    createHighlight() { console.log(`[LOG] js/shapes/ShapeRenderer.js: createHighlight (추상)`); return null; }
    
    applyTransform(group) {
        console.log(`[LOG] js/shapes/ShapeRenderer.js: applyTransform 호출 (ID: ${this.data.id})`);
        if (this.data.type === 'line' || this.data.type === 'arrow' || this.data.type === 'rect_group') return;
        if (this.data.rotation) {
            const ref = this.getDimensionRefPoint();
            group.setAttribute("transform", `translate(${this.data.x}, ${this.data.y}) rotate(${this.data.rotation}, ${ref.x - this.data.x}, ${ref.y - this.data.y})`);
        } else {
            group.setAttribute("transform", `translate(${this.data.x}, ${this.data.y})`);
        }
    }
}