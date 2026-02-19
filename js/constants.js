export const CONSTANTS = {
    PAPER_SIZES: {
        A3: { width: 420, height: 297, label: 'A3 (420x297mm)' },
        A4: { width: 297, height: 210, label: 'A4 (297x210mm)' },
        B3: { width: 515, height: 364, label: 'B3 (515x364mm)' },
        B4: { width: 364, height: 257, label: 'B4 (364x257mm)' },
    },
    STYLES: {
        wall: { stroke: 'black', width: 6 },
        window: { stroke: '#4682B4', width: 2 },
        route: { stroke: '#32CD32', width: 8 },
    },
    HEADER_HEIGHT: 60,
    SIDEBAR_WIDTH: 250,
    LEGEND_HEIGHT: 50,
    SNAP_INTERVAL: 10,
    VERTEX_SNAP_DIST: 15,
};

export const ICONS = {
    extinguisher: { label: '소화기', svg: `<g transform="scale(0.8)"><path d="M10 20 h10 v25 h-10 z" fill="#FF0000" /><path d="M15 20 v-5" stroke="black" strokeWidth="2" /><circle cx="15" cy="12" r="3" fill="none" stroke="black" strokeWidth="2" /><path d="M18 12 l5 5" stroke="black" strokeWidth="2" /></g>`, w: 30, h: 50 },
    hydrant: { label: '옥내소화전', svg: `<g><rect x="0" y="0" width="30" height="30" fill="#FF0000" /><circle cx="15" cy="15" r="10" fill="white" /><text x="15" y="20" fontSize="14" text-anchor="middle" fontWeight="bold" fill="red">H</text></g>`, w: 30, h: 30 },
    exit: { label: '비상구', svg: `<g><rect x="0" y="0" width="40" height="20" fill="#008000" /><path d="M15 5 l5 0 l2 5 l-2 5 l-2 0" stroke="white" strokeWidth="2" fill="none"/><circle cx="12" cy="5" r="2" fill="white" /><path d="M30 5 v10 l-5 -5 z" fill="white" /></g>`, w: 40, h: 20 },
    current: { label: '현위치', svg: `<g><circle cx="15" cy="15" r="12" fill="#0000FF" /><circle cx="15" cy="10" r="3" fill="white" /><path d="M15 14 l-5 10 h10 z" fill="white" /></g>`, w: 30, h: 30 },
    alarm: { label: '발신기', svg: `<g><circle cx="10" cy="10" r="10" fill="#FF0000" stroke="red" /><circle cx="10" cy="10" r="6" fill="white" /><circle cx="10" cy="10" r="3" fill="red" /></g>`, w: 20, h: 20 }
};