export function createSVG(tag, attrs) {
    console.log(`[LOG] js/utils.js: createSVG 호출 (Tag: ${tag})`, attrs);
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (let k in attrs) el.setAttribute(k, attrs[k]);
    return el;
}

export function isSameLocation(p1, p2, threshold = 0.1) {
    console.log(`[LOG] js/utils.js: isSameLocation 호출`, p1, p2);
    if (!p1 || !p2) {
        return false;
    }
    const dx = Math.abs((p1.x || 0) - (p2.x || 0));
    const dy = Math.abs((p1.y || 0) - (p2.y || 0));
    return dx < threshold && dy < threshold;
}