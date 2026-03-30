/*
 * Markdown 编辑器
 * 
 * MIT License
 * 
 * Copyright (c) 2025 coax
 */

(function() {
    // DOM 元素
    const mdInput = document.getElementById('mdInput');
    const mdPreview = document.getElementById('mdPreview');
    const clearBtn = document.getElementById('clearBtn');
    const copyHtmlBtn = document.getElementById('copyHtmlBtn');
    const messageEl = document.getElementById('message');
    const formatToggle = document.getElementById('formatToggle');
    const formatMenu = document.getElementById('formatMenu');
    const menuItems = document.querySelectorAll('.action-item');
    const editCount = document.getElementById('editCount');
    const previewCount = document.getElementById('previewCount');
    const fullscreenBtn = document.getElementById('fullscreenBtn');

    // 状态
    let isFullscreen = false;
    let isSyncingScroll = false;

    // 简单的 Markdown 解析器
    const MarkdownParser = {
        // 转义 HTML 特殊字符
        escapeHtml: function(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, m => map[m]);
        },

        // 解析 Markdown
        parse: function(text) {
            if (!text.trim()) return '';

            let html = this.escapeHtml(text);

            // 代码块（优先处理，避免其他规则干扰）
            html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
                return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
            });

            // 行内代码
            html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

            // 标题
            html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
            html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
            html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
            html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
            html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
            html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

            // 粗体、斜体、删除线
            html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
            html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
            html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

            // 引用
            html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

            // 链接
            html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

            // 图片
            html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

            // 水平线
            html = html.replace(/^---$/gm, '<hr>');
            html = html.replace(/^\*\*\*$/gm, '<hr>');

            // 无序列表
            html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>');
            html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

            // 有序列表
            html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

            // 表格
            html = this.parseTables(html);

            // 段落
            html = html.replace(/\n\n/g, '</p><p>');
            html = '<p>' + html + '</p>';

            // 清理空的段落
            html = html.replace(/<p><\/p>/g, '');
            html = html.replace(/<p>(<h[1-6]>)/g, '$1');
            html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
            html = html.replace(/<p>(<blockquote>)/g, '$1');
            html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
            html = html.replace(/<p>(<pre>)/g, '$1');
            html = html.replace(/(<\/pre>)<\/p>/g, '$1');
            html = html.replace(/<p>(<ul>)/g, '$1');
            html = html.replace(/(<\/ul>)<\/p>/g, '$1');
            html = html.replace(/<p>(<hr>)/g, '$1');
            html = html.replace(/(<hr>)<\/p>/g, '$1');
            html = html.replace(/<p>(<ol>)/g, '$1');
            html = html.replace(/(<\/ol>)<\/p>/g, '$1');

            // 换行
            html = html.replace(/\n/g, '<br>');
            html = html.replace(/<br><br>/g, '</p><p>');

            return html;
        },

        // 解析表格
        parseTables: function(text) {
            const tableRegex = /^\|(.+)\|\n\|[-:| ]+\|\n((?:\|.+\|\n?)+)/gm;
            return text.replace(tableRegex, (match, header, body) => {
                const headers = header.split('|').map(h => h.trim()).filter(h => h);
                const rows = body.trim().split('\n').map(row => 
                    row.split('|').map(cell => cell.trim()).filter((c, i) => c && i > 0 && i < headers.length + 1)
                );

                let table = '<table><thead><tr>';
                headers.forEach(h => {
                    table += `<th>${h}</th>`;
                });
                table += '</tr></thead><tbody>';
                rows.forEach(row => {
                    table += '<tr>';
                    row.forEach(cell => {
                        table += `<td>${cell}</td>`;
                    });
                    table += '</tr>';
                });
                table += '</tbody></table>';
                return table;
            });
        }
    };

    // 显示消息
    function showMessage(text, type) {
        messageEl.textContent = text;
        messageEl.className = 'message ' + type + '-message';
        messageEl.style.display = 'block';
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    }

    // 更新字数统计
    function updateWordCount() {
        const text = mdInput.value;
        const charCount = text.length;
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        editCount.textContent = `${charCount} 字`;
        
        // 预览区字数（去除 HTML 标签）
        const previewText = mdPreview.innerText || '';
        const previewChars = previewText.length;
        previewCount.textContent = `${previewChars} 字`;
    }

    // 更新预览
    function updatePreview() {
        const text = mdInput.value;
        mdPreview.innerHTML = MarkdownParser.parse(text);
        updateWordCount();
    }

    // 插入文本
    function insertText(before, after, placeholder) {
        const start = mdInput.selectionStart;
        const end = mdInput.selectionEnd;
        const text = mdInput.value;
        const selected = text.substring(start, end) || placeholder;

        mdInput.value = text.substring(0, start) + before + selected + after + text.substring(end);
        mdInput.focus();
        
        // 设置光标位置
        if (selected === placeholder && !text.substring(start, end)) {
            mdInput.setSelectionRange(start + before.length, start + before.length + placeholder.length);
        } else {
            mdInput.setSelectionRange(start + before.length, start + before.length + selected.length);
        }
        
        updatePreview();
    }

    // 处理工具栏按钮
    function handleToolbarAction(action) {
        switch (action) {
            case 'bold':
                insertText('**', '**', '粗体文字');
                break;
            case 'italic':
                insertText('*', '*', '斜体文字');
                break;
            case 'strikethrough':
                insertText('~~', '~~', '删除线文字');
                break;
            case 'heading':
                insertText('## ', '', '标题');
                break;
            case 'quote':
                insertText('> ', '', '引用文字');
                break;
            case 'code':
                // 检查是否在列表中，如果是则用行内代码
                const start = mdInput.selectionStart;
                const lineStart = mdInput.value.lastIndexOf('\n', start - 1) + 1;
                const line = mdInput.value.substring(lineStart, mdInput.value.indexOf('\n', start) === -1 ? mdInput.value.length : mdInput.value.indexOf('\n', start));
                if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\. /.test(line)) {
                    insertText('`', '`', '代码');
                } else {
                    insertText('```\n', '\n```', '代码块');
                }
                break;
            case 'link':
                insertText('[', '](url)', '链接文字');
                break;
            case 'image':
                insertText('![', '](image-url)', '图片描述');
                break;
            case 'list-ul':
                insertText('- ', '', '列表项');
                break;
            case 'list-ol':
                insertText('1. ', '', '列表项');
                break;
            case 'hr':
                insertText('\n\n---\n\n', '', '');
                break;
            case 'table':
                insertText('\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n', '', '');
                break;
        }
    }

    // 复制 HTML
    function copyHtml() {
        const html = mdPreview.innerHTML;
        if (!html) {
            showMessage('没有内容可以复制', 'error');
            return;
        }

        navigator.clipboard.writeText(html).then(() => {
            showMessage('HTML 已复制到剪贴板', 'success');
        }).catch(() => {
            showMessage('复制失败，请重试', 'error');
        });
    }

    // 清空内容
    function clearContent() {
        if (mdInput.value && !confirm('确定要清空所有内容吗？')) {
            return;
        }
        mdInput.value = '';
        mdPreview.innerHTML = '';
        updateWordCount();
        mdInput.focus();
    }

    // 全屏切换
    function toggleFullscreen() {
        const container = document.querySelector('.formatter-container');
        
        if (!isFullscreen) {
            // 进入全屏
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            } else if (container.msRequestFullscreen) {
                container.msRequestFullscreen();
            }
            fullscreenBtn.innerHTML = '<span class="material-icons">fullscreen_exit</span>';
            fullscreenBtn.title = '退出全屏';
            isFullscreen = true;
        } else {
            // 退出全屏
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            fullscreenBtn.innerHTML = '<span class="material-icons">fullscreen</span>';
            fullscreenBtn.title = '全屏模式';
            isFullscreen = false;
        }
    }

    // 监听全屏状态变化
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && isFullscreen) {
            fullscreenBtn.innerHTML = '<span class="material-icons">fullscreen</span>';
            fullscreenBtn.title = '全屏模式';
            isFullscreen = false;
        }
    });

    // 同步滚动
    function setupSyncScroll() {
        mdInput.addEventListener('scroll', () => {
            if (isSyncingScroll) return;
            isSyncingScroll = true;
            
            const scrollRatio = mdInput.scrollTop / (mdInput.scrollHeight - mdInput.clientHeight);
            mdPreview.scrollTop = scrollRatio * (mdPreview.scrollHeight - mdPreview.clientHeight);
            
            setTimeout(() => {
                isSyncingScroll = false;
            }, 50);
        });

        mdPreview.addEventListener('scroll', () => {
            if (isSyncingScroll) return;
            isSyncingScroll = true;
            
            const scrollRatio = mdPreview.scrollTop / (mdPreview.scrollHeight - mdPreview.clientHeight);
            mdInput.scrollTop = scrollRatio * (mdInput.scrollHeight - mdInput.clientHeight);
            
            setTimeout(() => {
                isSyncingScroll = false;
            }, 50);
        });
    }

    // Tab 键支持
    function setupTabSupport() {
        mdInput.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = mdInput.selectionStart;
                const end = mdInput.selectionEnd;
                mdInput.value = mdInput.value.substring(0, start) + '    ' + mdInput.value.substring(end);
                mdInput.setSelectionRange(start + 4, start + 4);
                updatePreview();
            }
        });
    }

    // 初始化
    function init() {
        // 输入事件
        mdInput.addEventListener('input', updatePreview);

        // 悬浮菜单切换
        formatToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            formatMenu.classList.toggle('show');
            formatToggle.classList.toggle('active');
        });

        // 点击菜单项
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                handleToolbarAction(action);
                formatMenu.classList.remove('show');
                formatToggle.classList.remove('active');
            });
        });

        // 点击其他区域关闭菜单
        document.addEventListener('click', (e) => {
            if (!formatMenu.contains(e.target) && e.target !== formatToggle && !formatToggle.contains(e.target)) {
                formatMenu.classList.remove('show');
                formatToggle.classList.remove('active');
            }
        });

        // 复制按钮
        copyHtmlBtn.addEventListener('click', copyHtml);

        // 清空按钮
        clearBtn.addEventListener('click', clearContent);

        // 全屏按钮
        fullscreenBtn.addEventListener('click', toggleFullscreen);

        // 键盘快捷键
        mdInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        handleToolbarAction('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        handleToolbarAction('italic');
                        break;
                    case 'k':
                        e.preventDefault();
                        handleToolbarAction('link');
                        break;
                }
            }
        });

        // 初始化同步滚动
        setupSyncScroll();

        // 初始化 Tab 支持
        setupTabSupport();

        // 初始化预览
        updatePreview();
    }

    // DOM 加载完成后初始化
    document.addEventListener('DOMContentLoaded', init);
})();
