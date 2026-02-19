import { ShapeRenderer } from './ShapeRenderer.js';
import { TextShape } from './textShape.js';
import { CONSTANTS, ICONS } from '../constants.js';
import { createSVG } from '../utils.js';
import { MeasurementStrategies } from '../measurementStrategies.js';
import { DimensionLayout } from '../dimensionLayout.js';

export class LineShape extends ShapeRenderer {
    static onDrawFinish(id, start, end, subType) {
        console.log(`[LOG] js/shapes/index.js: LineShape.onDrawFinish 호출 (ID: ${id})`);
        return [
            { id: id, type: 'line', subType: subType, x1: start.x, y1: start.y, x2: end.x, y2: end.y, snappable: true },
            { id: id + 1, type: 'dimension', parentId: id, dimOffset: { x: 0, y: 0 }, snappable: false }
        ];
    }

    static renderLive(container, start, end, mode) {
        console.log(`[LOG] js/shapes/index.js: LineShape.renderLive 호출`);
        const line = createSVG("line", { x1: start.x, y1: start.y, x2: end.x, y2: end.y, stroke: "#3b82f6", "stroke-width": 2, "stroke-dasharray": "5,5" });
        container.appendChild(line);
        MeasurementStrategies.line.renderLive(container, start, end);
    }

    getDimensionLayout(subType, dimOffset) {
        console.log(`[LOG] js/shapes/index.js: LineShape.getDimensionLayout 호출`);
        const layout = DimensionLayout.getLineLayout({ x: this.data.x1 || 0, y: this.data.y1 || 0 }, { x: this.data.x2 || 0, y: this.data.y2 || 0 }, 20);
        if (layout) { layout.x += (dimOffset.x || 0); layout.y += (dimOffset.y || 0); }
        return layout;
    }

    createGeometry() {
        console.log(`[LOG] js/shapes/index.js: LineShape.createGeometry (ID: ${this.data.id})`);
        const line = createSVG("line", { x1: this.data.x1, y1: this.data.y1, x2: this.data.x2, y2: this.data.y2 });
        const s = CONSTANTS.STYLES[this.data.subType] || { stroke: "black", width: 2 };
        line.setAttribute("stroke", s.stroke);
        line.setAttribute("stroke-width", s.width);
        if (this.data.type === 'arrow') line.setAttribute("marker-end", "url(#arrowhead)");
        return line;
    }
    createHitArea() { return createSVG("line", { x1: this.data.x1, y1: this.data.y1, x2: this.data.x2, y2: this.data.y2, stroke: "transparent", "stroke-width": 20 }); }
    createDimension() { return null; }
    getDimensionRefPoint() { return { x: ((this.data.x1 || 0) + (this.data.x2 || 0)) / 2, y: ((this.data.y1 || 0) + (this.data.y2 || 0)) / 2 }; }
}

export class RectShape extends ShapeRenderer {
    static onDrawFinish(id, start, end) {
        console.log(`[LOG] js/shapes/index.js: RectShape.onDrawFinish 호출 (ID: ${id})`);
        const minX = Math.min(start.x, end.x), maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y), maxY = Math.max(start.y, end.y);
        return [
            { id: id, type: 'rect_group', x1: minX, y1: minY, x2: maxX, y2: maxY, snappable: true },
            { id: id + 1, type: 'dimension', subType: 'width', parentId: id, dimOffset: { x: 0, y: 0 }, snappable: false },
            { id: id + 2, type: 'dimension', subType: 'height', parentId: id, dimOffset: { x: 0, y: 0 }, snappable: false }
        ];
    }

    static renderLive(container, start, end, mode) {
        console.log(`[LOG] js/shapes/index.js: RectShape.renderLive 호출`);
        const minX = Math.min(start.x, end.x), minY = Math.min(start.y, end.y);
        const w = Math.abs(end.x - start.x), h = Math.abs(end.y - start.y);
        const rect = createSVG("rect", { x: minX, y: minY, width: w, height: h, fill: "none", stroke: "#3b82f6", "stroke-width": 2, "stroke-dasharray": "5,5" });
        container.appendChild(rect);
        MeasurementStrategies.rect.renderLive(container, start, end);
    }

    getDimensionLayout(subType, dimOffset) {
        console.log(`[LOG] js/shapes/index.js: RectShape.getDimensionLayout 호출 (subType: ${subType})`);
        const fullLayout = DimensionLayout.getRectLayout({ x: this.data.x1 || 0, y: this.data.y1 || 0 }, { x: this.data.x2 || 0, y: this.data.y2 || 0 }, 20);
        const layout = subType === 'height' ? fullLayout.heightLabel : fullLayout.widthLabel;
        if (layout) { layout.x += (dimOffset.x || 0); layout.y += (dimOffset.y || 0); }
        return layout;
    }

    createGeometry() {
        console.log(`[LOG] js/shapes/index.js: RectShape.createGeometry (ID: ${this.data.id})`);
        const x = Math.min(this.data.x1, this.data.x2);
        const y = Math.min(this.data.y1, this.data.y2);
        const w = Math.abs(this.data.x2 - this.data.x1);
        const h = Math.abs(this.data.y2 - this.data.y1);
        return createSVG("rect", { 
            x, y, width: w, height: h, 
            fill: "none", 
            stroke: "black", 
            "stroke-width": 6,
            "stroke-linejoin": "round"
        });
    }

    createDimension() { return null; }

    createHitArea() {
        console.log(`[LOG] js/shapes/index.js: RectShape.createHitArea 호출`);
        const x = Math.min(this.data.x1, this.data.x2);
        const y = Math.min(this.data.y1, this.data.y2);
        const w = Math.abs(this.data.x2 - this.data.x1);
        const h = Math.abs(this.data.y2 - this.data.y1);
        return createSVG("rect", { x, y, width: w, height: h, fill: "rgba(59, 130, 246, 0.05)", stroke: "none" });
    }

    createHighlight() {
        console.log(`[LOG] js/shapes/index.js: RectShape.createHighlight 호출`);
        const x = Math.min(this.data.x1, this.data.x2);
        const y = Math.min(this.data.y1, this.data.y2);
        const w = Math.abs(this.data.x2 - this.data.x1);
        const h = Math.abs(this.data.y2 - this.data.y1);
        return createSVG("rect", { x: x - 2, y: y - 2, width: w + 4, height: h + 4, fill: "none", stroke: "#3b82f6", "stroke-width": 1, "stroke-dasharray": "4,4", rx: 2 });
    }

    getDimensionRefPoint() { 
        console.log(`[LOG] js/shapes/index.js: RectShape.getDimensionRefPoint 호출`);
        return { x: ((this.data.x1 || 0) + (this.data.x2 || 0)) / 2, y: ((this.data.y1 || 0) + (this.data.y2 || 0)) / 2 }; 
    }
}

export class DimensionShape extends ShapeRenderer {
    render(isSelected, isRotating, parentEl) {
        console.log(`[LOG] js/shapes/index.js: DimensionShape.render 호출 (Parent ID: ${parentEl ? parentEl.id : 'None'})`);
        if (!parentEl) return null;
        let parentInstance;
        switch(parentEl.type) {
            case 'line': case 'arrow': parentInstance = new LineShape(parentEl); break;
            case 'rect_group': parentInstance = new RectShape(parentEl); break;
            default: return null;
        }
        const layout = parentInstance.getDimensionLayout(this.data.subType, this.data.dimOffset);
        if (!layout || !layout.leaderStart) return null;
        const group = createSVG("g", { "data-id": this.data.id, "data-type": "dimension-container" });
        let valueText = "";
        if (parentEl.type === 'line' || parentEl.type === 'arrow') {
            valueText = MeasurementStrategies.line.format(MeasurementStrategies.line.calculate({x: parentEl.x1, y: parentEl.y1}, {x: parentEl.x2, y: parentEl.y2}));
        } else {
            const size = MeasurementStrategies.rect.calculate({x: parentEl.x1, y: parentEl.y1}, {x: parentEl.x2, y: parentEl.y2});
            valueText = MeasurementStrategies.rect.format(this.data.subType === 'height' ? size.h : size.w);
        }
        const leader = createSVG("line", { 
            x1: layout.leaderStart.x, y1: layout.leaderStart.y, x2: layout.x, y2: layout.y, 
            stroke: "#3b82f6", "stroke-width": 1, "stroke-dasharray": "2,2", 
            "pointer-events": "none",
            "data-type": "dimension_leader"
        });
        group.appendChild(leader);
        const fontSize = 12, boxWidth = valueText.length * 8 + 16, boxHeight = fontSize + 8;
        const rect = createSVG("rect", { 
            x: layout.x - boxWidth / 2, y: layout.y - boxHeight / 2, 
            width: boxWidth, height: boxHeight, 
            fill: "white", stroke: "#3b82f6", "stroke-width": 1, rx: 2 
        });
        group.appendChild(rect);
        const text = createSVG("text", { 
            x: layout.x, y: layout.y, fill: "#1d4ed8", "font-size": fontSize, 
            "font-weight": "bold", "text-anchor": "middle", "dominant-baseline": "middle", 
            "data-type": "dimension-text" 
        });
        text.style.cursor = "grab"; text.textContent = valueText;
        group.appendChild(text);
        return group;
    }
}

export class IconShape extends ShapeRenderer {
    createGeometry() { 
        console.log(`[LOG] js/shapes/index.js: IconShape.createGeometry (ID: ${this.data.id})`);
        const g = createSVG("g", {}); g.innerHTML = (ICONS[this.data.iconType] || {}).svg || ""; return g; 
    }
    createDimension() { return null; }
    getDimensionLayout() { return null; }
    createHighlight() { 
        const ic = ICONS[this.data.iconType];
        if (!ic) return null;
        return createSVG("rect", { x: -5, y: -5, width: ic.w+10, height: ic.h+10, fill: "none", stroke: "blue", "stroke-width": 1, "stroke-dasharray": 4, "pointer-events": "none" }); 
    }
    getDimensionRefPoint() { const ic = ICONS[this.data.iconType] || {w:0,h:0}; return { x: ic.w / 2, y: ic.h / 2 }; }
    applyTransform(group) {
        const ic = ICONS[this.data.iconType] || {w:0,h:0};
        group.setAttribute("transform", `translate(${this.data.x}, ${this.data.y}) rotate(${this.data.rotation || 0}, ${ic.w/2}, ${ic.h/2})`);
    }
}

export { ShapeRenderer, TextShape };