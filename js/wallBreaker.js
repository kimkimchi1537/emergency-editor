/**
 * wallBreaker: 선분을 특정 사각형 영역으로 자르고 남은 부분을 계산하는 모듈
 */

/**
 * 선분 하나를 사각형 영역으로 자릅니다.
 * @param {Object} line - {x1, y1, x2, y2}를 포함하는 선분 데이터
 * @param {Object} rect - {x, y, w, h} 형태의 삭제 영역
 * @returns {Array} - 잘리고 남은 선분 조각들의 좌표 배열 [{x1, y1, x2, y2, p1Pierced, p2Pierced}, ...]
 */
export function breakLine(line, rect) {
    const { x1, y1, x2, y2 } = line;
    const minX = rect.x;
    const maxX = rect.x + rect.w;
    const minY = rect.y;
    const maxY = rect.y + rect.h;

    // 점이 삭제 영역 내부에 있는지 확인
    const isInside = (px, py) => px >= minX && px <= maxX && py >= minY && py <= maxY;
    
    // 원래부터 뚫려있던 점인지 확인 (연쇄 작업 대응)
    const p1AlreadyPierced = line.p1Pierced || false;
    const p2AlreadyPierced = line.p2Pierced || false;

    if (isInside(x1, y1) && isInside(x2, y2)) {
        console.log(`[LOG] wallBreaker.js: 선분이 완전히 제거됨 (ID: ${line.id})`);
        return [];
    }

    /**
     * 파편 객체 생성 헬퍼
     * 원본 좌표와 대조하여 새로 생성된 점(절단면)에 pierced 플래그를 심습니다.
     */
    const createFragment = (ax, ay, bx, by) => {
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

    // 1. 수평선 처리
    if (y1 === y2) {
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

    // 2. 수직선 처리
    if (x1 === x2) {
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

    // 3. 대각선 (현재는 원본 유지, 추후 확장 가능)
    return [createFragment(x1, y1, x2, y2)];
}