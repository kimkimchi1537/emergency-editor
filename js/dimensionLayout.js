import { CONSTANTS } from './constants.js';

export class DimensionLayout {
    static getLineLayout(p1, p2, margin = 15) {
        console.log("[LOG] js/dimensionLayout.js: getLineLayout 호출");
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        
        if (len < 0.1) return { x: 0, y: 0, anchor: 'middle', baseline: 'middle' };

        const wallWidth = CONSTANTS.STYLES.wall.width || 6;
        const totalOffset = (wallWidth / 2) + margin;

        const nx = -dy / len;
        const ny = dx / len;

        const offsetX = nx * totalOffset;
        const offsetY = ny * totalOffset;

        let anchor = 'middle';
        let baseline = 'middle';

        if (ny < -0.5) baseline = 'alphabetic';
        else if (ny > 0.5) baseline = 'hanging';

        if (nx < -0.5) anchor = 'end';
        else if (nx > 0.5) anchor = 'start';

        return {
            x: (p1.x + p2.x) / 2 + offsetX,
            y: (p1.y + p2.y) / 2 + offsetY,
            anchor: anchor,
            baseline: baseline
        };
    }

    static getRectLayout(p1, p2, margin = 20) {
        console.log("[LOG] js/dimensionLayout.js: getRectLayout 호출");
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        
        const wallWidth = CONSTANTS.STYLES.wall.width || 6;
        const offset = (wallWidth / 2) + margin;

        return {
            widthLabel: {
                x: (minX + maxX) / 2,
                y: minY - offset,
                anchor: 'middle',
                baseline: 'alphabetic',
                leaderStart: { x: (minX + maxX) / 2, y: minY }
            },
            heightLabel: {
                x: maxX + offset + 15,
                y: (minY + maxY) / 2,
                anchor: 'start',
                baseline: 'middle',
                leaderStart: { x: maxX, y: (minY + maxY) / 2 }
            }
        };
    }
}