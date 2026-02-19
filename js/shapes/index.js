import { ShapeRenderer } from './ShapeRenderer.js';
import { TextShape } from './textShape.js';
import { CONSTANTS, ICONS } from '../constants.js';
import { createSVG } from '../utils.js';

/**
 * js/shapes/index.js: 도형 모듈 통합 Entry Point
 */

export class LineShape extends ShapeRenderer {
    createGeometry() {
        if (this.data.subType === 'wall') return null;
        const line = createSVG("line", { x1: this.data.x1, y1: this.data.y1, x2: this.data.x2, y2: this.data.y2 });
        if (this.data.p1Pierced || this.data.p2Pierced) line.setAttribute("stroke-linecap", "butt");
        else line.setAttribute("stroke-linecap", "round");
        const s = CONSTANTS.STYLES[this.data.subType];
        line.setAttribute("stroke", s.stroke);
        line.setAttribute("stroke-width", s.width);
        if (this.data.type === 'arrow') line.setAttribute("marker-end", "url(#arrowhead)");
        return line;
    }
    createHitArea() { return createSVG("line", { x1: this.data.x1, y1: this.data.y1, x2: this.data.x2, y2: this.data.y2, stroke: "transparent", "stroke-width": 20 }); }
    getDimensionRefPoint() { return { x: (this.data.x1 + this.data.x2) / 2, y: (this.data.y1 + this.data.y2) / 2 }; }
    createDimension() {
        const dist = Math.sqrt(Math.pow(this.data.x2 - this.data.x1, 2) + Math.pow(this.data.y2 - this.data.y1, 2));
        const t = createSVG("text", { fill: "#1d4ed8", "font-size": 12, "font-weight": "bold" });
        t.textContent = `${(dist / 100).toFixed(1)}m`;
        return t;
    }
    createHighlight() { return createSVG("line", { x1: this.data.x1, y1: this.data.y1, x2: this.data.x2, y2: this.data.y2, stroke: "#00ffff", "stroke-width": 2, "stroke-dasharray": "5,5", "pointer-events": "none" }); }
}

export class IconShape extends ShapeRenderer {
    createGeometry() { const g = createSVG("g", {}); g.innerHTML = ICONS[this.data.iconType].svg; return g; }
    createDimension() { return null; }
    createHighlight() { 
        const ic = ICONS[this.data.iconType];
        return createSVG("rect", { x: -5, y: -5, width: ic.w+10, height: ic.h+10, fill: "none", stroke: "blue", "stroke-width": 1, "stroke-dasharray": 4, "pointer-events": "none" }); 
    }
    getDimensionRefPoint() { const ic = ICONS[this.data.iconType]; return { x: ic.w / 2, y: ic.h / 2 }; }
    applyTransform(group) {
        const ic = ICONS[this.data.iconType];
        const center = { x: ic.w / 2, y: ic.h / 2 };
        group.setAttribute("transform", `translate(${this.data.x}, ${this.data.y}) rotate(${this.data.rotation || 0}, ${center.x}, ${center.y})`);
    }
}

export { ShapeRenderer, TextShape };