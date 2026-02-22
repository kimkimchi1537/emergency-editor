import { HistoryManager } from './HistoryManager.js';

export class ColorManager {
    constructor(state, workspace) {
        this.state = state;
        this.workspace = workspace;
        this.isUpdatingUI = false;
        
        // 전역 색상 히스토리 공유 배열
        this.recentColors = [
            'rgba(230, 57, 70, 1)', 
            'rgba(29, 53, 87, 1)', 
            'rgba(42, 157, 143, 1)',
            'rgba(244, 162, 97, 1)'
        ];

        // [버그 수정부] 객체를 먼저 빈 상태로 할당하여 undefined 참조 방지
        this.pickers = {};
        this.initPicker('stroke', 'rgb(0, 0, 0)');
        this.initPicker('fill', 'rgb(255, 255, 255)');

        // 외부 영역 클릭 시 팝오버 닫기
        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.color-picker-container')) {
                document.querySelectorAll('.color-popover').forEach(p => p.classList.remove('active'));
            }
        });

        console.log(`[CLASS ColorManager] 커스텀 컬러 팝오버 및 히스토리 매니저 초기화 완료`);
    }

    parseColor(colorStr) {
        if (!colorStr || colorStr === 'transparent' || colorStr === 'none') {
            return { r: 0, g: 0, b: 0, a: 0, hex: '#000000', isTransparent: true };
        }
        if (colorStr.startsWith('#')) {
            let r = 0, g = 0, b = 0, a = 1;
            if (colorStr.length === 4) {
                r = parseInt(colorStr[1]+colorStr[1], 16);
                g = parseInt(colorStr[2]+colorStr[2], 16);
                b = parseInt(colorStr[3]+colorStr[3], 16);
            } else if (colorStr.length >= 7) {
                r = parseInt(colorStr.slice(1,3), 16);
                g = parseInt(colorStr.slice(3,5), 16);
                b = parseInt(colorStr.slice(5,7), 16);
                if (colorStr.length === 9) {
                    a = parseInt(colorStr.slice(7,9), 16) / 255;
                }
            }
            return { r, g, b, a, hex: colorStr.slice(0, 7), isTransparent: false };
        }
        if (colorStr.startsWith('rgb')) {
            const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (match) {
                const r = parseInt(match[1]);
                const g = parseInt(match[2]);
                const b = parseInt(match[3]);
                const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
                const hex = "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
                return { r, g, b, a, hex, isTransparent: false };
            }
        }
        return { r: 0, g: 0, b: 0, a: 1, hex: '#000000', isTransparent: false };
    }

    colorToString(c) {
        if (c.isTransparent) return 'transparent';
        return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
    }

    initPicker(type, defaultColor) {
        const btn = document.getElementById(`${type}-color-btn`);
        const preview = document.getElementById(`${type}-color-preview`);
        const mixedIcon = document.getElementById(`${type}-mixed-icon`);
        const popover = document.getElementById(`${type}-popover`);
        const nativePicker = document.getElementById(`${type}-native-picker`);
        const alphaSlider = document.getElementById(`${type}-alpha-slider`);
        const alphaVal = document.getElementById(`${type}-alpha-val`);
        const textInput = document.getElementById(`${type}-text-input`);
        const transparentChk = document.getElementById(`${type}-transparent-chk`);
        const recentContainer = document.getElementById(`${type}-recent-colors`);

        const ui = { btn, preview, mixedIcon, popover, nativePicker, alphaSlider, alphaVal, textInput, transparentChk, recentContainer };

        // [버그 수정부] syncLocalUI가 호출되기 전에 pickers 딕셔너리에 자신의 UI 객체를 미리 할당합니다.
        this.pickers[type] = ui;

        // 팝오버 토글
        btn.addEventListener('click', () => {
            const isActive = popover.classList.contains('active');
            document.querySelectorAll('.color-popover').forEach(p => p.classList.remove('active'));
            if (!isActive) {
                popover.classList.add('active');
                this.renderRecentColors(type);
            }
        });

        // UI 조작 핸들러
        const handleUIChange = (saveHistory = false) => {
            if (this.isUpdatingUI) return;
            
            let r=0, g=0, b=0, a=1, hex='#000000', isTransparent=false;

            if (transparentChk.checked) {
                isTransparent = true;
            } else {
                hex = nativePicker.value;
                a = parseFloat(alphaSlider.value);
                const parsed = this.parseColor(hex);
                r = parsed.r; g = parsed.g; b = parsed.b;
            }

            const colorObj = { r, g, b, a, hex, isTransparent };
            const colorStr = this.colorToString(colorObj);
            
            this.syncLocalUI(type, colorStr);
            this.applyColorToShapes(type, colorStr);

            if (saveHistory && !isTransparent) {
                this.addToHistory(colorStr);
            }
        };

        const handleTextChange = () => {
            if (this.isUpdatingUI) return;
            const parsed = this.parseColor(textInput.value);
            const colorStr = this.colorToString(parsed);
            this.syncLocalUI(type, colorStr);
            this.applyColorToShapes(type, colorStr);
            if (!parsed.isTransparent) {
                this.addToHistory(colorStr);
            }
        };

        nativePicker.addEventListener('input', () => handleUIChange(false));
        nativePicker.addEventListener('change', () => handleUIChange(true));
        alphaSlider.addEventListener('input', () => handleUIChange(false));
        alphaSlider.addEventListener('change', () => handleUIChange(true));
        transparentChk.addEventListener('change', () => handleUIChange(true));
        textInput.addEventListener('change', handleTextChange);

        // 초기 상태 설정
        if (type === 'stroke') this.state.currentStrokeColor = defaultColor;
        if (type === 'fill') this.state.currentFillColor = defaultColor;
        this.syncLocalUI(type, defaultColor);

        return ui;
    }

    syncLocalUI(type, colorStr) {
        this.isUpdatingUI = true;
        const ui = this.pickers[type];
        const parsed = this.parseColor(colorStr);

        if (parsed.isTransparent) {
            ui.preview.style.background = 'transparent';
            ui.transparentChk.checked = true;
            ui.textInput.value = 'transparent';
        } else {
            ui.preview.style.background = colorStr;
            ui.transparentChk.checked = false;
            ui.nativePicker.value = parsed.hex;
            ui.alphaSlider.value = parsed.a;
            ui.alphaVal.textContent = Math.round(parsed.a * 100) + '%';
            ui.textInput.value = colorStr;
        }
        ui.mixedIcon.style.display = 'none';
        this.isUpdatingUI = false;
    }

    addToHistory(colorStr) {
        if (colorStr === 'transparent') return;
        this.recentColors = this.recentColors.filter(c => c !== colorStr);
        this.recentColors.unshift(colorStr);
        if (this.recentColors.length > 12) {
            this.recentColors.pop();
        }
        this.renderRecentColors('stroke');
        this.renderRecentColors('fill');
    }

    renderRecentColors(type) {
        const container = this.pickers[type].recentContainer;
        container.innerHTML = '';
        this.recentColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'recent-color-swatch';
            
            const inner = document.createElement('div');
            inner.className = 'recent-color-inner';
            inner.style.background = color;
            
            swatch.appendChild(inner);
            swatch.title = color;

            swatch.addEventListener('click', () => {
                this.syncLocalUI(type, color);
                this.applyColorToShapes(type, color);
                this.pickers[type].popover.classList.remove('active');
                
                // 히스토리 클릭 시 순서를 맨 앞으로 갱신
                this.addToHistory(color);
            });
            container.appendChild(swatch);
        });
    }

    applyColorToShapes(type, colorStr) {
        if (type === 'stroke') this.state.currentStrokeColor = colorStr;
        if (type === 'fill') this.state.currentFillColor = colorStr;

        if (this.state.selectedShapes && this.state.selectedShapes.length > 0) {
            HistoryManager.getInstance(this.state, this.workspace).saveState();
            this.state.selectedShapes.forEach(shape => {
                shape.setColors(this.state.currentStrokeColor, this.state.currentFillColor);
            });
            console.log(`[COLOR-MANAGER] 선택된 ${this.state.selectedShapes.length}개 도형에 색상 일괄 적용 완료 | ${type} -> ${colorStr}`);
        }
    }

    updateUI(selectedShapes) {
        this.isUpdatingUI = true;

        if (!selectedShapes || selectedShapes.length === 0) {
            this.pickers.stroke.mixedIcon.style.display = 'none';
            this.pickers.fill.mixedIcon.style.display = 'none';
            this.isUpdatingUI = false;
            return;
        }

        const strokeSet = new Set();
        const fillSet = new Set();

        selectedShapes.forEach(shape => {
            const colors = shape.getColors();
            strokeSet.add(colors.stroke);
            fillSet.add(colors.fill);
        });

        // 선 색상 다중 체크
        if (strokeSet.size > 1) {
            this.pickers.stroke.mixedIcon.style.display = 'flex';
            this.pickers.stroke.preview.style.background = 'transparent';
        } else {
            const strokeVal = [...strokeSet][0];
            this.syncLocalUI('stroke', strokeVal);
        }

        // 채우기 색상 다중 체크
        if (fillSet.size > 1) {
            this.pickers.fill.mixedIcon.style.display = 'flex';
            this.pickers.fill.preview.style.background = 'transparent';
        } else {
            const fillVal = [...fillSet][0];
            this.syncLocalUI('fill', fillVal);
        }

        this.isUpdatingUI = false;
    }
}