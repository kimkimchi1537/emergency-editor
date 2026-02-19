import { ShapeRenderer } from './index.js';
import { createSVG } from '../utils.js';

export class TextShape extends ShapeRenderer {
    createGeometry() { 
        console.log(`[LOG] js/shapes/textShape.js: createGeometry 호출 (ID: ${this.data.id})`);
        const t = createSVG("text", { 
            x: 0, y: 0, 
            "font-size": this.data.fontSize, 
            "font-weight": "bold", 
            fill: "black",
            "dominant-baseline": "alphabetic"
        }); 
        t.textContent = this.data.text; 
        return t; 
    }

    createDimension() { 
        console.log(`[LOG] js/shapes/textShape.js: createDimension 호출`);
        return null; 
    }

    createHighlight() { 
        console.log(`[LOG] js/shapes/textShape.js: createHighlight 호출 (ID: ${this.data.id})`);
        const g = createSVG("g", { "pointer-events": "none" });
        const estimatedWidth = this.data.text.length * (this.data.fontSize * 0.6);
        const padding = 4;
        const box = createSVG("rect", {
            x: -padding,
            y: -this.data.fontSize,
            width: estimatedWidth + (padding * 2),
            height: this.data.fontSize + (padding * 2),
            fill: "rgba(59, 130, 246, 0.08)",
            stroke: "#3b82f6",
            "stroke-width": 1,
            rx: 2
        });
        const handle = createSVG("rect", {
            x: -3, y: -3, width: 6, height: 6, fill: "white", stroke: "#3b82f6", "stroke-width": 1.5
        });
        g.appendChild(box);
        g.appendChild(handle);
        return g;
    }

    getDimensionRefPoint() { 
        console.log(`[LOG] js/shapes/textShape.js: getDimensionRefPoint 호출`);
        return { x: 0, y: 0 }; 
    }

    applyTransform(group) {
        console.log(`[LOG] js/shapes/textShape.js: applyTransform 호출 (ID: ${this.data.id})`);
        group.setAttribute("transform", `translate(${this.data.x}, ${this.data.y}) rotate(${this.data.rotation || 0})`);
    }
}