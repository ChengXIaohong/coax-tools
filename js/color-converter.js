const colorPreview = document.getElementById('colorPreview');
const colorPicker = document.getElementById('colorPicker');
const hexInput = document.getElementById('hexInput');
const rgbInput = document.getElementById('rgbInput');
const rgbaInput = document.getElementById('rgbaInput');
const hslInput = document.getElementById('hslInput');
const hsbInput = document.getElementById('hsbInput');
const convertBtn = document.getElementById('convertBtn');
const clearBtn = document.getElementById('clearBtn');
const randomBtn = document.getElementById('randomBtn');
const paletteGrid = document.getElementById('paletteGrid');
const messageDiv = document.getElementById('message');
const currentYearSpan = document.getElementById('currentYear');

let currentColor = { r: 0, g: 255, b: 0, a: 1 };

currentYearSpan.textContent = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', function() {
    initPalette();
    
    colorPicker.addEventListener('input', function() {
        updateFromHex(this.value);
    });
    
    convertBtn.addEventListener('click', convertFromInput);
    clearBtn.addEventListener('click', clearAll);
    randomBtn.addEventListener('click', generateRandomColor);
    
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.dataset.target;
            const input = document.getElementById(targetId);
            if (input && input.value) {
                navigator.clipboard.writeText(input.value).then(() => {
                    this.textContent = '已复制';
                    this.classList.add('copied');
                    setTimeout(() => {
                        this.textContent = '复制';
                        this.classList.remove('copied');
                    }, 1500);
                });
            }
        });
    });
    
    [hexInput, rgbInput, rgbaInput, hslInput, hsbInput].forEach(input => {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                convertFromInput();
            }
        });
    });
});

function updateFromHex(hex) {
    hex = hex.replace('#', '');
    
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    
    if (!/^[0-9A-Fa-f]{6}$/.test(hex) && !/^[0-9A-Fa-f]{3}$/.test(hex)) {
        return;
    }
    
    currentColor.r = parseInt(hex.substr(0, 2), 16);
    currentColor.g = parseInt(hex.substr(2, 2), 16);
    currentColor.b = parseInt(hex.substr(4, 2), 16);
    currentColor.a = 1;
    
    updateAllDisplays();
}

function updateFromRGB(r, g, b, a = 1) {
    currentColor.r = Math.max(0, Math.min(255, r));
    currentColor.g = Math.max(0, Math.min(255, g));
    currentColor.b = Math.max(0, Math.min(255, b));
    currentColor.a = Math.max(0, Math.min(1, a));
    
    updateAllDisplays();
}

function updateAllDisplays() {
    colorPreview.style.background = toRGBA(currentColor.r, currentColor.g, currentColor.b, currentColor.a);
    colorPicker.value = rgbToHex(currentColor.r, currentColor.g, currentColor.b);
    
    hexInput.value = rgbToHex(currentColor.r, currentColor.g, currentColor.b).toUpperCase();
    rgbInput.value = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`;
    rgbaInput.value = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${currentColor.a})`;
    
    const hsl = rgbToHSL(currentColor.r, currentColor.g, currentColor.b);
    hslInput.value = `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
    
    const hsb = rgbToHSB(currentColor.r, currentColor.g, currentColor.b);
    hsbInput.value = `hsb(${Math.round(hsb.h)}, ${Math.round(hsb.s)}%, ${Math.round(hsb.b)}%)`;
}

function convertFromInput() {
    const input = [hexInput, rgbInput, rgbaInput, hslInput, hsbInput].find(i => i.value.trim());
    
    if (!input) {
        showMessage('请输入颜色值', 'error');
        return;
    }
    
    const value = input.value.trim();
    
    if (value.match(/^#?[0-9A-Fa-f]{3}$/) || value.match(/^#?[0-9A-Fa-f]{6}$/)) {
        updateFromHex(value);
        showMessage('HEX转换成功', 'success');
    } else if (value.match(/^rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/i)) {
        const match = value.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*([\d.]+)\s*)?\)/i);
        if (match) {
            updateFromRGB(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), match[5] ? parseFloat(match[5]) : 1);
            showMessage('RGB转换成功', 'success');
        }
    } else if (value.match(/^hsl\s*\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*\)$/i)) {
        const match = value.match(/hsl\s*\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*\)/i);
        if (match) {
            const rgb = hslToRGB(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
            updateFromRGB(rgb.r, rgb.g, rgb.b);
            showMessage('HSL转换成功', 'success');
        }
    } else if (value.match(/^hsb\s*\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*\)$/i)) {
        const match = value.match(/hsb\s*\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*\)/i);
        if (match) {
            const rgb = hsbToRGB(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
            updateFromRGB(rgb.r, rgb.g, rgb.b);
            showMessage('HSB转换成功', 'success');
        }
    } else {
        showMessage('无效的颜色格式', 'error');
    }
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function toRGBA(r, g, b, a) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function rgbToHSL(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    
    return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRGB(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function rgbToHSB(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const bVal = max;
    
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    
    return { h: Math.round(h * 360), s: Math.round(s * 100), b: Math.round(bVal * 100) };
}

function hsbToRGB(h, s, b) {
    h /= 360;
    s /= 100;
    b /= 100;
    
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = b * (1 - s);
    const q = b * (1 - f * s);
    const t = b * (1 - (1 - f) * s);
    
    let r, g, blue;
    
    switch (i % 6) {
        case 0: r = b; g = t; blue = p; break;
        case 1: r = q; g = b; blue = p; break;
        case 2: r = p; g = b; blue = t; break;
        case 3: r = p; g = q; blue = b; break;
        case 4: r = t; g = p; blue = b; break;
        case 5: r = b; g = p; blue = q; break;
    }
    
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(blue * 255) };
}

function generateRandomColor() {
    updateFromRGB(
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256)
    );
    showMessage('已生成随机颜色', 'success');
}

function clearAll() {
    hexInput.value = '';
    rgbInput.value = '';
    rgbaInput.value = '';
    hslInput.value = '';
    hsbInput.value = '';
    updateFromRGB(0, 255, 0);
    hideMessage();
}

function initPalette() {
    const palette = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FF4500',
        '#9370DB', '#20B2AA', '#FFD700', '#DC143C', '#00FA9A'
    ];
    
    paletteGrid.innerHTML = '';
    palette.forEach(color => {
        const div = document.createElement('div');
        div.className = 'palette-color';
        div.style.background = color;
        div.dataset.hex = color;
        div.addEventListener('click', function() {
            updateFromHex(this.dataset.hex);
            showMessage('已选择颜色: ' + this.dataset.hex, 'success');
        });
        paletteGrid.appendChild(div);
    });
}

function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = 'message';
    messageDiv.classList.add(type + '-message');
    messageDiv.style.display = 'block';
    
    setTimeout(hideMessage, 2000);
}

function hideMessage() {
    messageDiv.style.display = 'none';
}