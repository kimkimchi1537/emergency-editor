export function breakLine(line, rect) {
    console.log(`[LOG] js/wallBreaker.js: breakLine 호출 (ID: ${line.id})`);
    const { x1, y1, x2, y2 } = line;
    const minX = rect.x;
    const maxX = rect.x + rect.w;
    const minY = rect.y;
    const maxY = rect.y + rect.h;

    const isInside = (px, py) => {
        console.log(`[LOG] js/wallBreaker.js: isInside 체크 (${px}, ${py})`);
        return px >= minX && px <= maxX && py >= minY && py <= maxY;
    };
    
    const p1AlreadyPierced = line.p1Pierced || false;
    const p2AlreadyPierced = line.p2Pierced || false;

    if (isInside(x1, y1) && isInside(x2, y2)) {
        console.log(`[LOG] js/wallBreaker.js: 선분 완전 제거됨 (ID: ${line.id})`);
        return [];
    }

    const createFragment = (ax, ay, bx, by) => {
        console.log(`[LOG] js/wallBreaker.js: createFragment 실행 (${ax}, ${ay}) to (${bx}, ${by})`);
        const isAOriginalP1 = Math.abs(ax - x1) < 0.1 && Math.abs(ay - y1) < 0.1;
        const isAOriginalP2 = Math.abs(ax - x2) < 0.1 && Math.abs(ay - y2) < 0.1;
        const isBOriginalP1 = Math.abs(bx - x1) < 0.1 && Math.abs(by - y1) < 0.1;
        const isBOriginalP2 = Math.abs(bx - x2) < 0.1 && Math.abs(by - y2) < 0.1;

        return {
            x1: ax, y1: ay,
            x2: bx, y2: by,
            p1Pierced: isAOriginalP1 ? p1AlreadyPierced : (isAOriginalP2 ? p2AlreadyPierced : true),
            p2Pierced: isBOriginalP1 ? p1AlreadyPierced : (isBOriginalP2 ? p2AlreadyPierced : true)
        };
    };

    if (y1 === y2) {
        console.log(`[LOG] js/wallBreaker.js: 수평선 절단 처리 시작`);
        if (y1 < minY || y1 > maxY) return [createFragment(x1, y1, x2, y2)];
        const startX = Math.min(x1, x2);
        const endX = Math.max(x1, x2);
        const overlapStart = Math.max(startX, minX);
        const overlapEnd = Math.min(endX, maxX);
        
        if (overlapStart >= overlapEnd) return [createFragment(x1, y1, x2, y2)];

        const frags = [];
        if (startX < overlapStart) {
            if (x1 < x2) frags.push(createFragment(x1, y1, overlapStart, y1));
            else frags.push(createFragment(overlapStart, y1, x1, y1));
        }
        if (endX > overlapEnd) {
            if (x1 < x2) frags.push(createFragment(overlapEnd, y1, x2, y2));
            else frags.push(createFragment(x2, y2, overlapEnd, y1));
        }
        return frags;
    }

    if (x1 === x2) {
        console.log(`[LOG] js/wallBreaker.js: 수직선 절단 처리 시작`);
        if (x1 < minX || x1 > maxX) return [createFragment(x1, y1, x2, y2)];
        const startY = Math.min(y1, y2);
        const endY = Math.max(y1, y2);
        const overlapStart = Math.max(startY, minY);
        const overlapEnd = Math.min(endY, maxY);
        
        if (overlapStart >= overlapEnd) return [createFragment(x1, y1, x2, y2)];

        const frags = [];
        if (startY < overlapStart) {
            if (y1 < y2) frags.push(createFragment(x1, y1, x1, overlapStart));
            else frags.push(createFragment(x1, overlapStart, x1, y1));
        }
        if (endY > overlapEnd) {
            if (y1 < y2) frags.push(createFragment(x1, overlapEnd, x1, y2));
            else frags.push(createFragment(x1, y2, x1, overlapEnd));
        }
        return frags;
    }

    console.log(`[LOG] js/wallBreaker.js: 대각선 무시 (원본 유지)`);
    return [createFragment(x1, y1, x2, y2)];
}