/*
 * 字符画生成器
 * 英文：figlet ASCII Art
 * 中文：emoji 装饰艺术展示
 */

(function() {
    'use strict';

    const inputEl = document.getElementById('asciiInput');
    const fontSelectEl = document.getElementById('fontSelect');
    const widthInputEl = document.getElementById('widthInput');
    const borderToggleEl = document.getElementById('borderToggle');
    const outputEl = document.getElementById('asciiOutput');
    const previewEl = document.getElementById('asciiPreview');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const copyStatusEl = document.getElementById('copyStatus');

    // figlet 字体加载状态
    let figletReady = false;

    // 获取当前字体（防御性）
    function getCurrentFont() {
        return fontSelectEl ? fontSelectEl.value : 'Standard';
    }

    // 检测是否包含中文
    function hasChinese(text) {
        return /[\u4e00-\u9fa5]/.test(text);
    }

    // 等待 figlet.js 加载完成
    function waitForFiglet(callback, attempts = 0) {
        if (typeof figlet !== 'undefined') {
            figletReady = true;
            callback();
        } else if (attempts < 50) {
            setTimeout(() => waitForFiglet(callback, attempts + 1), 100);
        } else {
            outputEl.textContent = '[ERR] figlet.js 加载失败，请刷新页面重试';
        }
    }

    // 生成 ASCII Art（英文）
    function generateAscii(text, font, width, callback) {
        if (!text.trim()) {
            callback('');
            return;
        }

        figlet.text(
            text,
            {
                font: font,
                width: width,
                whitespaceBreak: true
            },
            function(err, data) {
                if (err) {
                    callback('[ERR] ' + err.message);
                    return;
                }
                callback(data || '');
            }
        );
    }

    // 更新预览
    function updatePreview() {
        const text = inputEl.value;
        const font = getCurrentFont();
        const width = parseInt(widthInputEl.value, 10) || 80;
        const showBorder = borderToggleEl.getAttribute('aria-pressed') === 'true';

        if (!text.trim()) {
            outputEl.textContent = '';
            return;
        }

        // 英文模式：figlet ASCII Art
        if (!figletReady) {
            previewEl.classList.add('loading');
            return;
        }

        previewEl.classList.remove('loading');

        generateAscii(text, font, width, function(data) {
            if (showBorder && data) {
                const lines = data.split('\n');
                const maxLen = Math.max(...lines.map(l => l.length));
                const borderLine = '+' + '-'.repeat(maxLen + 2) + '+';
                const topBorder = borderLine;
                const bottomBorder = borderLine;

                const bordered = topBorder + '\n' +
                    lines.map(line => '| ' + line.padEnd(maxLen) + ' |').join('\n') +
                    '\n' + bottomBorder;
                outputEl.textContent = bordered;
            } else {
                outputEl.textContent = data;
            }
        });
    }

    // 复制纯文本
    function copyToClipboard() {
        const text = outputEl.textContent;
        if (!text) {
            showCopyStatus('预览区为空，无法复制', 'error');
            return;
        }

        navigator.clipboard.writeText(text).then(function() {
            showCopyStatus('[OK] 已复制到剪贴板', 'success');
        }).catch(function() {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showCopyStatus('[OK] 已复制到剪贴板', 'success');
            } catch (e) {
                showCopyStatus('[ERR] 复制失败，请手动选中复制', 'error');
            }
            document.body.removeChild(textarea);
        });
    }

    // 显示复制状态
    function showCopyStatus(message, type) {
        copyStatusEl.textContent = message;
        copyStatusEl.className = 'copy-status ' + (type || '');
        copyStatusEl.style.display = 'block';
        setTimeout(function() {
            copyStatusEl.style.display = 'none';
        }, 3000);
    }

    // 下载为图片
    function downloadAsImage() {
        const text = outputEl.textContent;
        if (!text) {
            showCopyStatus('预览区为空，无法下载', 'error');
            return;
        }

        const savedMode = localStorage.getItem('coax-tools-mode');
        const isChinese = hasChinese(inputEl.value);

        // 创建临时容器用于渲染图片
        const tempContainer = document.createElement('div');
        tempContainer.style.cssText = [
            'background: #0c0c0c',
            'padding: 30px',
            'font-family: "SF Mono", "Fira Code", "Consolas", "Monaco", "Courier New", monospace',
            'font-size: 12px',
            'line-height: 1.2',
            'color: #00e676',
            'white-space: pre',
            'display: inline-block',
            'min-width: 100px',
            'min-height: 50px'
        ].join(';');

        // 中文模式用更大字号
        if (isChinese) {
            tempContainer.style.fontSize = '24px';
        }

        // 检测是否为浅色模式
        if (savedMode === 'light') {
            tempContainer.style.background = '#f8f8f8';
            tempContainer.style.color = '#006400';
        }

        const pre = document.createElement('pre');
        pre.textContent = text;
        pre.style.margin = '0';
        tempContainer.appendChild(pre);

        document.body.appendChild(tempContainer);

        html2canvas(tempContainer, {
            backgroundColor: savedMode === 'light' ? '#f8f8f8' : '#0c0c0c',
            scale: 2,
            logging: false,
            useCORS: true
        }).then(function(canvas) {
            document.body.removeChild(tempContainer);

            const link = document.createElement('a');
            link.download = 'ascii-art.png';
            link.href = canvas.toDataURL('image/png');
            link.click();

            showCopyStatus('[OK] 图片已下载', 'success');
        }).catch(function(err) {
            document.body.removeChild(tempContainer);
            showCopyStatus('[ERR] 图片生成失败: ' + err.message, 'error');
        });
    }

    // 防抖
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    }

    const debouncedUpdate = debounce(updatePreview, 150);

    // 事件绑定
    inputEl.addEventListener('input', function() {
        // 只允许 figlet 支持的 ASCII 可打印字符（空格到 ~）
        // 包括：英文、数字、空格、常用符号 !@#$%^&*()_+-={}[]|:;"'<>,.?/~
        const filtered = inputEl.value.replace(/[^\x20-\x7E]/g, '');
        if (filtered !== inputEl.value) {
            inputEl.value = filtered;
        }
        // 更新字符计数
        var countEl = document.getElementById('charCurrent');
        if (countEl) {
            countEl.textContent = inputEl.value.length;
        }
        debouncedUpdate();
    });
    if (fontSelectEl) {
        fontSelectEl.addEventListener('change', updatePreview);
    }
    widthInputEl.addEventListener('input', debouncedUpdate);
    borderToggleEl.addEventListener('click', function() {
        var isPressed = borderToggleEl.getAttribute('aria-pressed') === 'true';
        borderToggleEl.setAttribute('aria-pressed', !isPressed);
        updatePreview();
    });
    copyBtn.addEventListener('click', copyToClipboard);
    downloadBtn.addEventListener('click', downloadAsImage);

    // 初始化
    waitForFiglet(function() {
        updatePreview();
    });

})();
