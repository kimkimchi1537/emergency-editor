export function createSVG(tag, attrs) {
    console.log(`[LOG] js/utils.js: createSVG 호출 (Tag: ${tag})`, attrs);
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (let k in attrs) el.setAttribute(k, attrs[k]);
    return el;
}