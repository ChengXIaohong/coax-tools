/**
 * 文字云生成器
 * 使用 wordcloud2.js CDN
 */

(function() {
    'use strict';

    // =====================
    // 配置与状态
    // =====================

    const state = {
        words: [],           // [[word, weight], ...]
        currentShape: 'circle',
        customMaskImage: null,
        colorScheme: 'green',
        bgColor: 'dark',
        width: 800,
        height: 600,
        fontSizeMin: 14,
        fontSizeMax: 80,
        enableRotation: true,
        canDownload: false,
        lastGeneratedWords: null   // 缓存上次生成的数据，用于SVG导出
    };

    // 形状配置（扩展更多内置形状）
    const shapeConfig = {
        circle: 'circle',
        heart: 'cardioid',
        star: 'star',
        triangle: 'triangle',
        diamond: 'diamond',
        pentagon: 'pentagon',
        hexagon: 'hexagon'
    };

    // 新增：更多形状选项（用于UI展示）
    const extraShapes = ['triangle', 'diamond', 'pentagon', 'hexagon'];

    // 配色方案
    const colorSchemes = {
        green: ['#00e676', '#00c853', '#00a852', '#69f0ae', '#b9f6ca', '#00e676'],
        blue: ['#00aaff', '#0099cc', '#00b0ff', '#80d8ff', '#00aaff', '#0099cc'],
        sunset: ['#ff6b35', '#ff4500', '#ff8c00', '#ffa500', '#ff6b35', '#ff5722'],
        purple: ['#9b59b6', '#8e44ad', '#a855f7', '#d946ef', '#c084fc', '#9b59b6'],
        rainbow: [
            '#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#8b00ff',
            '#ff1493', '#00ff7f', '#ffd700', '#00ffff', '#ff00ff', '#1e90ff'
        ],
        monochrome: [
            '#ffffff', '#e0e0e0', '#c0c0c0', '#a0a0a0', '#808080', '#606060',
            '#404040', '#202020', '#101010', '#000000'
        ]
    };

    // 背景色
    const bgColors = {
        dark: 'rgba(12, 12, 12, 1)',
        light: 'rgba(248, 248, 248, 1)',
        transparent: 'rgba(0, 0, 0, 0)'
    };

    // =====================
    // DOM 元素
    // =====================

    const $ = (id) => document.getElementById(id);

    const elements = {
        // 消息
        message: $('message'),

        // 输入
        textInput: $('textInput'),
        fileInput: $('fileInput'),

        // 配置
        shapeButtons: document.querySelectorAll('.shape-btn:not(.custom-shape-btn)'),
        customShapeInput: $('customShapeInput'),
        customShapeName: $('customShapeName'),
        colorScheme: $('colorScheme'),
        canvasWidth: $('canvasWidth'),
        canvasHeight: $('canvasHeight'),
        fontSizeMin: $('fontSizeMin'),
        fontSizeMax: $('fontSizeMax'),
        enableRotation: $('enableRotation'),
        bgColorBtns: document.querySelectorAll('.bg-color-btn'),

        // 操作
        generateBtn: $('generateBtn'),
        downloadBtn: $('downloadBtn'),
        downloadSvgBtn: $('downloadSvgBtn'),
        previewActions: $('previewActions'),

        // 预览
        canvas: $('wordCloudCanvas'),
        canvasContainer: $('canvasContainer'),
        previewPlaceholder: $('previewPlaceholder'),
        canvasSpinner: $('canvasSpinner'),
        previewPanel: $('previewPanel'),

        // 操作（新增）
        regenerateBtn: $('regenerateBtn'),
        editAgainBtn: $('editAgainBtn'),
        editAgainActions: $('editAgainActions'),

        // 配置面板折叠
        configPanel: $('configPanel'),
        configToggle: $('configToggle'),

        // 区域
        contentZone: $('contentZone')
    };

    // =====================
    // 初始化
    // =====================

    function init() {
        bindEvents();
        updateCurrentYear();

        // 加载保存的配置
        loadConfig();
        applyConfigToUI();
    }

    function updateCurrentYear() {
        const yearEl = $('currentYear');
        if (yearEl) yearEl.textContent = new Date().getFullYear();
    }

    // =====================
    // 事件绑定
    // =====================

    function bindEvents() {
        // 文件上传
        elements.fileInput.addEventListener('change', handleFileUpload);

        // 形状选择
        elements.shapeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                selectShape(btn.dataset.shape);
                autoRegenerate();
            });
        });

        // 自定义形状
        elements.customShapeInput.addEventListener('change', (e) => {
            handleCustomShape(e);
            autoRegenerate();
        });

        // 配色方案
        elements.colorScheme.addEventListener('change', (e) => {
            state.colorScheme = e.target.value;
            autoRegenerate();
        });

        // 尺寸
        elements.canvasWidth.addEventListener('change', (e) => {
            state.width = parseInt(e.target.value) || 800;
            autoRegenerate();
        });
        elements.canvasHeight.addEventListener('change', (e) => {
            state.height = parseInt(e.target.value) || 600;
            autoRegenerate();
        });

        // 字体大小
        elements.fontSizeMin.addEventListener('change', (e) => {
            state.fontSizeMin = parseInt(e.target.value) || 14;
            autoRegenerate();
        });
        elements.fontSizeMax.addEventListener('change', (e) => {
            state.fontSizeMax = parseInt(e.target.value) || 80;
            autoRegenerate();
        });

        // 旋转
        elements.enableRotation.addEventListener('change', (e) => {
            state.enableRotation = e.target.checked;
            autoRegenerate();
        });

        // 背景色
        elements.bgColorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                selectBgColor(btn.dataset.bg);
                autoRegenerate();
            });
        });

        // 配置面板折叠
        elements.configToggle.addEventListener('click', () => {
            elements.configPanel.classList.toggle('collapsed');
        });

        // 生成
        elements.generateBtn.addEventListener('click', () => generateWordCloud(false));

        // 重新生成
        elements.regenerateBtn.addEventListener('click', () => generateWordCloud(true));

        // 重新编辑
        elements.editAgainBtn.addEventListener('click', resetToEditMode);

        // 下载
        elements.downloadBtn.addEventListener('click', downloadImage);

        // SVG 下载
        if (elements.downloadSvgBtn) {
            elements.downloadSvgBtn.addEventListener('click', downloadSVG);
        }
    }

    // =====================
    // 文件上传
    // =====================

    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            elements.textInput.value = event.target.result;
        };
        reader.readAsText(file);

        // 清空 input 以便重复选择同一文件
        e.target.value = '';
    }

    // =====================
    // 形状选择
    // =====================

    function selectShape(shape) {
        state.currentShape = shape;
        state.customMaskImage = null;

        elements.shapeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.shape === shape);
        });

        elements.customShapeInput.parentElement.classList.remove('active');
        elements.customShapeName.classList.remove('visible');
    }

    function handleCustomShape(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                state.customMaskImage = img;
                state.currentShape = 'custom';

                elements.shapeButtons.forEach(btn => {
                    btn.classList.remove('active');
                });
                elements.customShapeInput.parentElement.classList.add('active');
                elements.customShapeName.textContent = `已选: ${file.name}`;
                elements.customShapeName.classList.add('visible');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);

        e.target.value = '';
    }

    // =====================
    // 背景色选择
    // =====================

    function selectBgColor(bg) {
        state.bgColor = bg;
        elements.bgColorBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.bg === bg);
        });
    }

    // =====================
    // 数据解析
    // =====================

    function parseTextInput(text) {
        const lines = text.trim().split('\n');
        const words = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const parts = trimmed.split(/\s+/);
            if (parts.length >= 2) {
                const word = parts.slice(0, -1).join(' ');
                const weight = parseFloat(parts[parts.length - 1]);
                if (!isNaN(weight) && weight > 0) {
                    words.push([word, weight]);
                } else {
                    words.push([trimmed, 1]);
                }
            } else {
                words.push([trimmed, 1]);
            }
        }

        return words;
    }

    /**
     * 自动检测格式并解析
     * 判断依据：第一行是否包含 "词" 或 "word" 或纯数字+逗号
     */
    function detectAndParse(text) {
        const firstLine = text.trim().split('\n')[0].trim();

        // 检测是否是 CSV 格式：包含逗号，且第一行不是纯中文词（无频次）
        const isCSV = /^[^,]*,[^,]*$/.test(firstLine) || firstLine.includes(',');

        if (isCSV) {
            return parseCSVInput(text);
        }
        return parseTextInput(text);
    }

    function parseCSVInput(text) {
        const lines = text.trim().split('\n');
        const words = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // 健壮的 CSV 解析：支持引号包裹、转义符
            const parsed = parseCSVLine(trimmed);
            if (parsed.length >= 2) {
                const word = parsed[0].trim();
                const weight = parseFloat(parsed[1].trim());
                if (word && !isNaN(weight) && weight > 0) {
                    words.push([word, weight]);
                } else if (word) {
                    words.push([word, 1]);
                }
            } else if (parsed.length === 1) {
                // 没有逗号，当作单个词，频次为 1
                const word = parsed[0].trim();
                if (word) words.push([word, 1]);
            }
        }

        return words;
    }

    /**
     * 健壮的 CSV 行解析
     * 支持：引号包裹、转义引号、逗号分隔
     */
    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        let i = 0;

        while (i < line.length) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // 转义引号："" -> "
                    current += '"';
                    i += 2;
                } else {
                    // 开始或结束引号
                    inQuotes = !inQuotes;
                    i++;
                }
            } else if (char === ',' && !inQuotes) {
                // 分隔符
                result.push(current);
                current = '';
                i++;
            } else {
                current += char;
                i++;
            }
        }

        result.push(current);
        return result;
    }

    // =====================
    // 词云生成
    // =====================

    let regenerateTimer = null;

    /**
     * 防抖自动重渲染：配置变化后延迟刷新
     */
    function autoRegenerate() {
        if (!state.canDownload) return;
        clearTimeout(regenerateTimer);
        regenerateTimer = setTimeout(() => {
            generateWordCloud(true);
        }, 400);
    }

    /**
     * 重置为编辑模式
     */
    function resetToEditMode() {
        elements.contentZone.classList.remove('has-result');
        elements.inputPanel.classList.remove('hidden');
        elements.previewPanel.classList.add('hidden');
        state.canDownload = false;
        state.words = [];
        elements.canvas.getContext('2d').clearRect(0, 0, state.width, state.height);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * 生成词云
     * @param {boolean} isRegenerate - 是否为重新生成（跳过输入验证）
     */
    function generateWordCloud(isRegenerate) {
        // 获取输入数据（首次生成需验证）
        if (!isRegenerate) {
            const text = elements.textInput.value;
            if (!text.trim()) {
                showStatus('请输入文本数据', 'error');
                return;
            }
            const words = detectAndParse(text);
            if (words.length === 0) {
                showStatus('未能解析有效数据', 'error');
                return;
            }
            state.words = words;
        }

        // 获取当前配置
        const width = state.width;
        const height = state.height;
        const words = state.words;
        const colors = colorSchemes[state.colorScheme] || colorSchemes.green;

        // 设置 canvas 尺寸
        const canvas = elements.canvas;
        canvas.width = width;
        canvas.height = height;

        // 设置背景色
        const ctx = canvas.getContext('2d');
        const bgColor = bgColors[state.bgColor] || bgColors.dark;
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        // 计算权重范围
        const weights = words.map(w => w[1]);
        const minWeight = Math.min(...weights);
        const maxWeight = Math.max(...weights);

        // 构建 WordCloud 选项
        const options = {
            list: words,
            gridSize: Math.round(16 * width / 800),
            weightFactor: function(weight) {
                if (maxWeight === minWeight) {
                    return (state.fontSizeMin + state.fontSizeMax) / 2;
                }
                return state.fontSizeMin + (weight - minWeight) / (maxWeight - minWeight) * (state.fontSizeMax - state.fontSizeMin);
            },
            fontMin: 1,
            fontMax: 1,
            fontFamily: '"SF Mono", "Fira Code", "Consolas", "Monaco", monospace',
            drawOutOfBound: false,
            shrinkToFit: true,
            backgroundColor: bgColors[state.bgColor],
            color: function() {
                return colors[Math.floor(Math.random() * colors.length)];
            },
            rotateRatio: state.enableRotation ? 0.5 : 0,
            rotationSteps: state.enableRotation ? 2 : 0,
            rotationRange: state.enableRotation ? [-90, 90] : [0, 0],
            shape: getShapeOption(state.currentShape),
            maskImage: state.customMaskImage,
            clearCanvas: true
        };

        try {
            // 显示内嵌加载指示器
            elements.canvasSpinner.classList.add('active');

            // 延迟执行以显示 spinner
            setTimeout(() => {
                WordCloud(canvas, options);
                state.canDownload = true;
                state.lastGeneratedWords = words;  // 缓存用于SVG导出

                // 添加 has-result class 到 content zone
                elements.contentZone.classList.add('has-result');

                // 显示预览面板
                elements.previewPanel.classList.remove('hidden');

                // 自动展开配置面板（方便用户微调）
                elements.configPanel.classList.remove('collapsed');

                // 滚动到预览区
                elements.previewPanel.scrollIntoView({ behavior: 'auto', block: 'start' });

                // 隐藏加载指示器
                elements.canvasSpinner.classList.remove('active');

                const msg = isRegenerate ? '已更新' : `生成成功，共 ${words.length} 个词`;
                showStatus(msg, 'success');

                // 保存当前配置到 localStorage
                saveConfig();
            }, 100);
        } catch (err) {
            console.error('WordCloud error:', err);
            showStatus('生成失败: ' + err.message, 'error');
            elements.canvasSpinner.classList.remove('active');
        }
    }

    function getShapeOption(shape) {
        // 检查是否是扩展形状
        if (shapeConfig[shape]) {
            return shapeConfig[shape];
        }
        switch (shape) {
            case 'custom':
                return undefined; // 使用 maskImage
            default:
                return 'circle';
        }
    }

    // =====================
    // 下载图片
    // =====================

    function downloadImage() {
        if (!state.canDownload) return;

        const canvas = elements.canvas;

        try {
            canvas.toBlob(function(blob) {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'wordcloud-' + Date.now() + '.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showStatus('PNG 已下载', 'success');
                } else {
                    showStatus('下载失败', 'error');
                }
            }, 'image/png');
        } catch (err) {
            console.error('Download error:', err);
            showStatus('下载失败: ' + err.message, 'error');
        }
    }

    /**
     * 下载 SVG 矢量图
     */
    function downloadSVG() {
        if (!state.canDownload || !state.lastGeneratedWords) {
            showStatus('请先生成词云', 'error');
            return;
        }

        try {
            const words = state.lastGeneratedWords;
            const width = state.width;
            const height = state.height;
            const colors = colorSchemes[state.colorScheme] || colorSchemes.green;

            // 计算权重范围
            const weights = words.map(w => w[1]);
            const minWeight = Math.min(...weights);
            const maxWeight = Math.max(...weights);

            // 生成随机位置（简化版，实际应该用 wordcloud 算法）
            // 这里用模拟布局，后续可以改进为真实算法
            const placedWords = placeWordsForSVG(words, width, height, minWeight, maxWeight);

            let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${bgColors[state.bgColor] || bgColors.dark}"/>`;

            placedWords.forEach(item => {
                const fontSize = item.fontSize;
                const color = colors[Math.floor(Math.random() * colors.length)];
                const rotation = state.enableRotation && Math.random() > 0.5
                    ? ` transform="rotate(${Math.random() * 60 - 30} ${item.x} ${item.y})"`
                    : '';
                const escapedText = escapeXml(item.word);

                svgContent += `
  <text x="${item.x}" y="${item.y}"
        font-family="SF Mono, Fira Code, Consolas, Monaco, monospace"
        font-size="${fontSize}"
        fill="${color}"
        text-anchor="middle"
        dominant-baseline="middle"${rotation}>
    ${escapedText}
  </text>`;
            });

            svgContent += '\n</svg>';

            const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'wordcloud-' + Date.now() + '.svg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showStatus('SVG 已下载（矢量图）', 'success');
        } catch (err) {
            console.error('SVG Download error:', err);
            showStatus('SVG 下载失败: ' + err.message, 'error');
        }
    }

    /**
     * 为SVG放置词汇（简化版布局）
     */
    function placeWordsForSVG(words, width, height, minWeight, maxWeight) {
        const placed = [];
        const padding = 50;
        const gridSize = 20;

        for (const [word, weight] of words) {
            const fontSize = maxWeight === minWeight
                ? (state.fontSizeMin + state.fontSizeMax) / 2
                : state.fontSizeMin + (weight - minWeight) / (maxWeight - minWeight) * (state.fontSizeMax - state.fontSizeMin);

            // 随机位置（实际应该用碰撞检测）
            let x, y, attempts = 0;
            const maxAttempts = 50;

            do {
                x = padding + Math.random() * (width - padding * 2);
                y = padding + fontSize + Math.random() * (height - padding * 2 - fontSize);
                attempts++;
            } while (attempts < maxAttempts && isOverlapping(x, y, fontSize, placed));

            placed.push({ word, x, y, fontSize });
        }

        return placed;
    }

    /**
     * 检查是否与已有词汇重叠（简化检测）
     */
    function isOverlapping(x, y, fontSize, placed) {
        const minDist = fontSize * 0.8;
        for (const p of placed) {
            const dist = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2);
            if (dist < minDist) return true;
        }
        return false;
    }

    /**
     * XML转义
     */
    function escapeXml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    // =====================
    // 配置持久化
    // =====================

    function saveConfig() {
        const config = {
            colorScheme: state.colorScheme,
            bgColor: state.bgColor,
            width: state.width,
            height: state.height,
            fontSizeMin: state.fontSizeMin,
            fontSizeMax: state.fontSizeMax,
            enableRotation: state.enableRotation,
            currentShape: state.currentShape
        };
        localStorage.setItem('wordcloud-config', JSON.stringify(config));
    }

    function loadConfig() {
        try {
            const saved = localStorage.getItem('wordcloud-config');
            if (saved) {
                const config = JSON.parse(saved);
                if (config.colorScheme) state.colorScheme = config.colorScheme;
                if (config.bgColor) state.bgColor = config.bgColor;
                if (config.width) state.width = config.width;
                if (config.height) state.height = config.height;
                if (config.fontSizeMin) state.fontSizeMin = config.fontSizeMin;
                if (config.fontSizeMax) state.fontSizeMax = config.fontSizeMax;
                if (config.enableRotation !== undefined) state.enableRotation = config.enableRotation;
                if (config.currentShape) state.currentShape = config.currentShape;
            }
        } catch (e) {
            console.warn('加载配置失败:', e);
        }
    }

    function applyConfigToUI() {
        // 应用配色方案
        elements.colorScheme.value = state.colorScheme;

        // 应用尺寸
        elements.canvasWidth.value = state.width;
        elements.canvasHeight.value = state.height;

        // 应用字体大小
        elements.fontSizeMin.value = state.fontSizeMin;
        elements.fontSizeMax.value = state.fontSizeMax;

        // 应用旋转
        elements.enableRotation.checked = state.enableRotation;

        // 应用背景色
        elements.bgColorBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.bg === state.bgColor);
        });

        // 应用形状
        elements.shapeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.shape === state.currentShape);
        });
    }

    // =====================
    // 状态提示
    // =====================

    function showStatus(message, type) {
        const messageEl = elements.message;
        messageEl.textContent = message;
        messageEl.className = 'message message-visible message-' + (type || '');

        // 自动隐藏（成功消息 3 秒后消失）
        if (type === 'success') {
            setTimeout(() => {
                messageEl.className = 'message';
            }, 3000);
        }
    }

    // =====================
    // 启动
    // =====================

    document.addEventListener('DOMContentLoaded', init);

})();
