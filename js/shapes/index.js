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
            { id: id, type: 'line', subType: subType, x1: start.x, y1: start.y, x2: end.x, y2: end.y },
            { id: id + 1, type: 'dimension', parentId: id, dimOffset: { x: 0, y: 0 } }
        ];
    }

    createGeometry() {
        console.log(`[LOG] js/shapes/index.js: LineShape.createGeometry (ID: ${this.data.id})`);
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
    createHitArea() { 
        console.log(`[LOG] js/shapes/index.js: LineShape.createHitArea (ID: ${this.data.id})`);
        return createSVG("line", { x1: this.data.x1, y1: this.data.y1, x2: this.data.x2, y2: this.data.y2, stroke: "transparent", "stroke-width": 20 }); 
    }
    createDimensionGroup() { return null; }
    getDimensionRefPoint() { return { x: (this.data.x1 + this.data.x2) / 2, y: (this.data.y1 + this.data.y2) / 2 }; }
}

export class RectShape extends ShapeRenderer {
    static onDrawFinish(id, start, end) {
        console.log(`[LOG] js/shapes/index.js: RectShape.onDrawFinish 호출 (ID: ${id})`);
        const minX = Math.min(start.x, end.x), maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y), maxY = Math.max(start.y, end.y);
        return [
            { id: id, type: 'rect_group', x1: minX, y1: minY, x2: maxX, y2: maxY },
            { id: id + 1, type: 'line', subType: 'wall', x1: minX, y1: minY, x2: maxX, y2: minY, parentId: id },
            { id: id + 2, type: 'line', subType: 'wall', x1: maxX, y1: minY, x2: maxX, y2: maxY, parentId: id },
            { id: id + 3, type: 'line', subType: 'wall', x1: maxX, y1: maxY, x2: minX, y2: maxY, parentId: id },
            { id: id + 4, type: 'line', subType: 'wall', x1: minX, y1: maxY, x2: minX, y2: minY, parentId: id },
            { id: id + 5, type: 'dimension', subType: 'width', parentId: id, dimOffset: { x: 0, y: 0 } },
            { id: id + 6, type: 'dimension', subType: 'height', parentId: id, dimOffset: { x: 0, y: 0 } }
        ];
    }
    createGeometry() { return null; }
    getDimensionRefPoint() { return { x: (this.data.x1 + this.data.x2) / 2, y: (this.data.y1 + this.data.y2) / 2 }; }
}

export class DimensionShape extends ShapeRenderer {
    render(isSelected, isRotating, parentEl) {
        console.log(`[LOG] js/shapes/index.js: DimensionShape.render (ParentID: ${this.data.parentId})`);
        if (!parentEl) return null;
        const group = createSVG("g", { "data-id": this.data.id, "data-type": "dimension-container" });
        let layout;
        let valueText = "";
        if (parentEl.type === 'line' || parentEl.type === 'arrow') {
            layout = DimensionLayout.getLineLayout(parentEl, { x: parentEl.x2, y: parentEl.y2 }, this.data.dimOffset);
            valueText = MeasurementStrategies.line.format(MeasurementStrategies.line.calculate(parentEl, { x: parentEl.x2, y: parentEl.y2 }));
        } else if (parentEl.type === 'rect_group') {
            layout = DimensionLayout.getRectLayout({ x: parentEl.x1, y: parentEl.y1 }, { x: parentEl.x2, y: parentEl.y2 }, this.data.subType, this.data.dimOffset);
            const size = MeasurementStrategies.rect.calculate({ x: parentEl.x1, y: parentEl.y1 }, { x: parentEl.x2, y: parentEl.y2 });
            valueText = MeasurementStrategies.rect.format(this.data.subType === 'width' ? size.w : size.h);
        }
        if (!layout) return null;
        const leader = createSVG("line", {
            x1: layout.leaderStart.x, y1: layout.leaderStart.y,
            x2: layout.x, y2: layout.y,
            stroke: "#3b82f6", "stroke-width": 1, "stroke-dasharray": "2,2", "pointer-events": "none"
        });
        group.appendChild(leader);
        const fontSize = 12;
        const boxWidth = valueText.length * 8 + 16;
        const boxHeight = fontSize + 8;
        const rect = createSVG("rect", {
            x: layout.x - boxWidth / 2, y: layout.y - boxHeight / 2,
            width: boxWidth, height: boxHeight,
            fill: "white", stroke: "#3b82f6", "stroke-width": 1, rx: 2
        });
        group.appendChild(rect);
        const text = createSVG("text", {
            x: layout.x, y: layout.y, fill: "#1d4ed8",
            "font-size": fontSize, "font-weight": "bold",
            "text-anchor": "middle", "dominant-baseline": "middle",
            "data-type": "dimension-text"
        });
        text.style.cursor = "grab";
        text.textContent = valueText;
        group.appendChild(text);
        return group;
    }
}

export class IconShape extends ShapeRenderer {
    createGeometry() { 
        console.log(`[LOG] js/shapes/index.js: IconShape.createGeometry (ID: ${this.data.id})`);
        const g = createSVG("g", {}); g.innerHTML = ICONS[this.data.iconType].svg; return g; 
    }
    createHighlight() { 
        const ic = ICONS[this.data.iconType];
        return createSVG("rect", { x: -5, y: -5, width: ic.w+10, height: ic.h+10, fill: "none", stroke: "blue", "stroke-width": 1, "stroke-dasharray": 4, "pointer-events": "none" }); 
    }
    getDimensionRefPoint() { const ic = ICONS[this.data.iconType]; return { x: ic.w / 2, y: ic.h / 2 }; }
    applyTransform(group) {
        const ic = ICONS[this.data.iconType];
        group.setAttribute("transform", `translate(${this.data.x}, ${this.data.y}) rotate(${this.data.rotation || 0}, ${ic.w/2}, ${ic.h/2})`);
    }
}

export { ShapeRenderer, TextShape };