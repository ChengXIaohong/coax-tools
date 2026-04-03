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

    // emoji 装饰词库
    const emojiMap = {
        '爱': '❤️', '喜欢': '😍', '开心': '😄', '高兴': '🥳',
        '笑': '😄', '哭': '😭', '生气': '😤', '饿': '🤤',
        '困': '😴', '累': '😫', '怕': '😨', '笑': '😂',
        '钱': '💰', '富': '🤑', '穷': '😢', '好': '👍',
        '坏': '👎', '大': '🦏', '小': '🐜', '新': '🆕',
        '旧': '📅', '快': '⚡', '慢': '🐢', '高': '🗼',
        '低': '📏', '热': '🔥', '冷': '❄️', '好': '✨',
        '帅': '😎', '美': '💄', '酷': '🤙', '棒': '👏',
        '牛': '🐂', '强': '💪', '弱': '😿', '猪': '🐷',
        '狗': '🐶', '猫': '🐱', '鸟': '🐦', '鱼': '🐟',
        '吃': '🍽️', '喝': '🥤', '玩': '🎮', '乐': '🎉',
        '睡': '😴', '工作': '💼', '学习': '📚', '运动': '🏃',
        '音乐': '🎵', '电影': '🎬', '书': '📖', '花': '🌸',
        '星': '⭐', '月': '🌙', '太阳': '☀️', '雨': '🌧️',
        '雪': '❄️', '云': '☁️', '风': '🌬️', '山': '⛰️',
        '海': '🌊', '火': '🔥', '水': '💧', '土': '🌍',
        '金': '🥇', '木': '🌳', '风': '💨', '空': '💫',
        '时间': '⏰', '早上': '🌅', '中午': '☀️', '晚上': '🌙',
        '今天': '📅', '明天': '➡️', '新年': '🎆', '圣诞': '🎄',
        '生日': '🎂', '恭喜': '🎊', '加油': '💪', '感谢': '🙏',
        '抱歉': '🙇', '再见': '👋', '你好': '👋', '知道': '🧐',
        '不知道': '🤷', '什么': '🤔', '为什么': '❓', '如何': '🔧',
        '可以': '✅', '不行': '❌', '真': '😮', '假': '🎭',
        '真棒': '🤩', '完': '✅', '开始': '🚀', '结束': '🏁',
        '成功': '🎉', '失败': '😔', '希望': '🌈', '梦想': '💭',
        '努力': '💪', '休息': '☕', '音乐': '🎵', '唱歌': '🎤',
        '跳舞': '💃', '旅行': '✈️', '拍照': '📸', '游戏': '🎮',
        '胜利': '🏆', '第一': '🥇', '世界': '🌍', '中国': '🇨🇳',
        '美国': '🇺🇸', '日本': '🇯🇵', '韩国': '🇰🇷', '可爱': '🥰',
        '漂亮': '💖', '帅': '😎', '酷': '🤙', '棒': '👏',
        '厉害': '🔥', '犀利': '👀', '聪明': '🧠', '笨': '🤦',
        '勇敢': '🦁', '开心': '😊', '快乐': '😁', '幸福': '💕',
        '温暖': '🌞', '凉爽': '🍃', '舒服': '😌', '难受': '😣',
        '无聊': '😑', '兴奋': '🤪', '紧张': '😬', '放松': '😎',
        '生病': '🤒', '健康': '💪', '喝酒': '🍺', '喝茶': '🍵',
        '咖啡': '☕', '奶茶': '🥤', '水果': '🍎', '苹果': '🍎',
        '香蕉': '🍌', '西瓜': '🍉', '葡萄': '🍇', '咖啡': '☕',
        '蛋糕': '🎂', '糖果': '🍬', '巧克力': '🍫', '面包': '🍞',
        '米饭': '🍚', '面条': '🍜', '饺子': '🥟', '包子': '🥟',
        '比萨': '🍕', '汉堡': '🍔', '薯条': '🍟', '炸鸡': '🍗',
        '电视': '📺', '手机': '📱', '电脑': '💻', '网络': '🌐',
        'WiFi': '📶', '密码': '🔐', '钥匙': '🔑', '锁': '🔒',
        '礼物': '🎁', '红包': '🧧', '花': '💐', '巧克力': '🍫',
        '钻石': '💎', '戒指': '💍', '心': '❤️', '吻': '💋',
        '拥抱': '🤗', '握手': '🤝', '点赞': '👍', '鼓掌': '👏',
        '胜利': '✌️', 'OK': '👌', '拳头': '✊', '手指': '☝️',
        '眼睛': '👀', '耳朵': '👂', '鼻子': '👃', '嘴巴': '👄',
        '手': '🖐️', '脚': '🦶', '头': '🧑', '头发': '💇',
        '眼镜': '👓', '帽子': '🎩', '衣服': '👕', '裤子': '👖',
        '鞋子': '👟', '包': '👜', '家': '🏠', '房子': '🏠',
        '学校': '🏫', '公司': '🏢', '医院': '🏥', '饭店': '🍴',
        '酒店': '🏨', '机场': '✈️', '车站': '🚉', '地铁': '🚇',
        '火车': '🚂', '汽车': '🚗', '飞机': '✈️', '船': '🚢',
        '自行车': '🚲', '摩托车': '🏍️', '公交车': '🚌', '出租车': '🚕',
    };

    // 检测是否包含中文
    function hasChinese(text) {
        return /[\u4e00-\u9fa5]/.test(text);
    }

    // 为中文文本添加 emoji 装饰
    function decorateChinese(text) {
        let result = text;
        // 按最长匹配优先替换
        const keys = Object.keys(emojiMap).sort((a, b) => b.length - a.length);
        for (const key of keys) {
            // 只在词语周围加空格或标点时替换
            const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            result = result.replace(regex, key + emojiMap[key]);
        }
        return result;
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

    // 生成中文装饰展示
    function generateChineseArt(text, showBorder, callback) {
        const decorated = decorateChinese(text);
        const lines = decorated.split('\n');

        let output = '';
        if (showBorder) {
            const maxLen = Math.max(...lines.map(l => l.length));
            const borderLine = '╔' + '═'.repeat(maxLen + 2) + '╗';
            output += borderLine + '\n';
            lines.forEach(line => {
                output += '║ ' + line.padEnd(maxLen) + ' ║\n';
            });
            output += '╚' + '═'.repeat(maxLen + 2) + '╝';
        } else {
            output = decorated;
        }

        callback(output);
    }

    // 更新预览
    function updatePreview() {
        const text = inputEl.value;
        const font = fontSelectEl.value;
        const width = parseInt(widthInputEl.value, 10) || 80;
        const showBorder = borderToggleEl.checked;

        if (!text.trim()) {
            outputEl.textContent = '';
            return;
        }

        if (hasChinese(text)) {
            // 中文模式：emoji 装饰展示
            previewEl.classList.remove('loading');
            generateChineseArt(text, showBorder, function(data) {
                outputEl.textContent = data;
            });
        } else {
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
        debouncedUpdate();
    });
    fontSelectEl.addEventListener('change', updatePreview);
    widthInputEl.addEventListener('input', debouncedUpdate);
    borderToggleEl.addEventListener('change', updatePreview);
    copyBtn.addEventListener('click', copyToClipboard);
    downloadBtn.addEventListener('click', downloadAsImage);

    // 初始化
    waitForFiglet(function() {
        updatePreview();
    });

})();
