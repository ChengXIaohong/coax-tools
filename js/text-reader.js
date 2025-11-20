class TextFileReader {
    constructor() {
        this.file = null;
        this.encoding = 'utf-8';
        this.totalLines = 0;
        this.lineStartPositions = []; // 行首位置索引
        this.cachedLines = new Map(); // 行内容缓存
        this.visibleStartLine = 0;
        this.visibleEndLine = 0;
        this.bufferSize = 500; // 缓冲区大小
        this.chunkSize = 1024 * 1024; // 1MB chunks
        this.isLoading = false;
        this.messageTimeout = null; // 消息定时器
        
        // DOM元素
        this.elements = {
            uploadArea: document.getElementById('uploadArea'),
            fileInput: document.getElementById('fileInput'),
            fileInfo: document.getElementById('fileInfo'),
            encodingSelect: document.getElementById('encodingSelect'),
            lineNumberInput: document.getElementById('lineNumberInput'),
            goToLineBtn: document.getElementById('goToLineBtn'),
            savePositionBtn: document.getElementById('savePositionBtn'),
            resetBtn: document.getElementById('resetBtn'),
            lineNumbers: document.getElementById('lineNumbers'),
            textContent: document.getElementById('textContent'),
            message: document.getElementById('message'),
            loadedInfo: document.getElementById('loadedInfo'),
            totalInfo: document.getElementById('totalInfo'),
            positionInfo: document.getElementById('positionInfo'),
            prevPageBtn: document.getElementById('prevPageBtn'),
            nextPageBtn: document.getElementById('nextPageBtn'),
            currentYear: document.getElementById('currentYear')
        };
        
        this.init();
    }
    
    init() {
        // 初始化年份
        if (this.elements.currentYear) {
            this.elements.currentYear.textContent = new Date().getFullYear();
        }
        
        // 绑定事件
        this.bindEvents();
        
        // 初始化滚动事件
        if (this.elements.textContent) {
            this.elements.textContent.addEventListener('scroll', () => this.onScroll());
        }
        
        // 移除自动保存机制，改为手动保存
        
        // 检查是否有保存的阅读记录
        this.checkReadingProgress();
    }
    
    bindEvents() {
        const els = this.elements;
        
        if (els.fileInput) {
            els.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }
        
        if (els.uploadArea) {
            els.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            els.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            els.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        }
        
        if (els.encodingSelect) {
            els.encodingSelect.addEventListener('change', (e) => {
                this.encoding = e.target.value;
                // 当用户手动更改编码时，重新加载文件
                if (this.file) {
                    this.resetReadingContent();
                    this.initializeFileReading();
                }
            });
        }
        
        if (els.goToLineBtn) {
            els.goToLineBtn.addEventListener('click', () => this.goToLine());
        }
        
        if (els.savePositionBtn) {
            els.savePositionBtn.addEventListener('click', () => this.saveCurrentPositionAndNotify());
        }
        
        if (els.resetBtn) {
            els.resetBtn.addEventListener('click', () => this.resetAll());
        }
        
        if (els.prevPageBtn) {
            els.prevPageBtn.addEventListener('click', () => this.prevPage());
        }
        
        if (els.nextPageBtn) {
            els.nextPageBtn.addEventListener('click', () => this.nextPage());
        }
        
        // 行号输入框回车事件
        if (els.lineNumberInput) {
            els.lineNumberInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.goToLine();
                }
            });
        }
    }
    
    handleDragOver(event) {
        event.preventDefault();
        if (this.elements.uploadArea) {
            this.elements.uploadArea.classList.add('dragover');
        }
    }
    
    handleDragLeave(event) {
        event.preventDefault();
        if (this.elements.uploadArea) {
            this.elements.uploadArea.classList.remove('dragover');
        }
    }
    
    handleDrop(event) {
        event.preventDefault();
        if (this.elements.uploadArea) {
            this.elements.uploadArea.classList.remove('dragover');
        }
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }
    
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }
    
    processFile(file) {
        // 检查文件类型
        if (!this.isTextFile(file)) {
            this.showMessage('请选择文本文件 (.txt, .log, .csv)', 'error');
            return;
        }
        
        this.file = file;
        
        // 显示文件信息
        if (this.elements.fileInfo) {
            this.elements.fileInfo.textContent = `${file.name} (${this.formatFileSize(file.size)})`;
        }
        
        this.showMessage(`已选择文件: ${file.name}`, 'info');
        
        // 切换到阅读模式
        const readerContainer = document.querySelector('.reader-container');
        if (readerContainer) {
            readerContainer.classList.add('reading-mode');
        }
        
        // 开始读取文件
        this.initializeFileReading();
    }
    
    isTextFile(file) {
        const validTypes = ['text/plain', 'text/csv'];
        const validExtensions = ['.txt', '.log', '.csv'];
        const fileName = file.name.toLowerCase();
        
        // 检查 MIME 类型
        if (validTypes.includes(file.type)) {
            return true;
        }
        
        // 检查文件扩展名
        for (const ext of validExtensions) {
            if (fileName.endsWith(ext)) {
                return true;
            }
        }
        
        return false;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async initializeFileReading() {
        if (!this.file) return;
        
        try {
            // 自动检测编码
            await this.autoDetectEncoding();
            
            // 构建行索引
            await this.buildLineIndex();
            
            // 显示文件内容
            this.renderVisibleLines();
            
            // 更新信息显示
            this.updateFileInfo();
            
            // 检查并跳转到保存的阅读位置
            this.checkAndRestoreReadingPosition();
        } catch (error) {
            this.showMessage('初始化文件读取时出错: ' + error.message, 'error');
        }
    }
    
    async buildLineIndex() {
        if (!this.file) return;
        
        this.lineStartPositions = [0]; // 第一行从位置0开始
        let position = 0;
        let offset = 0;
        
        this.showMessage('正在分析文件结构...', 'info');
        
        while (offset < this.file.size) {
            // 读取文件块
            const chunkEnd = Math.min(offset + this.chunkSize, this.file.size);
            const chunk = this.file.slice(offset, chunkEnd);
            
            try {
                const text = await this.readBlobAsText(chunk);
                const lines = text.split('\n');
                
                // 处理块中的行（除了最后一行，因为可能不完整）
                for (let i = 0; i < lines.length - 1; i++) {
                    position += lines[i].length + 1; // +1 for \n
                    this.lineStartPositions.push(position);
                }
                
                // 最后一行的处理
                const lastLine = lines[lines.length - 1];
                position += lastLine.length;
                
                // 如果不是文件末尾，说明还有换行符
                if (chunkEnd < this.file.size) {
                    position += 1; // for \n
                    this.lineStartPositions.push(position);
                }
                
                offset = chunkEnd;
                
                // 更新进度信息
                if (this.elements.loadedInfo) {
                    this.elements.loadedInfo.textContent = `已索引: ${this.lineStartPositions.length} 行`;
                }
            } catch (error) {
                this.showMessage(`读取文件时出错: ${error.message}，请尝试更改编码格式`, 'error');
                throw new Error('读取文件时出错: ' + error.message);
            }
        }
        
        this.totalLines = this.lineStartPositions.length;
        this.showMessage('文件分析完成!', 'success');
    }
    
    readBlobAsText(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(blob, this.encoding);
        });
    }
    
    // 检测文件编码
    async detectEncoding(file) {
        return new Promise((resolve) => {
            // 读取文件开头的一小部分用于编码检测
            const chunk = file.slice(0, 1024);
            const reader = new FileReader();
            
            reader.onload = () => {
                const buffer = reader.result;
                
                // 检测BOM标记
                if (buffer.byteLength >= 3) {
                    const bom = new Uint8Array(buffer, 0, 3);
                    if (bom[0] === 0xEF && bom[1] === 0xBB && bom[2] === 0xBF) {
                        resolve('utf-8');
                        return;
                    }
                }
                
                if (buffer.byteLength >= 2) {
                    const bom = new Uint8Array(buffer, 0, 2);
                    // UTF-16BE BOM
                    if (bom[0] === 0xFE && bom[1] === 0xFF) {
                        resolve('utf-16be');
                        return;
                    }
                    // UTF-16LE BOM
                    if (bom[0] === 0xFF && bom[1] === 0xFE) {
                        resolve('utf-16le');
                        return;
                    }
                }
                
                // 如果没有BOM，尝试通过内容检测
                try {
                    const uint8Array = new Uint8Array(buffer);
                    
                    // 检查是否为有效的UTF-8
                    if (this.isValidUTF8(uint8Array)) {
                        resolve('utf-8');
                        return;
                    }
                    
                    // 检查是否可能是GBK/GB2312
                    if (this.isLikelyGBK(uint8Array)) {
                        resolve('gbk');
                        return;
                    }
                } catch (e) {
                    console.warn('编码检测出错:', e);
                }
                
                // 默认返回当前选择的编码
                resolve(this.encoding);
            };
            
            reader.onerror = () => {
                // 如果检测失败，使用当前选择的编码
                resolve(this.encoding);
            };
            
            reader.readAsArrayBuffer(chunk);
        });
    }
    
    // 检查是否为有效的UTF-8
    isValidUTF8(bytes) {
        let i = 0;
        while (i < bytes.length) {
            const byte = bytes[i];
            
            // ASCII字符 (0xxxxxxx)
            if ((byte & 0x80) === 0) {
                i++;
                continue;
            }
            
            // 多字节字符
            let numBytes = 0;
            if ((byte & 0xE0) === 0xC0) {
                numBytes = 2; // 110xxxxx
            } else if ((byte & 0xF0) === 0xE0) {
                numBytes = 3; // 1110xxxx
            } else if ((byte & 0xF8) === 0xF0) {
                numBytes = 4; // 11110xxx
            } else {
                // 无效的UTF-8起始字节
                return false;
            }
            
            // 检查后续字节
            if (i + numBytes > bytes.length) {
                return false;
            }
            
            for (let j = 1; j < numBytes; j++) {
                if ((bytes[i + j] & 0xC0) !== 0x80) { // 10xxxxxx
                    return false;
                }
            }
            
            i += numBytes;
        }
        
        return true;
    }
    
    // 简单检查是否可能是GBK编码
    isLikelyGBK(bytes) {
        // 检查是否存在GBK常见的字节模式
        let gbkScore = 0;
        let utf8Score = 0;
        
        for (let i = 0; i < bytes.length - 1; i++) {
            const byte1 = bytes[i];
            const byte2 = bytes[i + 1];
            
            // GBK编码的字符通常是两个字节，第一个字节在0x81-0xFE之间，第二个字节在0x40-0xFE之间（除了0x7F）
            if (byte1 >= 0x81 && byte1 <= 0xFE) {
                if ((byte2 >= 0x40 && byte2 <= 0x7E) || (byte2 >= 0x80 && byte2 <= 0xFE)) {
                    gbkScore++;
                }
            }
            
            // 检查UTF-8序列
            if ((byte1 & 0xE0) === 0xC0) { // 2字节UTF-8序列
                if (i + 1 < bytes.length && (bytes[i + 1] & 0xC0) === 0x80) {
                    utf8Score++;
                }
            } else if ((byte1 & 0xF0) === 0xE0) { // 3字节UTF-8序列
                if (i + 2 < bytes.length && (bytes[i + 1] & 0xC0) === 0x80 && (bytes[i + 2] & 0xC0) === 0x80) {
                    utf8Score++;
                }
            } else if ((byte1 & 0xF8) === 0xF0) { // 4字节UTF-8序列
                if (i + 3 < bytes.length && (bytes[i + 1] & 0xC0) === 0x80 && (bytes[i + 2] & 0xC0) === 0x80 && (bytes[i + 3] & 0xC0) === 0x80) {
                    utf8Score++;
                }
            }
        }
        
        // 如果GBK特征更明显，则返回true
        return gbkScore > utf8Score;
    }
    
    // 自动检测并设置编码
    async autoDetectEncoding() {
        if (!this.file) return;
        
        try {
            const detectedEncoding = await this.detectEncoding(this.file);
            
            // 如果检测到的编码与当前选择的不同，更新选择框
            if (detectedEncoding !== this.encoding) {
                this.encoding = detectedEncoding;
                
                // 更新下拉框的选中项
                if (this.elements.encodingSelect) {
                    this.elements.encodingSelect.value = detectedEncoding;
                }
                
                this.showMessage(`检测到文件编码为: ${detectedEncoding.toUpperCase()}，已自动切换`, 'info');
            }
        } catch (error) {
            console.warn('自动编码检测失败:', error);
        }
    }
    
    async loadLines(startLine, endLine) {
        if (!this.file || startLine < 0 || endLine >= this.totalLines) return;
        
        const promises = [];
        
        for (let i = startLine; i <= endLine; i++) {
            // 如果已经缓存，跳过
            if (this.cachedLines.has(i)) continue;
            
            // 创建读取行内容的Promise
            promises.push(this.loadLineContent(i));
        }
        
        // 并行加载所有未缓存的行
        await Promise.all(promises);
    }
    
    async loadLineContent(lineNumber) {
        if (!this.file || lineNumber < 0 || lineNumber >= this.totalLines) return '';
        
        const startPos = this.lineStartPositions[lineNumber];
        const endPos = lineNumber + 1 < this.totalLines ? 
            this.lineStartPositions[lineNumber + 1] - 1 : 
            this.file.size;
            
        const lineLength = endPos - startPos;
        if (lineLength <= 0) {
            this.cachedLines.set(lineNumber, '');
            return '';
        }
        
        try {
            const blob = this.file.slice(startPos, endPos);
            const content = await this.readBlobAsText(blob);
            this.cachedLines.set(lineNumber, content);
            return content;
        } catch (error) {
            console.error(`读取第${lineNumber}行时出错:`, error);
            this.cachedLines.set(lineNumber, '');
            return '';
        }
    }
    
    async renderVisibleLines(skipScrollUpdate = false) {
        if (!this.file || this.totalLines === 0) return;
        
        // 计算可视区域的行范围
        const lineHeight = 20; // 估计的行高
        const containerHeight = this.elements.textContent.clientHeight;
        const scrollTop = skipScrollUpdate ? this._targetScrollTop : this.elements.textContent.scrollTop;
        
        // 计算可见行范围
        const startLine = Math.max(0, Math.floor(scrollTop / lineHeight) - this.bufferSize);
        const endLine = Math.min(
            this.totalLines - 1, 
            Math.floor((scrollTop + containerHeight) / lineHeight) + this.bufferSize
        );
        
        this.visibleStartLine = startLine;
        this.visibleEndLine = endLine;
        
        // 加载需要的行
        await this.loadLines(startLine, endLine);
        
        // 渲染行号
        let lineNumbersHTML = '';
        for (let i = startLine; i <= endLine; i++) {
            lineNumbersHTML += `<div>${i + 1}</div>`;
        }
        
        if (this.elements.lineNumbers) {
            this.elements.lineNumbers.innerHTML = lineNumbersHTML;
        }
        
        // 渲染文本内容
        let contentHTML = '';
        for (let i = startLine; i <= endLine; i++) {
            const lineContent = this.cachedLines.get(i) || '';
            contentHTML += `<div class="content-line">${this.escapeHtml(lineContent)}</div>`;
        }
        
        if (this.elements.textContent) {
            this.elements.textContent.innerHTML = contentHTML;
            
            // 如果有目标滚动位置，在渲染后设置
            if (skipScrollUpdate && this._targetScrollTop !== undefined) {
                this.elements.textContent.scrollTop = this._targetScrollTop;
                delete this._targetScrollTop;
            }
        }
        
        // 更新位置信息
        this.updatePositionInfo();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    onScroll() {
        if (this.isLoading) return;
        
        // 使用防抖优化滚动性能
        if (this.scrollTimer) {
            clearTimeout(this.scrollTimer);
        }
        
        this.scrollTimer = setTimeout(() => {
            this.renderVisibleLines();
        }, 50);
    }
    
    // 移除了自动保存功能，改为手动保存
    
    updateFileInfo() {
        if (this.elements.totalInfo) {
            this.elements.totalInfo.textContent = `总行数: ${this.totalLines.toLocaleString()}`;
        }
        
        this.updatePositionInfo();
    }
    
    updatePositionInfo() {
        if (this.elements.positionInfo && this.elements.textContent) {
            const lineHeight = 20;
            const scrollTop = this.elements.textContent.scrollTop;
            const currentLine = Math.floor(scrollTop / lineHeight) + 1;
            this.elements.positionInfo.textContent = `位置: 第 ${currentLine.toLocaleString()} 行`;
        }
        
        if (this.elements.loadedInfo) {
            const cachedCount = this.cachedLines.size;
            this.elements.loadedInfo.textContent = `已加载: ${cachedCount.toLocaleString()} 行`;
        }
    }
    
    // 保存当前位置并提示用户
    saveCurrentPositionAndNotify() {
        if (this.file && this.elements.textContent) {
            const lineHeight = 20;
            const scrollTop = this.elements.textContent.scrollTop;
            const currentLine = Math.floor(scrollTop / lineHeight) + 1;
            this.saveReadingProgress(currentLine);
            this.showMessage(`已保存当前位置: 第 ${currentLine} 行`, 'success');
        } else {
            this.showMessage('请先选择文件', 'error');
        }
    }
    
    // 保存当前位置
    saveCurrentPosition() {
        if (this.file && this.elements.textContent) {
            const lineHeight = 20;
            const scrollTop = this.elements.textContent.scrollTop;
            const currentLine = Math.floor(scrollTop / lineHeight) + 1;
            this.saveReadingProgress(currentLine);
        }
    }
    
    goToLine() {
        if (!this.file) {
            this.showMessage('请先选择文件', 'error');
            return;
        }
        
        const lineNumber = parseInt(this.elements.lineNumberInput.value);
        if (isNaN(lineNumber) || lineNumber < 1 || lineNumber > this.totalLines) {
            this.showMessage('请输入有效的行号', 'error');
            return;
        }
        
        // 计算滚动位置
        const targetLine = lineNumber - 1;
        const lineHeight = 20; // 估计的行高
        const targetScrollTop = targetLine * lineHeight;
        
        if (this.elements.textContent) {
            this.elements.textContent.scrollTop = targetScrollTop;
            this.renderVisibleLines();
        }
    }
    
    prevPage() {
        if (!this.elements.textContent) return;
        
        const containerHeight = this.elements.textContent.clientHeight;
        const currentScrollTop = this.elements.textContent.scrollTop;
        const newScrollTop = Math.max(0, currentScrollTop - containerHeight);
        
        this.elements.textContent.scrollTop = newScrollTop;
        this.renderVisibleLines();
    }
    
    nextPage() {
        if (!this.elements.textContent) return;
        
        const containerHeight = this.elements.textContent.clientHeight;
        const currentScrollTop = this.elements.textContent.scrollTop;
        const maxScrollTop = this.elements.textContent.scrollHeight - containerHeight;
        const newScrollTop = Math.min(maxScrollTop, currentScrollTop + containerHeight);
        
        this.elements.textContent.scrollTop = newScrollTop;
        this.renderVisibleLines();
    }
    
    // 重置阅读内容但不重置文件
    resetReadingContent() {
        this.totalLines = 0;
        this.lineStartPositions = [];
        this.cachedLines.clear();
        this.visibleStartLine = 0;
        this.visibleEndLine = 0;
        
        // 重置界面
        if (this.elements.lineNumbers) this.elements.lineNumbers.innerHTML = '';
        if (this.elements.textContent) this.elements.textContent.innerHTML = '';
        if (this.elements.loadedInfo) this.elements.loadedInfo.textContent = '已加载: 0 行';
        if (this.elements.totalInfo) this.elements.totalInfo.textContent = '总行数: -';
        if (this.elements.positionInfo) this.elements.positionInfo.textContent = '位置: 第 0 行';
    }
    
    resetAll() {
        // 清除消息定时器
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
            this.messageTimeout = null;
        }
        
        // 保存当前位置
        this.saveCurrentPosition();
        
        // 重置文件
        this.file = null;
        this.resetReadingContent();
        
        // 重置表单
        if (this.elements.fileInput) this.elements.fileInput.value = '';
        if (this.elements.fileInfo) this.elements.fileInfo.textContent = '';
        if (this.elements.lineNumberInput) this.elements.lineNumberInput.value = '';
        if (this.elements.encodingSelect) this.elements.encodingSelect.value = 'utf-8';
        this.encoding = 'utf-8';
        
        // 退出阅读模式
        const readerContainer = document.querySelector('.reader-container');
        if (readerContainer) {
            readerContainer.classList.remove('reading-mode');
        }
        
        this.showMessage('已重置所有内容', 'info');
    }
    
    showMessage(text, type) {
        if (this.elements.message) {
            // 清除之前的定时器
            if (this.messageTimeout) {
                clearTimeout(this.messageTimeout);
            }
            
            // 显示消息
            this.elements.message.textContent = text;
            this.elements.message.className = 'message ' + type;
            
            // 添加关闭按钮
            const closeBtn = document.createElement('button');
            closeBtn.className = 'close-btn';
            closeBtn.innerHTML = '&times;';
            closeBtn.onclick = () => {
                this.elements.message.classList.add('fade-out');
                if (this.messageTimeout) {
                    clearTimeout(this.messageTimeout);
                }
            };
            this.elements.message.appendChild(closeBtn);
            
            // 如果是成功消息（如"文件分析完成!"），5秒后自动淡出
            if (type === 'success' && text === '文件分析完成!') {
                this.messageTimeout = setTimeout(() => {
                    if (this.elements.message) {
                        this.elements.message.classList.add('fade-out');
                    }
                }, 5000);
            }
            
            // 如果在阅读模式下，错误消息也自动淡出
            if (type === 'error') {
                this.messageTimeout = setTimeout(() => {
                    if (this.elements.message) {
                        this.elements.message.classList.add('fade-out');
                    }
                }, 5000);
            }
        }
    }
    
    // 检查阅读进度
    checkReadingProgress() {
        // 这里可以添加检查阅读进度的逻辑
        // 目前我们会在文件加载后检查
    }
    
    // 获取保存的阅读位置
    getSavedPosition() {
        if (!this.file) return null;
        
        try {
            // 获取阅读记录
            const readingRecords = JSON.parse(localStorage.getItem('textReaderRecords') || '[]');
            
            // 查找当前文件的记录
            const fileRecord = readingRecords.find(record => 
                record.fileName === this.file.name && 
                record.fileSize === this.file.size);
            
            return fileRecord || null;
        } catch (error) {
            console.warn('获取阅读位置时出错:', error);
            return null;
        }
    }
    
    // 保存阅读进度
    saveReadingProgress(lineNumber) {
        if (!this.file) return;
        
        try {
            // 获取现有的阅读记录
            let readingRecords = JSON.parse(localStorage.getItem('textReaderRecords') || '[]');
            
            // 创建当前文件的记录
            const fileRecord = {
                fileName: this.file.name,
                fileSize: this.file.size,
                lastPosition: lineNumber,
                lastAccess: Date.now()
            };
            
            // 检查是否已存在该文件的记录
            const existingIndex = readingRecords.findIndex(record => 
                record.fileName === fileRecord.fileName && 
                record.fileSize === fileRecord.fileSize);
            
            if (existingIndex >= 0) {
                // 更新现有记录
                readingRecords[existingIndex] = fileRecord;
            } else {
                // 添加新记录
                readingRecords.push(fileRecord);
                
                // 如果记录超过10个，删除最旧的
                if (readingRecords.length > 10) {
                    readingRecords.sort((a, b) => b.lastAccess - a.lastAccess);
                    readingRecords = readingRecords.slice(0, 10);
                }
            }
            
            // 保存到localStorage
            localStorage.setItem('textReaderRecords', JSON.stringify(readingRecords));
        } catch (error) {
            console.warn('保存阅读进度时出错:', error);
        }
    }
    
    // 检查并恢复阅读位置
    checkAndRestoreReadingPosition() {
        if (!this.file || !this.elements.textContent) return;
        
        try {
            // 获取阅读记录
            const readingRecords = JSON.parse(localStorage.getItem('textReaderRecords') || '[]');
            
            // 查找当前文件的记录
            const fileRecord = readingRecords.find(record => 
                record.fileName === this.file.name && 
                record.fileSize === this.file.size);
            
            // 如果找到记录且位置有效，跳转到该位置
            if (fileRecord && fileRecord.lastPosition > 1 && fileRecord.lastPosition <= this.totalLines) {
                // 计算滚动位置
                const lineHeight = 20; // 估计的行高
                const targetScrollTop = (fileRecord.lastPosition - 1) * lineHeight;
                
                // 保存目标滚动位置
                this._targetScrollTop = targetScrollTop;
                
                // 使用setTimeout确保在DOM更新后再设置滚动位置
                setTimeout(() => {
                    // 重新渲染可见行，但保持滚动位置
                    this.renderVisibleLines(true);
                    
                    this.showMessage(`已恢复到上次阅读位置: 第 ${fileRecord.lastPosition} 行`, 'info');
                    
                    // 更新位置信息
                    this.updatePositionInfo();
                }, 0);
            }
        } catch (error) {
            console.warn('恢复阅读位置时出错:', error);
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    window.textFileReader = new TextFileReader();
});