import { createSVG } from './utils.js';
import { DimensionLayout } from './dimensionLayout.js';

export const MeasurementStrategies = {
    line: {
        calculate: (p1, p2) => {
            console.log("[LOG] js/measurementStrategies.js: line.calculate 호출");
            return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        },
        format: (value) => {
            console.log("[LOG] js/measurementStrategies.js: line.format 호출");
            return `${(value / 100).toFixed(1)}m`;
        },
        renderLive: (container, p1, p2) => {
            console.log("[LOG] js/measurementStrategies.js: line.renderLive 호출");
            const dist = MeasurementStrategies.line.calculate(p1, p2);
            const layout = DimensionLayout.getLineLayout(p1, p2, 15);

            const text = createSVG("text", {
                x: layout.x,
                y: layout.y,
                fill: "#3b82f6",
                "font-size": "12",
                "font-weight": "bold",
                "text-anchor": layout.anchor,
                "dominant-baseline": layout.baseline,
                "pointer-events": "none"
            });
            text.textContent = MeasurementStrategies.line.format(dist);
            container.appendChild(text);
        }
    },
    rect: {
        calculate: (p1, p2) => {
            console.log("[LOG] js/measurementStrategies.js: rect.calculate 호출");
            return { w: Math.abs(p2.x - p1.x), h: Math.abs(p2.y - p1.y) };
        },
        format: (value) => {
            console.log("[LOG] js/measurementStrategies.js: rect.format 호출");
            return `${(value / 100).toFixed(1)}m`;
        },
        renderBoxedLabel: (container, layout, textContent) => {
            console.log("[LOG] js/measurementStrategies.js: renderBoxedLabel 호출");
            const g = createSVG("g", { "pointer-events": "none" });

            const leader = createSVG("line", {
                x1: layout.leaderStart.x, y1: layout.leaderStart.y,
                x2: layout.x, y2: layout.y,
                stroke: "red",
                "stroke-width": 1
            });
            g.appendChild(leader);

            const fontSize = 12;
            const paddingX = 8;
            const paddingY = 4;
            const estimatedWidth = textContent.length * 8; 
            const boxWidth = estimatedWidth + (paddingX * 2);
            const boxHeight = fontSize + (paddingY * 2);

            const rect = createSVG("rect", {
                x: layout.x - boxWidth / 2,
                y: layout.y - boxHeight / 2,
                width: boxWidth,
                height: boxHeight,
                fill: "white",
                stroke: "black",
                "stroke-width": 1
            });
            g.appendChild(rect);

            const text = createSVG("text", {
                x: layout.x,
                y: layout.y,
                fill: "#374151",
                "font-size": fontSize,
                "text-anchor": "middle",
                "dominant-baseline": "middle"
            });
            text.textContent = textContent;
            g.appendChild(text);

            container.appendChild(g);
        },
        renderLive: (container, p1, p2) => {
            console.log("[LOG] js/measurementStrategies.js: rect.renderLive 호출");
            const size = MeasurementStrategies.rect.calculate(p1, p2);
            const layout = DimensionLayout.getRectLayout(p1, p2, 25);

            MeasurementStrategies.rect.renderBoxedLabel(
                container,
                layout.widthLabel,
                MeasurementStrategies.rect.format(size.w)
            );

            MeasurementStrategies.rect.renderBoxedLabel(
                container,
                layout.heightLabel,
                MeasurementStrategies.rect.format(size.h)
            );
        }
    }
};