// 常量
const DEFAULT_INDENT = 2;

// DOM 元素
let inputJson, outputJson, outputJsonData, actionToggle, actionMenu, graphToggle;
let yamlConvertBtn, toonConvertBtn, extractStructureBtn, compressJsonBtn;
let isGraphView = false;

// 图谱按钮状态管理
const GraphButtonManager = {
    consecutiveFailures: 0,
    isLoading: false,
    lastError: null,
    errorLogs: [],
    lastGraphState: null,
    failureThreshold: 3,
    loadingTimeout: null,

    reset() {
        this.consecutiveFailures = 0;
        this.isLoading = false;
        this.lastError = null;
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }
    },

    recordFailure(error) {
        this.consecutiveFailures++;
        this.lastError = error;
        this.logError(error);

        if (this.consecutiveFailures >= this.failureThreshold) {
            this.triggerCircuitBreaker();
        }
    },

    recordSuccess() {
        this.consecutiveFailures = 0;
        this.lastError = null;
    },

    logError(error) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack,
            graphState: this.lastGraphState
        };
        this.errorLogs.push(logEntry);
        console.error('[Graph Error]', logEntry);
    },

    triggerCircuitBreaker() {
        console.warn('[Graph Circuit Breaker] Triggered - clearing cache and resetting state');
        this.clearCache();
        this.showRestartPrompt();
    },

    clearCache() {
        try {
            graphCache.cache.clear();
            graphCache.order = [];
            if (typeof JsonGraph !== 'undefined' && JsonGraph.clearCache) {
                JsonGraph.clearCache();
            }
        } catch (e) {
            console.error('[Graph Circuit Breaker] Cache clear failed:', e);
        }
    },

    showRestartPrompt() {
        const confirmed = confirm('图谱连续无响应，已自动清理缓存。是否重启图谱服务？');
        if (confirmed) {
            this.reset();
            if (typeof JsonGraph !== 'undefined' && JsonGraph.reset) {
                JsonGraph.reset();
            }
        }
    },

    exportErrorLogs() {
        const logs = this.errorLogs.map(log => 
            `[${log.timestamp}]\n${log.message}\n${log.stack || 'No stack trace'}\n`
        ).join('\n---\n\n');

        const blob = new Blob([logs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `graph-error-logs-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    },

    setLoading(loading) {
        this.isLoading = loading;
        const icon = graphToggle.querySelector('.graph-icon') || graphToggle;
        if (loading) {
            icon.textContent = '⏳';
            graphToggle.classList.add('loading');
        } else {
            icon.textContent = '🔗';
            graphToggle.classList.remove('loading');
        }
    },

    validateJsonData() {
        const jsonString = outputJsonData.value.trim();
        
        if (!jsonString) {
            return { valid: false, error: 'EMPTY', message: 'JSON数据为空，请先输入数据', action: 'jumpToInput' };
        }

        try {
            const parsed = JSON.parse(jsonString);
            
            if (typeof parsed !== 'object' || parsed === null) {
                return { valid: false, error: 'INVALID_STRUCTURE', message: 'JSON结构无效，必须为对象或数组', action: null };
            }

            const keys = Object.keys(parsed);
            if (keys.length === 0 && Array.isArray(parsed)) {
                return { valid: false, error: 'EMPTY_ARRAY', message: 'JSON数据为空数组，请添加有效数据', action: 'jumpToInput' };
            }

            return { valid: true, data: parsed };
        } catch (e) {
            let errorType = 'SYNTAX_ERROR';
            let errorMessage = 'JSON语法错误';

            if (e instanceof SyntaxError) {
                const match = e.message.match(/position (\d+)/);
                if (match) {
                    errorMessage = `JSON语法错误，位置: ${match[1]}`;
                }
            }

            return { valid: false, error: errorType, message: errorMessage, action: 'jumpToInput', parseError: e };
        }
    },

    saveGraphState(state) {
        this.lastGraphState = state;
    }
};

// 示例JSON数据
const SAMPLE_JSON_DATA = {
    "name": "示例数据",
    "version": "1.0.0",
    "description": "这是一个示例JSON数据结构",
    "features": ["格式化", "验证", "图谱可视化"],
    "config": {
        "theme": "dark",
        "language": "zh-CN",
        "autoFormat": true
    },
    "stats": {
        "users": 1234,
        "active": true,
        "rating": 4.8
    }
};

// 复制策略 - 重新设计的JSON数据复制功能
const CopyStrategy = {
    DATA_TYPES: {
        OBJECT: 'object',
        ARRAY: 'array',
        SIMPLE: 'simple',
        EMPTY: 'empty',
        UNKNOWN: 'unknown'
    },

    detectDataType(lineText) {
        const trimmed = lineText.trim();
        
        if (trimmed === '{}' || trimmed === '[]' || trimmed === '{},' || trimmed === '[],') {
            return this.DATA_TYPES.EMPTY;
        }
        
        if (trimmed === '{' || trimmed === '[') {
            return trimmed === '{' ? this.DATA_TYPES.OBJECT : this.DATA_TYPES.ARRAY;
        }
        
        if (trimmed === '}' || trimmed === ']') {
            return this.DATA_TYPES.UNKNOWN;
        }
        
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex === -1) return this.DATA_TYPES.UNKNOWN;
        
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();
        
        if (key.startsWith('"') && key.endsWith('"')) {
            if (value === '[' || value.startsWith('[') || value === '[]') {
                return this.DATA_TYPES.ARRAY;
            }
            if (value === '{' || value.startsWith('{') || value === '{}') {
                return this.DATA_TYPES.OBJECT;
            }
            return this.DATA_TYPES.SIMPLE;
        }
        
        return this.DATA_TYPES.UNKNOWN;
    },

    findBlockRange(lineIndex) {
        const lines = outputJson.querySelectorAll('.json-line');
        const lineText = getLineTextOnly(lines[lineIndex]);
        const firstChar = lineText.trim()[0];
        
        if (firstChar !== '{' && firstChar !== '[') {
            return null;
        }
        
        const closing = firstChar === '{' ? '}' : ']';
        let depth = 0;
        let startIdx = -1;
        let endIdx = -1;
        
        for (let i = lineIndex; i < lines.length; i++) {
            const text = getLineTextOnly(lines[i]);
            for (const char of text) {
                if (char === firstChar) depth++;
                else if (char === closing) depth--;
            }
            if (depth === 0) {
                endIdx = i;
                break;
            }
        }
        
        if (endIdx === -1) return null;
        return { start: lineIndex, end: endIdx };
    },

    findBlockRangeByBracket(lineIndex, bracketPos) {
        const lines = outputJson.querySelectorAll('.json-line');
        const lineText = getLineTextOnly(lines[lineIndex]);
        const firstChar = lineText[bracketPos];
        const closing = firstChar === '{' ? '}' : ']';
        
        let depth = 0;
        let endIdx = -1;
        
        for (let i = lineIndex; i < lines.length; i++) {
            const text = getLineTextOnly(lines[i]);
            const startPos = (i === lineIndex) ? bracketPos : 0;
            
            for (let charPos = startPos; charPos < text.length; charPos++) {
                const char = text[charPos];
                if (char === firstChar) depth++;
                else if (char === closing) depth--;
                if (depth === 0) {
                    endIdx = i;
                    break;
                }
            }
            if (depth === 0) {
                break;
            }
        }
        
        if (endIdx === -1) return null;
        return { start: lineIndex, end: endIdx };
    },

    getLinesContent(startIdx, endIdx) {
        const lines = outputJson.querySelectorAll('.json-line');
        const content = [];
        for (let i = startIdx; i <= endIdx; i++) {
            if (lines[i]) {
                content.push(getLineTextOnly(lines[i]));
            }
        }
        return content.join('\n');
    },

    extractObjectContent(lineIndex) {
        const lines = outputJson.querySelectorAll('.json-line');
        const lineText = getLineTextOnly(lines[lineIndex]);
        const trimmed = lineText.trim();
        console.log('DEBUG extractObjectContent:', { lineIndex, lineText, trimmed });
        
        if (trimmed === '{}' || trimmed === '{},') {
            return '{}';
        }
        
        if (trimmed === '{') {
            const range = this.findBlockRange(lineIndex);
            console.log('DEBUG findBlockRange:', range);
            if (!range) return null;
            const content = this.getLinesContent(range.start, range.end);
            console.log('DEBUG blockContent:', content);
            const jsonStr = '{' + content.split('{').slice(1).join('{');
            try {
                const parsed = JSON.parse(jsonStr);
                return JSON.stringify(parsed);
            } catch (e) {
                console.log('DEBUG JSON.parse error:', e);
                return null;
            }
        }
        
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex === -1) return null;
        
        const key = trimmed.substring(0, colonIndex).trim().replace(/^"|"$/g, '');
        
        const bracketPos = trimmed.indexOf('{');
        if (bracketPos !== -1) {
            const range = this.findBlockRangeByBracket(lineIndex, bracketPos);
            console.log('DEBUG object-kv range:', range);
            if (!range) return null;
            
            const blockContent = this.getLinesContent(range.start, range.end);
            let afterColon = blockContent.substring(blockContent.indexOf(':') + 1).trim();
            if (afterColon.endsWith(',')) {
                afterColon = afterColon.slice(0, -1).trim();
            }
            console.log('DEBUG afterColon:', afterColon);
            
            try {
                const value = JSON.parse(afterColon);
                return JSON.stringify({ [key]: value });
            } catch (e) {
                console.log('DEBUG JSON.parse error:', e);
                return null;
            }
        }
        
        const range = this.findBlockRange(lineIndex);
        console.log('DEBUG object-kv range:', range);
        if (!range) return null;
        
        const blockContent = this.getLinesContent(range.start, range.end);
        let afterColon = blockContent.substring(blockContent.indexOf(':') + 1).trim();
        if (afterColon.endsWith(',')) {
            afterColon = afterColon.slice(0, -1).trim();
        }
        console.log('DEBUG afterColon:', afterColon);
        
        try {
            const value = JSON.parse(afterColon);
            return JSON.stringify({ [key]: value });
        } catch (e) {
            console.log('DEBUG JSON.parse error:', e);
            return null;
        }
    },

    extractArrayContent(lineIndex) {
        const lines = outputJson.querySelectorAll('.json-line');
        const lineText = getLineTextOnly(lines[lineIndex]);
        const trimmed = lineText.trim();
        
        if (trimmed === '[]' || trimmed === '[],') {
            return '[]';
        }
        
        if (trimmed === '[') {
            const range = this.findBlockRange(lineIndex);
            console.log('DEBUG array findBlockRange:', range);
            if (!range) return null;
            const content = this.getLinesContent(range.start, range.end);
            console.log('DEBUG array content:', content);
            const jsonStr = '[' + content.split('[').slice(1).join('[');
            try {
                const parsed = JSON.parse(jsonStr);
                return JSON.stringify(parsed);
            } catch (e) {
                console.log('DEBUG array JSON.parse error:', e);
                return null;
            }
        }
        
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex === -1) return null;
        
        const key = trimmed.substring(0, colonIndex).trim().replace(/^"|"$/g, '');
        
        const bracketPos = trimmed.indexOf('[');
        if (bracketPos !== -1) {
            const range = this.findBlockRangeByBracket(lineIndex, bracketPos);
            console.log('DEBUG array-kv range:', range);
            if (!range) return null;
            
            const blockContent = this.getLinesContent(range.start, range.end);
            let afterColon = blockContent.substring(blockContent.indexOf(':') + 1).trim();
            if (afterColon.endsWith(',')) {
                afterColon = afterColon.slice(0, -1).trim();
            }
            console.log('DEBUG array afterColon:', afterColon);
            
            try {
                const value = JSON.parse(afterColon);
                return JSON.stringify({ [key]: value });
            } catch (e) {
                console.log('DEBUG array JSON.parse error:', e);
                return null;
            }
        }
        
        const range = this.findBlockRange(lineIndex);
        console.log('DEBUG array-kv range:', range);
        if (!range) return null;
        
        const blockContent = this.getLinesContent(range.start, range.end);
        let afterColon = blockContent.substring(blockContent.indexOf(':') + 1).trim();
        if (afterColon.endsWith(',')) {
            afterColon = afterColon.slice(0, -1).trim();
        }
        console.log('DEBUG array afterColon:', afterColon);
        
        try {
            const value = JSON.parse(afterColon);
            return JSON.stringify({ [key]: value });
        } catch (e) {
            console.log('DEBUG array JSON.parse error:', e);
            return null;
        }
    },

    extractSimpleValue(lineIndex) {
        const lines = outputJson.querySelectorAll('.json-line');
        const lineText = getLineTextOnly(lines[lineIndex]);
        const colonIndex = lineText.indexOf(':');
        if (colonIndex === -1) return null;

        const key = lineText.substring(0, colonIndex).trim().replace(/^"|"$/g, '');
        let value = lineText.substring(colonIndex + 1).trim().replace(/,$/, '');

        let parsedValue;
        try {
            parsedValue = JSON.parse(value);
        } catch (e) {
            if (/^["']/.test(value)) {
                parsedValue = value.slice(1, -1);
            } else if (value === 'true' || value === 'false') {
                parsedValue = value === 'true';
            } else if (/^\d/.test(value)) {
                parsedValue = Number(value);
            } else {
                parsedValue = value;
            }
        }

        return JSON.stringify({ [key]: parsedValue });
    },

    extractByDataType(lineIndex, dataType) {
        switch (dataType) {
            case this.DATA_TYPES.OBJECT:
                return this.extractObjectContent(lineIndex);
            case this.DATA_TYPES.ARRAY:
                return this.extractArrayContent(lineIndex);
            case this.DATA_TYPES.SIMPLE:
                return this.extractSimpleValue(lineIndex);
            case this.DATA_TYPES.EMPTY:
                const lineText = getLineTextOnly(outputJson.querySelectorAll('.json-line')[lineIndex]);
                return lineText.trim() === '[' || lineText.trim().startsWith('[') ? '[]' : '{}';
            default:
                return null;
        }
    },

    async copy(lineIndex) {
        const lines = outputJson.querySelectorAll('.json-line');
        const lineEl = lines[lineIndex];
        
        if (!lineEl) {
            console.warn('行不存在:', lineIndex);
            showMessage('复制失败: 行不存在', 'error');
            return false;
        }
        
        const lineText = getLineTextOnly(lineEl);
        
        if (!lineText || lineText.trim() === '') {
            console.warn('空行无法复制');
            showMessage('复制失败: 空行无法复制', 'error');
            return false;
        }
        
        const dataType = this.detectDataType(lineText);
        console.log('DEBUG copy:', { lineIndex, lineText, dataType, DATA_TYPES: this.DATA_TYPES });
        
        if (dataType === this.DATA_TYPES.UNKNOWN) {
            showMessage('复制失败: 无法识别的数据类型', 'error');
            return false;
        }
        
        const content = this.extractByDataType(lineIndex, dataType);
        console.log('DEBUG extractByDataType result:', content);
        
        if (!content) {
            console.warn('内容提取失败');
            showMessage('复制失败: 内容提取失败', 'error');
            return false;
        }
        
        try {
            const parsed = JSON.parse(content);
            const jsonString = JSON.stringify(parsed);
            await navigator.clipboard.writeText(jsonString);
            showMessage('已复制到剪贴板', 'success');
            return true;
        } catch (error) {
            console.error('复制失败:', error);
            showMessage('复制失败: ' + error.message, 'error');
            return false;
        }
    },

    copyWithContext(lineIndex, event) {
        if (event && event.button === 2) {
            event.preventDefault();
        }
        this.copy(lineIndex);
    }
};

// 上下文菜单管理器
const ContextMenuManager = {
    menu: null,
    currentLineIndex: null,

    init() {
        this.menu = document.createElement('div');
        this.menu.id = 'json-context-menu';
        this.menu.className = 'context-menu';
        this.menu.innerHTML = `
            <div class="context-menu-item" data-action="copy">
                <span class="context-menu-icon">📋</span>
                <span>复制</span>
            </div>
            <div class="context-menu-item" data-action="copy-value">
                <span class="context-menu-icon">📄</span>
                <span>复制值</span>
            </div>
            <div class="context-menu-item" data-action="download">
                <span class="context-menu-icon">💾</span>
                <span>下载</span>
            </div>
        `;
        document.body.appendChild(this.menu);
        
        this.menu.addEventListener('click', (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            if (action && this.currentLineIndex !== null) {
                this.handleAction(action, this.currentLineIndex);
            }
            this.hide();
        });
        
        document.addEventListener('click', (e) => {
            if (!this.menu.contains(e.target)) {
                this.hide();
            }
        });
        
        document.addEventListener('contextmenu', (e) => {
            const lineEl = e.target.closest('.json-line');
            if (lineEl) {
                e.preventDefault();
                this.currentLineIndex = parseInt(lineEl.dataset.line);
            }
        });
    },

    show(x, y) {
        if (!this.menu) this.init();
        this.menu.style.display = 'block';
        const rect = this.menu.getBoundingClientRect();
        const viewWidth = window.innerWidth;
        const viewHeight = window.innerHeight;
        
        let posX = x;
        let posY = y;
        
        if (x + rect.width > viewWidth) {
            posX = viewWidth - rect.width - 10;
        }
        if (y + rect.height > viewHeight) {
            posY = viewHeight - rect.height - 10;
        }
        
        this.menu.style.left = posX + 'px';
        this.menu.style.top = posY + 'px';
    },

    hide() {
        if (this.menu) {
            this.menu.style.display = 'none';
        }
    },

    handleAction(action, lineIndex) {
        const lineEl = outputJson.querySelector(`.json-line[data-line="${lineIndex}"]`);
        if (!lineEl) return;
        
        const blockStart = lineEl.dataset.blockStart;
        const blockEnd = lineEl.dataset.blockEnd;
        
        switch (action) {
            case 'copy':
                CopyStrategy.copy(lineIndex);
                break;
            case 'copy-value':
                this.copyValueOnly(lineIndex);
                break;
            case 'download':
                let content;
                if (blockStart !== undefined && blockEnd !== undefined) {
                    content = CopyStrategy.getLinesContent(parseInt(blockStart), parseInt(blockEnd));
                } else {
                    content = getLineTextOnly(lineEl);
                }
                downloadLineContent(content);
                break;
        }
    },

    copyValueOnly(lineIndex) {
        const lines = outputJson.querySelectorAll('.json-line');
        const lineEl = lines[lineIndex];
        if (!lineEl) return;
        
        const lineText = getLineTextOnly(lineEl);
        const colonIndex = lineText.indexOf(':');
        
        if (colonIndex === -1) {
            showMessage('复制失败: 非键值对行', 'error');
            return;
        }
        
        const value = lineText.substring(colonIndex + 1).trim().replace(/,$/, '');
        
        try {
            const parsed = JSON.parse(value);
            const jsonString = JSON.stringify(parsed);
            navigator.clipboard.writeText(jsonString);
            showMessage('已复制值到剪贴板', 'success');
        } catch (e) {
            navigator.clipboard.writeText(value);
            showMessage('已复制值到剪贴板', 'success');
        }
    }
};

function getLineTextOnly(lineEl) {
    if (!lineEl) return '';
    const lineActions = lineEl.querySelector('.line-actions');
    let textContent = lineEl.textContent;
    if (lineActions) {
        textContent = textContent.replace(lineActions.textContent, '');
    }
    return textContent.trim();
}

function getBlockContent(startLine, endLine) {
    const lines = outputJson.querySelectorAll('.json-line');
    const content = [];
    for (let i = startLine; i <= endLine; i++) {
        if (lines[i]) {
            content.push(getLineTextOnly(lines[i]));
        }
    }
    return content.join('\n');
}

document.addEventListener('DOMContentLoaded', function() {
    // 初始化 DOM 元素
    inputJson = document.getElementById('inputJson');
    outputJson = document.getElementById('outputJson');
    outputJsonData = document.getElementById('outputJsonData');
    actionToggle = document.getElementById('actionToggle');
    actionMenu = document.getElementById('actionMenu');
    graphToggle = document.getElementById('graphToggle');
    yamlConvertBtn = document.getElementById('yamlConvert');
    toonConvertBtn = document.getElementById('toonConvert');
    extractStructureBtn = document.getElementById('extractStructure');
    compressJsonBtn = document.getElementById('compressJson');
    // 自动格式化
    inputJson.addEventListener('input', autoFormat);
    inputJson.addEventListener('paste', () => setTimeout(autoFormat, 0));
    
    // 操作菜单
    actionToggle.addEventListener('click', toggleActionMenu);
    document.addEventListener('click', closeActionMenu);
    
    // 图谱视图切换
    graphToggle.addEventListener('click', toggleGraphView);
    
    // Ctrl+G 快捷键打开图谱
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
            e.preventDefault();
            if (document.activeElement === inputJson || document.activeElement === outputJsonData) {
                toggleGraphView();
            }
        }
    });
    
    // 操作按钮
    yamlConvertBtn.addEventListener('click', () => convertFromOutput('yaml'));
    toonConvertBtn.addEventListener('click', () => convertFromOutput('toon'));
    extractStructureBtn.addEventListener('click', () => convertFromOutput('structure'));
    compressJsonBtn.addEventListener('click', compressJson);
    // 括号匹配高亮
    outputJson.addEventListener('click', highlightBracketMatch);
    outputJson.addEventListener('keyup', highlightBracketMatch);
    
    // 行点击处理
    outputJson.addEventListener('click', handleLineClick);
    outputJson.addEventListener('contextmenu', handleContextMenu);
    
    // 上下文菜单
    ContextMenuManager.init();
    
    // 点击空白处清除选中
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#outputJson')) {
            clearAllSelections();
        }
    });
    
    // 加载示例数据
    loadSampleData();
});

function showMessage(text, type) {
    const messageDiv = document.getElementById('message') || createMessageDiv();
    messageDiv.textContent = text;
    messageDiv.className = 'message ' + type + '-message';
    messageDiv.style.display = 'block';
    setTimeout(() => { messageDiv.style.display = 'none'; }, 3000);
}

function createMessageDiv() {
    const div = document.createElement('div');
    div.id = 'message';
    div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:10px 20px;background:var(--cli-bg);color:var(--cli-fg);border:1px solid var(--cli-border);z-index:1000;';
    document.body.appendChild(div);
    return div;
}

// 自动格式化
function autoFormat() {
    const jsonString = inputJson.value.trim();
    if (!jsonString) {
        outputJson.innerHTML = '';
        outputJsonData.value = '';
        return;
    }
    
    try {
        const parsedJson = JSON.parse(jsonString);
        const formatted = JSON.stringify(parsedJson, null, DEFAULT_INDENT);
        outputJson.innerHTML = highlightJson(formatted);
        outputJsonData.value = formatted;
    } catch (e) {
        // 无效JSON，不处理
    }
}

function toggleGraphView() {
    if (GraphButtonManager.isLoading) {
        showMessage('图谱正在加载中，请稍候...', 'warning');
        return;
    }

    GraphButtonManager.setLoading(true);

    const validation = GraphButtonManager.validateJsonData();

    if (!validation.valid) {
        GraphButtonManager.setLoading(false);
        showGraphValidationError(validation);
        return;
    }

    try {
        GraphButtonManager.saveGraphState({
            timestamp: Date.now(),
            dataSize: outputJsonData.value.length,
            dataHash: hashCode(outputJsonData.value)
        });

        if (JsonGraph.isOpen()) {
            JsonGraph.close();
            GraphButtonManager.reset();
            return;
        }

        const parsedJson = validation.data;
        JsonGraph.open(parsedJson);
        GraphButtonManager.recordSuccess();

        GraphButtonManager.loadingTimeout = setTimeout(() => {
            GraphButtonManager.setLoading(false);
        }, 1000);

    } catch (e) {
        GraphButtonManager.recordFailure(e);
        GraphButtonManager.setLoading(false);
        showMessage('图谱渲染失败: ' + e.message, 'error');
    }
}

function showGraphValidationError(validation) {
    const errorMessages = {
        'EMPTY': { text: 'JSON数据为空', hint: '请在左侧输入有效的JSON数据' },
        'INVALID_STRUCTURE': { text: 'JSON结构无效', hint: '数据必须是有效的对象或数组' },
        'SYNTAX_ERROR': { text: 'JSON语法错误', hint: '请检查JSON格式是否正确' },
        'EMPTY_ARRAY': { text: 'JSON为空数组', hint: '数组中没有任何元素' }
    };

    const error = errorMessages[validation.error] || { text: '未知错误', hint: '' };

    const modal = createErrorModal({
        title: '⚠️ 无法打开图谱',
        type: validation.error,
        message: error.text,
        hint: error.hint,
        parseError: validation.parseError,
        actions: [
            { label: '跳转到数据编辑区', action: 'jumpToInput', primary: true },
            { label: '导入示例数据', action: 'loadSample', secondary: true },
            { label: '复制错误日志', action: 'exportLogs', secondary: true }
        ]
    });

    document.body.appendChild(modal);

    modal.querySelectorAll('.error-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            modal.remove();

            switch (action) {
                case 'jumpToInput':
                    inputJson.focus();
                    inputJson.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    break;
                case 'loadSample':
                    loadSampleData();
                    setTimeout(() => toggleGraphView(), 100);
                    break;
                case 'exportLogs':
                    GraphButtonManager.exportErrorLogs();
                    break;
            }
        });
    });
}

function createErrorModal(options) {
    const modal = document.createElement('div');
    modal.className = 'graph-error-modal';
    modal.innerHTML = `
        <div class="error-modal-content">
            <div class="error-modal-header">
                <span class="error-icon">${options.title.includes('语法') ? '📝' : '⚠️'}</span>
                <span class="error-title">${options.title}</span>
            </div>
            <div class="error-modal-body">
                <div class="error-type">错误类型: ${options.type}</div>
                <div class="error-message">${options.message}</div>
                <div class="error-hint">${options.hint}</div>
                ${options.parseError ? `<div class="error-detail"><details><summary>查看详细错误</summary><pre>${options.parseError.message}</pre></details></div>` : ''}
            </div>
            <div class="error-modal-actions">
                ${options.actions.map(a => `<button class="error-action-btn ${a.primary ? 'primary' : ''} ${a.secondary ? 'secondary' : ''}" data-action="${a.action}">${a.label}</button>`).join('')}
            </div>
        </div>
    `;

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    return modal;
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < Math.min(str.length, 100); i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}

// JSON 语法高亮
function highlightJson(jsonString) {
    const lines = jsonString.split('\n');
    let result = '';
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        let lineHtml = '';
        let i = 0;
        
        while (i < line.length) {
            const char = line[i];
            
            if (char === '"') {
                let key = '"';
                i++;
                while (i < line.length) {
                    if (line[i] === '\\' && i + 1 < line.length) {
                        key += line[i] + line[i + 1];
                        i += 2;
                    } else if (line[i] === '"') {
                        key += '"';
                        i++;
                        break;
                    } else {
                        key += line[i];
                        i++;
                    }
                }
                
                let nextNonSpace = i;
                while (nextNonSpace < line.length && line[nextNonSpace] === ' ') {
                    nextNonSpace++;
                }
                
                if (line[nextNonSpace] === ':') {
                    lineHtml += `<span class="json-key">${escapeHtml(key)}</span>`;
                } else {
                    lineHtml += `<span class="json-string">${escapeHtml(key)}</span>`;
                }
            } else if (char === '{' || char === '[') {
                lineHtml += `<span class="json-bracket" data-bracket="${char}">${char}</span>`;
                i++;
            } else if (char === '}' || char === ']') {
                lineHtml += `<span class="json-bracket" data-bracket="${char}">${char}</span>`;
                i++;
            } else if (char === 't' && line.slice(i, i + 4) === 'true') {
                lineHtml += `<span class="json-boolean">true</span>`;
                i += 4;
            } else if (char === 'f' && line.slice(i, i + 5) === 'false') {
                lineHtml += `<span class="json-boolean">false</span>`;
                i += 5;
            } else if (char === 'n' && line.slice(i, i + 4) === 'null') {
                lineHtml += `<span class="json-null">null</span>`;
                i += 4;
            } else if (/\d/.test(char)) {
                let num = '';
                while (i < line.length && /[-\d.eE+]/.test(line[i])) {
                    num += line[i];
                    i++;
                }
                lineHtml += `<span class="json-number">${num}</span>`;
            } else {
                lineHtml += escapeHtml(char);
                i++;
            }
        }
        
        const trimmedLine = line.trim();
        const lineCopyType = CopyStrategy.detectDataType(trimmedLine);
        const isCopyable = lineCopyType !== CopyStrategy.DATA_TYPES.UNKNOWN && lineCopyType !== CopyStrategy.DATA_TYPES.EMPTY;
        
        const actionsHtml = isCopyable ? `
            <span class="line-actions">
                <span class="line-action-btn" data-action="copy">复制</span>
                <span class="line-action-btn" data-action="download">下载</span>
                <span class="line-action-btn" data-action="clear">清除</span>
            </span>
        ` : `
            <span class="line-actions">
                <span class="line-action-btn" data-action="clear">清除</span>
            </span>
        `;
        
        result += `<div class="json-line" data-line="${lineIndex}">${lineHtml}${actionsHtml}</div>`;
    }
    
    return result;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 行点击处理
function handleLineClick(e) {
    const target = e.target;
    
    if (target.classList.contains('line-action-btn')) {
        e.stopPropagation();
        const action = target.dataset.action;
        const lineEl = target.closest('.json-line');
        handleLineAction(action, lineEl);
        return;
    }
    
    const lineEl = target.closest('.json-line');
    if (!lineEl) return;
    
    if (e.button === 2) {
        e.preventDefault();
        return;
    }
    
    clearAllSelections();
    
    const lineIndex = parseInt(lineEl.dataset.line);
    const bracketInfo = findOpeningBracket(lineIndex);
    
    if (bracketInfo) {
        const { startLine, endLine } = bracketInfo;
        selectBlock(startLine, endLine);
        lineEl.dataset.blockStart = startLine;
        lineEl.dataset.blockEnd = endLine;
    } else {
        lineEl.classList.add('selected');
    }
}

// 右键菜单处理
function handleContextMenu(e) {
    const lineEl = e.target.closest('.json-line');
    if (!lineEl) return;
    
    e.preventDefault();
    const lineIndex = parseInt(lineEl.dataset.line);
    ContextMenuManager.currentLineIndex = lineIndex;
    ContextMenuManager.show(e.clientX, e.clientY);
}

// 查找行中的开括号及其对应的闭括号所在行
function findOpeningBracket(lineIndex) {
    const lines = outputJson.querySelectorAll('.json-line');
    const line = lines[lineIndex];
    if (!line) return null;
    
    const bracket = line.querySelector('.json-bracket');
    if (!bracket) return null;
    
    const bracketChar = bracket.textContent;
    if (bracketChar === '{' || bracketChar === '[') {
        const matchBracket = bracketChar === '{' ? '}' : ']';
        let depth = 1;
        
        for (let i = lineIndex + 1; i < lines.length; i++) {
            const lineBrackets = lines[i].querySelectorAll('.json-bracket');
            for (const b of lineBrackets) {
                if (b.textContent === bracketChar) depth++;
                else if (b.textContent === matchBracket) depth--;
            }
            if (depth === 0) {
                return { startLine: lineIndex, endLine: i };
            }
        }
    } else if (bracketChar === '}' || bracketChar === ']') {
        const matchBracket = bracketChar === '}' ? '{' : '[';
        let depth = 1;
        
        for (let i = lineIndex - 1; i >= 0; i--) {
            const lineBrackets = lines[i].querySelectorAll('.json-bracket');
            for (const b of lineBrackets) {
                if (b.textContent === bracketChar) depth++;
                else if (b.textContent === matchBracket) depth--;
            }
            if (depth === 0) {
                return { startLine: i, endLine: lineIndex };
            }
        }
    }
    
    return null;
}

// 选中整个块
function selectBlock(startLine, endLine) {
    const lines = outputJson.querySelectorAll('.json-line');
    for (let i = startLine; i <= endLine; i++) {
        if (lines[i]) {
            lines[i].classList.add('block-selected');
        }
    }
}

// 清除所有选中状态
function clearAllSelections() {
    const lines = outputJson.querySelectorAll('.json-line');
    lines.forEach(l => {
        l.classList.remove('selected');
        l.classList.remove('block-selected');
        delete l.dataset.blockStart;
        delete l.dataset.blockEnd;
    });
}

// 根据 DOM 行索引构建 JSONPath
function buildJsonPathFromLineIndex(lineIndex) {
    const lines = outputJson.querySelectorAll('.json-line');
    const pathParts = [];
    
    function addPath(idx, isArrayItem, arrayIndex) {
        if (isArrayItem) {
            pathParts.unshift(`[${arrayIndex}]`);
        }
    }
    
    function findParents(idx) {
        for (let i = idx - 1; i >= 0; i--) {
            const line = lines[i];
            if (!line) continue;
            const bracket = line.querySelector('.json-bracket');
            if (!bracket) continue;
            
            const bracketChar = bracket.textContent;
            if (bracketChar === '{' || bracketChar === '[') {
                const matchBracket = bracketChar === '{' ? '}' : ']';
                let depth = 1;
                let endLine = -1;
                
                for (let j = i + 1; j < lines.length; j++) {
                    const lineBrackets = lines[j].querySelectorAll('.json-bracket');
                    for (const b of lineBrackets) {
                        if (b.textContent === bracketChar) depth++;
                        else if (b.textContent === matchBracket) depth--;
                    }
                    if (depth === 0) {
                        endLine = j;
                        break;
                    }
                }
                
                if (endLine === -1) continue;
                
                if (bracketChar === '[') {
                    if (idx > i && idx <= endLine) {
                        let itemIndex = 0;
                        for (let k = i + 1; k < idx; k++) {
                            const lineText = getLineTextOnly(lines[k]).trim();
                            if (!lineText || lineText === ',' || lineText === '},' || lineText === '],') continue;
                            if (lineText.endsWith(']') || lineText.endsWith('}')) continue;
                            itemIndex++;
                        }
                        pathParts.unshift(`[${itemIndex}]`);
                    }
                    findParents(i);
                } else {
                    if (idx === idx) {
                        const lineText = getLineTextOnly(lines[idx]).trim();
                        const colonPos = lineText.indexOf(':');
                        if (colonPos !== -1) {
                            const key = lineText.substring(0, colonPos).trim().replace(/^"|"$/g, '');
                            pathParts.unshift(`.${key}`);
                        }
                    }
                    findParents(i);
                }
                return;
            }
        }
    }
    
    findParents(lineIndex + 1);
    
    let path = pathParts.join('');
    if (path.startsWith('.')) {
        path = '$' + path;
    } else if (path.startsWith('[')) {
        path = '$' + path;
    } else {
        path = '$' + path;
    }
    
    return path;
}

// 处理行操作
function handleLineAction(action, lineEl) {
    const lineIndex = parseInt(lineEl.dataset.line);
    
    if (action === 'copy') {
        CopyStrategy.copy(lineIndex);
        return;
    }
    
    let content;
    const blockStart = lineEl.dataset.blockStart;
    const blockEnd = lineEl.dataset.blockEnd;
    
    if (blockStart !== undefined && blockEnd !== undefined) {
        content = getBlockContent(parseInt(blockStart), parseInt(blockEnd));
    } else {
        content = lineEl.textContent.replace(/复制下载清除$/, '').trim();
    }
    
    if (!content) return;
    
    switch (action) {
        case 'download':
            downloadLineContent(content);
            break;
        case 'clear':
            clearLineContent(lineIndex, blockStart, blockEnd);
            break;
    }
}

// 下载内容
function downloadLineContent(content) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'json-block.json';
    a.click();
    URL.revokeObjectURL(url);
}

// 清除内容
function clearLineContent(lineIndex, blockStart, blockEnd) {
    if (blockStart !== undefined && blockEnd !== undefined) {
        const lines = outputJson.querySelectorAll('.json-line');
        for (let i = blockStart; i <= blockEnd; i++) {
            if (lines[i]) {
                lines[i].remove();
            }
        }
        rebuildOutputData();
    } else {
        const line = outputJson.querySelector(`.json-line[data-line="${lineIndex}"]`);
        if (line) {
            line.remove();
            rebuildOutputData();
        }
    }
}

// 重建输出数据
function rebuildOutputData() {
    const lines = outputJson.querySelectorAll('.json-line');
    let content = [];
    lines.forEach(line => {
        let text = line.textContent.replace(/复制下载清除$/, '').trim();
        content.push(text);
    });
    outputJsonData.value = content.join('\n');
    
    try {
        const parsed = JSON.parse(outputJsonData.value);
        inputJson.value = JSON.stringify(parsed, null, DEFAULT_INDENT);
        autoFormat();
    } catch (e) {
        // ignore
    }
}

// 括号匹配高亮
function highlightBracketMatch() {
    const brackets = outputJson.querySelectorAll('.json-bracket');
    brackets.forEach(b => b.classList.remove('match'));
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    let node = selection.anchorNode;
    while (node && node !== outputJson) {
        if (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('json-bracket')) {
            break;
        }
        node = node.parentNode;
    }
    
    if (!node || node === outputJson) return;
    
    const bracket = node.textContent;
    if (bracket === '{' || bracket === '[') {
        const matchBracket = bracket === '{' ? '}' : ']';
        const children = Array.from(outputJson.children);
        const startIndex = children.indexOf(node);
        
        let depth = 1;
        for (let j = startIndex + 1; j < children.length; j++) {
            const nextBracket = children[j].textContent;
            if (nextBracket === bracket) depth++;
            else if (nextBracket === matchBracket) depth--;
            if (depth === 0) {
                node.classList.add('match');
                children[j].classList.add('match');
                break;
            }
        }
    } else if (bracket === '}' || bracket === ']') {
        const matchBracket = bracket === '}' ? '{' : '[';
        const children = Array.from(outputJson.children);
        const startIndex = children.indexOf(node);
        
        let depth = 1;
        for (let j = startIndex - 1; j >= 0; j--) {
            const prevBracket = children[j].textContent;
            if (prevBracket === bracket) depth++;
            else if (prevBracket === matchBracket) depth--;
            if (depth === 0) {
                node.classList.add('match');
                children[j].classList.add('match');
                break;
            }
        }
    }
}

// 切换操作菜单
function toggleActionMenu(e) {
    e.stopPropagation();
    actionMenu.classList.toggle('show');
}

function closeActionMenu(e) {
    if (!actionMenu.contains(e.target)) {
        actionMenu.classList.remove('show');
    }
}

// 从输出区转换
function convertFromOutput(type) {
    const jsonString = outputJsonData.value.trim();
    if (!jsonString) return;
    
    try {
        const parsedJson = JSON.parse(jsonString);
        let result;
        
        switch (type) {
            case 'yaml':
                result = convertToYamlFormat(parsedJson, 0, DEFAULT_INDENT);
                break;
            case 'toon':
                result = convertToToonFormat(parsedJson, 0);
                break;
            case 'structure':
                result = extractJsonStructure(parsedJson);
                result = JSON.stringify(result, null, DEFAULT_INDENT);
                break;
        }
        
        outputJson.innerHTML = highlightJson(result);
        outputJsonData.value = result;
    } catch (e) {
        // 转换失败不处理
    }
    actionMenu.classList.remove('show');
}

// 加载示例数据
function loadSampleData() {
    const sampleData = {
        "name": "张三",
        "age": 30,
        "email": "zhangsan@example.com",
        "address": {
            "country": "中国",
            "city": "北京"
        },
        "hobbies": ["读书", "游泳", "编程"],
        "married": true
    };
    inputJson.value = JSON.stringify(sampleData, null, DEFAULT_INDENT);
    autoFormat();
}

// 将对象转换为TOON格式
function convertToToonFormat(obj, indentLevel = 0) {
    const indent = '  '.repeat(indentLevel);
    
    if (obj === null) {
        return 'null';
    }
    
    if (obj === undefined) {
        return 'null';
    }
    
    if (Array.isArray(obj)) {
        // 处理空数组
        if (obj.length === 0) {
            return '[]';
        }
        
        // 检查是否为对象数组且具有相同的键
        if (typeof obj[0] === 'object' && obj[0] !== null && !Array.isArray(obj[0])) {
            const firstObjKeys = Object.keys(obj[0]);
            const isUniformArray = obj.every(item => 
                typeof item === 'object' && 
                item !== null && 
                !Array.isArray(item) && 
                JSON.stringify(Object.keys(item).sort()) === JSON.stringify(firstObjKeys.sort())
            );
            
            if (isUniformArray) {
                // 统一对象数组，使用表格格式
                const header = `{${firstObjKeys.join(',')}}`;
                const rows = obj.map(item => 
                    firstObjKeys.map(key => formatToonValue(item[key])).join(',')
                );
                return `${indent}[${obj.length}]${header}:\n${rows.map(row => `${indent}  ${row}`).join('\n')}`;
            }
        }
        
        // 普通数组
        const items = obj.map(item => convertToToonFormat(item, 0)).join(',');
        return `[${obj.length}]: ${items}`;
    }
    
    if (typeof obj === 'object') {
        const keys = Object.keys(obj);
        if (keys.length === 0) {
            return '{}';
        }
        
        const entries = keys.map(key => {
            const value = obj[key];
            if (typeof value === 'object' && value !== null) {
                // 对于嵌套对象，递归处理
                const nested = convertToToonFormat(value, indentLevel + 1);
                if (nested.startsWith('  ')) {
                    // 多行对象
                    return `${indent}${key}:\n${nested}`;
                } else {
                    // 单行对象
                    return `${indent}${key}: ${nested}`;
                }
            } else {
                // 简单值
                return `${indent}${key}: ${formatToonValue(value)}`;
            }
        });
        
        return entries.join('\n');
    }
    
    // 基本类型
    return formatToonValue(obj);
}

// 格式化TOON值
function formatToonValue(value) {
    if (typeof value === 'string') {
        // 如果字符串包含特殊字符，需要加引号
        if (/[,\[\]{}:\s]/.test(value)) {
            return `"${value}"`;
        }
        return value;
    }
    
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
        return String(value);
    }
    
    return String(value);
}

// 递归提取JSON结构
function extractJsonStructure(obj) {
    if (obj === null || obj === undefined) {
        return null;
    }
    
    if (Array.isArray(obj)) {
        if (obj.length === 0) {
            return [];
        }
        return [extractJsonStructure(obj[0])];
    }
    
    if (typeof obj === 'object') {
        const structure = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                structure[key] = extractJsonStructure(obj[key]);
            }
        }
        return structure;
    }
    
    if (typeof obj === 'string') return '';
    if (typeof obj === 'number') return 0;
    if (typeof obj === 'boolean') return false;
    return null;
}

// 将对象转换为YAML格式
function convertToYamlFormat(obj, depth, indentSize) {
    const indent = ' '.repeat(depth * indentSize);
    
    if (obj === null) {
        return 'null';
    }
    
    if (obj === undefined) {
        return 'null';
    }
    
    if (Array.isArray(obj)) {
        // 处理空数组
        if (obj.length === 0) {
            return '[]';
        }
        
        // 处理数组元素
        let result = '';
        for (let i = 0; i < obj.length; i++) {
            const item = obj[i];
            if (typeof item === 'object' && item !== null) {
                // 对于对象或数组元素
                result += `${indent}- ${convertToYamlFormat(item, depth + 1, indentSize)}\n`;
            } else {
                // 对于基本类型元素
                result += `${indent}- ${formatYamlValue(item)}\n`;
            }
        }
        return result.trimEnd();
    }
    
    if (typeof obj === 'object') {
        const keys = Object.keys(obj);
        if (keys.length === 0) {
            return '{}';
        }
        
        let result = '';
        for (const key of keys) {
            const value = obj[key];
            if (typeof value === 'object' && value !== null) {
                // 对于嵌套对象或数组
                if (Array.isArray(value) && value.length === 0) {
                    result += `${indent}${key}: []\n`;
                } else if (Array.isArray(value)) {
                    result += `${indent}${key}:\n${convertToYamlFormat(value, depth + 1, indentSize)}\n`;
                } else if (Object.keys(value).length === 0) {
                    result += `${indent}${key}: {}\n`;
                } else {
                    result += `${indent}${key}:\n${convertToYamlFormat(value, depth + 1, indentSize)}\n`;
                }
            } else {
                // 对于基本类型
                result += `${indent}${key}: ${formatYamlValue(value)}\n`;
            }
        }
        return result.trimEnd();
    }
    
    // 基本类型
    return formatYamlValue(obj);
}

// 格式化YAML值
function formatYamlValue(value) {
    if (typeof value === 'string') {
        // 处理包含特殊字符的字符串
        if (/[":{}\[\],&*#?|>-]/.test(value) || 
            value.startsWith('- ') || 
            value.startsWith('?') || 
            value.startsWith(': ') ||
            value.includes('\n')) {
            // 使用引号包裹
            if (value.includes('"')) {
                // 如果包含双引号，使用单引号
                return `'${value.replace(/'/g, "''")}'`;
            } else {
                // 使用双引号
                return `"${value.replace(/"/g, '\\"')}"`;
            }
        }
        return value;
    }
    
    if (typeof value === 'number') {
        return String(value);
    }
    
    if (typeof value === 'boolean') {
        return String(value);
    }
    
    if (value === null) {
        return 'null';
    }
    
    return String(value);
}