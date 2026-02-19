import { ShapeRenderer } from './index.js'; // 같은 폴더의 index.js에서 추상 클래스 참조
import { createSVG } from '../utils.js';    // 한 단계 상위 폴더의 utils 참조

/**
 * TextShape: 도면 내 텍스트 라벨을 담당하는 전문 모듈
 * [2026-02-19] js/shapes/textShape.js로 명칭 교정 완료.
 */
export class TextShape extends ShapeRenderer {
    /** 텍스트 지오메트리 생성 */
    createGeometry() { 
        const t = createSVG("text", { 
            x: 0, y: 0, 
            "font-size": this.data.fontSize, 
            "font-weight": "bold", 
            fill: "black",
            "dominant-baseline": "alphabetic"
        }); 
        t.textContent = this.data.text; 
        return t; 
    }

    createDimension() { return null; }

    /**
     * [UI 고도화] 텍스트 선택 시 하이라이트
     * 바운딩 박스(Figma 스타일)를 렌더링합니다.
     */
    createHighlight() { 
        const g = createSVG("g", { "pointer-events": "none" });
        
        // 1. 바운딩 박스 가이드 계산 (글자수 기반 추정)
        const estimatedWidth = this.data.text.length * (this.data.fontSize * 0.6);
        const padding = 4;
        
        const box = createSVG("rect", {
            x: -padding,
            y: -this.data.fontSize,
            width: estimatedWidth + (padding * 2),
            height: this.data.fontSize + (padding * 2),
            fill: "rgba(59, 130, 246, 0.08)",
            stroke: "#3b82f6",
            "stroke-width": 1,
            rx: 2
        });

        // 2. 기준점 앵커 핸들 - 정교한 사각형 노드
        const handle = createSVG("rect", {
            x: -3,
            y: -3,
            width: 6,
            height: 6,
            fill: "white",
            stroke: "#3b82f6",
            "stroke-width": 1.5
        });

        g.appendChild(box);
        g.appendChild(handle);
        
        console.log(`[LOG] textShape.js: ID ${this.data.id} 하이라이트 생성 완료`);
        return g;
    }

    getDimensionRefPoint() { return { x: 0, y: 0 }; }

    applyTransform(group) {
        group.setAttribute("transform", `translate(${this.data.x}, ${this.data.y}) rotate(${this.data.rotation || 0})`);
    }
}