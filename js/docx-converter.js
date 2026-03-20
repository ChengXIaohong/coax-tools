// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileListSection = document.getElementById('fileListSection');
const fileList = document.getElementById('fileList');
const fileCount = document.getElementById('fileCount');
const clearAllBtn = document.getElementById('clearAllBtn');
const startConvertBtn = document.getElementById('startConvertBtn');
const progressSection = document.getElementById('progressSection');
const progressTitle = document.getElementById('progressTitle');
const progressFill = document.getElementById('progressFill');
const progressPercent = document.getElementById('progressPercent');
const progressDetail = document.getElementById('progressDetail');
const resultSection = document.getElementById('resultSection');
const resultMeta = document.getElementById('resultMeta');
const previewContent = document.getElementById('previewContent');
const detailsContent = document.getElementById('detailsContent');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const saveHistoryBtn = document.getElementById('saveHistoryBtn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const warningMessage = document.getElementById('warningMessage');
const infoMessage = document.getElementById('infoMessage');
const currentYearSpan = document.getElementById('currentYear');

// 模态框元素
let copyModal, modalBody, downloadBtnModal, copyAnywayBtn, cancelBtn;
let historyModal, historyList, historyEmpty, closeHistoryBtn, clearHistoryBtn, exportHistoryBtn;
let helpModal, closeHelpBtn;

// 选项元素
const formatOption = document.getElementById('formatOption');
const encodingOption = document.getElementById('encodingOption');
const batchModeCheckbox = document.getElementById('batchMode');

// 导航按钮
const historyBtn = document.getElementById('historyBtn');
const helpBtn = document.getElementById('helpBtn');

// 状态
let fileQueue = [];
let currentTextContent = '';
let currentFileName = '';
let conversionResults = [];
const MAX_HISTORY = 20;
const HISTORY_KEY = 'docx_converter_history';

// 初始化年份
currentYearSpan.textContent = new Date().getFullYear();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initElements();
    initEventListeners();
    loadHistory();
});

// 初始化元素引用
function initElements() {
    copyModal = document.getElementById('copyModal');
    modalBody = document.getElementById('modalBody');
    downloadBtnModal = document.getElementById('downloadBtnModal');
    copyAnywayBtn = document.getElementById('copyAnywayBtn');
    cancelBtn = document.getElementById('cancelBtn');
    
    historyModal = document.getElementById('historyModal');
    historyList = document.getElementById('historyList');
    historyEmpty = document.getElementById('historyEmpty');
    closeHistoryBtn = document.getElementById('closeHistoryBtn');
    clearHistoryBtn = document.getElementById('clearHistoryBtn');
    exportHistoryBtn = document.getElementById('exportHistoryBtn');
    
    helpModal = document.getElementById('helpModal');
    closeHelpBtn = document.getElementById('closeHelpBtn');
}

// 初始化事件监听器
function initEventListeners() {
    uploadArea.addEventListener('click', handleUploadAreaClick);
    fileInput.addEventListener('change', handleFileSelect);
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    clearAllBtn.addEventListener('click', handleClearAll);
    startConvertBtn.addEventListener('click', handleStartConvert);
    copyBtn.addEventListener('click', handleCopyClick);
    downloadBtn.addEventListener('click', handleDownloadClick);
    saveHistoryBtn.addEventListener('click', handleSaveHistory);
    
    if (downloadBtnModal && copyAnywayBtn && cancelBtn) {
        downloadBtnModal.addEventListener('click', handleDownloadFromModal);
        copyAnywayBtn.addEventListener('click', handleCopyAnywayClick);
        cancelBtn.addEventListener('click', handleCloseCopyModal);
        copyModal.addEventListener('click', function(event) {
            if (event.target === copyModal) handleCloseCopyModal();
        });
    }
    
    historyBtn.addEventListener('click', openHistoryModal);
    closeHistoryBtn.addEventListener('click', closeHistoryModal);
    clearHistoryBtn.addEventListener('click', handleClearHistory);
    exportHistoryBtn.addEventListener('click', handleExportHistory);
    historyModal.addEventListener('click', function(event) {
        if (event.target === historyModal) closeHistoryModal();
    });
    
    helpBtn.addEventListener('click', openHelpModal);
    closeHelpBtn.addEventListener('click', closeHelpModal);
    helpModal.addEventListener('click', function(event) {
        if (event.target === helpModal) closeHelpModal();
    });
    
    document.querySelectorAll('.result-tab').forEach(tab => {
        tab.addEventListener('click', handleTabSwitch);
    });
}

// 处理上传区域点击
function handleUploadAreaClick(event) {
    if (event.target !== fileInput && !event.target.closest('.upload-btn')) {
        if (batchModeCheckbox.checked) {
            fileInput.click();
        }
    }
}

// 处理文件选择
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
        addFilesToQueue(files);
    }
    fileInput.value = '';
}

// 处理拖拽
function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    uploadArea.classList.remove('dragover');
    
    const files = Array.from(event.dataTransfer.files).filter(f => f.name.endsWith('.docx'));
    if (files.length > 0) {
        addFilesToQueue(files);
    } else {
        showError('请上传.docx格式的文件');
    }
}

// 添加文件到队列
function addFilesToQueue(files) {
    files.forEach(file => {
        if (!fileQueue.find(f => f.name === file.name && f.size === file.size)) {
            fileQueue.push({
                file: file,
                name: file.name,
                size: file.size,
                status: 'pending'
            });
        }
    });
    updateFileList();
    hideAllMessages();
}

// 更新文件列表显示
function updateFileList() {
    if (fileQueue.length === 0) {
        fileListSection.style.display = 'none';
        return;
    }
    
    fileListSection.style.display = 'block';
    fileCount.textContent = `${fileQueue.length} 个文件`;
    
    fileList.innerHTML = fileQueue.map((item, index) => `
        <div class="file-item" data-index="${index}">
            <div class="file-item-icon">
                <span class="material-icons">description</span>
            </div>
            <div class="file-item-info">
                <p class="file-item-name">${escapeHtml(item.name)}</p>
                <p class="file-item-size">${formatFileSize(item.size)}</p>
            </div>
            <span class="file-item-status ${item.status}">${getStatusText(item.status)}</span>
            <button class="file-item-remove" data-index="${index}" title="移除">
                <span class="material-icons">close</span>
            </button>
        </div>
    `).join('');
    
    document.querySelectorAll('.file-item-remove').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const index = parseInt(this.dataset.index);
            fileQueue.splice(index, 1);
            updateFileList();
        });
    });
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

// 获取状态文本
function getStatusText(status) {
    const statusMap = {
        pending: '待处理',
        processing: '处理中',
        completed: '已完成',
        error: '失败'
    };
    return statusMap[status] || status;
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 清空列表
function handleClearAll() {
    fileQueue = [];
    updateFileList();
    hideAllMessages();
}

// 开始转换
async function handleStartConvert() {
    if (fileQueue.length === 0) {
        showError('请先添加文件');
        return;
    }
    
    hideAllMessages();
    resultSection.style.display = 'none';
    progressSection.style.display = 'block';
    conversionResults = [];
    
    const total = fileQueue.length;
    let completed = 0;
    
    for (let i = 0; i < fileQueue.length; i++) {
        const item = fileQueue[i];
        item.status = 'processing';
        updateFileList();
        
        updateProgress(0, `正在转换 (${completed + 1}/${total}): ${item.name}`);
        
        try {
            const result = await convertFile(item.file);
            item.status = 'completed';
            item.result = result;
            conversionResults.push({
                name: item.name,
                content: result.text,
                messages: result.messages
            });
            completed++;
            updateProgress((completed / total) * 100, `已完成 ${completed}/${total}`);
        } catch (error) {
            item.status = 'error';
            item.error = error.message;
            completed++;
            showError(`转换 "${item.name}" 失败: ${error.message}`);
        }
        
        updateFileList();
    }
    
    setTimeout(() => {
        progressSection.style.display = 'none';
        if (conversionResults.length > 0) {
            showResults();
        }
    }, 500);
}

// 转换单个文件
function convertFile(file) {
    return new Promise((resolve, reject) => {
        updateProgress(20, '正在读取文件...');
        
        const reader = new FileReader();
        
        reader.onload = function(event) {
            updateProgress(40, '文件读取完成，正在解析内容...');
            
            const arrayBuffer = event.target.result;
            
            setTimeout(() => {
                const format = formatOption.value;
                
                let promise;
                if (format === 'markdown') {
                    promise = mammoth.convertToHtml({arrayBuffer: arrayBuffer})
                        .then(result => ({
                            text: result.value,
                            messages: result.messages
                        }));
                } else {
                    promise = mammoth.extractRawText({arrayBuffer: arrayBuffer})
                        .then(result => ({
                            text: result.value,
                            messages: result.messages
                        }));
                }
                
                promise.then(result => {
                    updateProgress(80, '解析完成，正在处理...');
                    
                    let finalText = result.text;
                    if (format === 'preserve') {
                        finalText = preserveFormatting(finalText);
                    }
                    
                    setTimeout(() => {
                        updateProgress(100, '处理完成');
                        resolve({
                            text: finalText,
                            messages: result.messages
                        });
                    }, 100);
                }).catch(error => {
                    reject(error);
                });
            }, 100);
        };
        
        reader.onerror = function(error) {
            reject(new Error('读取文件失败'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// 保留格式处理
function preserveFormatting(text) {
    return text
        .split('\n\n')
        .map(para => para.trim())
        .filter(para => para.length > 0)
        .join('\n\n');
}

// 更新进度
function updateProgress(percent, text) {
    progressFill.style.width = percent + '%';
    progressPercent.textContent = Math.round(percent) + '%';
    progressDetail.textContent = text || '';
}

// 显示结果
function showResults() {
    if (conversionResults.length === 0) return;
    
    resultSection.style.display = 'block';
    
    if (conversionResults.length === 1) {
        currentTextContent = conversionResults[0].content;
        currentFileName = conversionResults[0].name;
        
        previewContent.textContent = currentTextContent;
        resultMeta.innerHTML = `
            <div class="result-meta-item">
                <span class="material-icons">description</span>
                <span>${escapeHtml(currentFileName)}</span>
            </div>
            <div class="result-meta-item">
                <span class="material-icons">text_fields</span>
                <span>${currentTextContent.length} 字符</span>
            </div>
            <div class="result-meta-item">
                <span class="material-icons">storage</span>
                <span>${formatFileSize(new Blob([currentTextContent]).size)}</span>
            </div>
        `;
        
        const messages = conversionResults[0].messages;
        if (messages && messages.length > 0) {
            detailsContent.innerHTML = `
                <div class="result-details-item">
                    <p class="result-details-label">转换消息:</p>
                    <div class="result-details-value">
                        ${messages.map(m => `<p>[${m.type}] ${escapeHtml(m.message)}</p>`).join('')}
                    </div>
                </div>
            `;
        } else {
            detailsContent.innerHTML = '<p style="color: var(--cli-fg-dim);">无额外信息</p>';
        }
    } else {
        const combinedText = conversionResults.map((r, i) => 
            `=== ${r.name} ===\n\n${r.content}`
        ).join('\n\n');
        
        currentTextContent = combinedText;
        currentFileName = `batch_${Date.now()}`;
        
        previewContent.textContent = combinedText.substring(0, 5000) + (combinedText.length > 5000 ? '\n\n... (内容已截断显示)' : '');
        
        const totalSize = conversionResults.reduce((sum, r) => sum + r.content.length, 0);
        resultMeta.innerHTML = `
            <div class="result-meta-item">
                <span class="material-icons">folder</span>
                <span>${conversionResults.length} 个文件</span>
            </div>
            <div class="result-meta-item">
                <span class="material-icons">text_fields</span>
                <span>${totalSize} 字符</span>
            </div>
        `;
        
        detailsContent.innerHTML = conversionResults.map((r, i) => `
            <div class="result-details-item">
                <p class="result-details-label">文件 ${i + 1}:</p>
                <p class="result-details-value">${escapeHtml(r.name)} - ${r.content.length} 字符</p>
            </div>
        `).join('');
    }
    
    showSuccess(`成功转换 ${conversionResults.length} 个文件`);
}

// 处理Tab切换
function handleTabSwitch(e) {
    const tab = e.target.dataset.tab;
    document.querySelectorAll('.result-tab').forEach(t => t.classList.remove('result-tab-active'));
    e.target.classList.add('result-tab-active');
    
    document.querySelectorAll('.result-content').forEach(c => c.style.display = 'none');
    
    if (tab === 'preview') {
        previewContent.style.display = 'block';
    } else {
        detailsContent.style.display = 'block';
    }
}

// 处理复制按钮点击
function handleCopyClick() {
    if (currentTextContent.length > 65536) {
        modalBody.textContent = `文本大小为 ${(currentTextContent.length / 1024).toFixed(2)} KB，超过64KB可能会导致浏览器卡顿。请选择处理方式：`;
        copyModal.style.display = 'flex';
        return;
    }
    copyToClipboard();
}

// 处理下载按钮点击
function handleDownloadClick() {
    downloadTextFile(currentTextContent, currentFileName);
}

// 从模态框下载
function handleDownloadFromModal() {
    handleCloseCopyModal();
    downloadTextFile(currentTextContent, currentFileName);
}

// 仍然复制
function handleCopyAnywayClick() {
    handleCloseCopyModal();
    copyToClipboard();
}

// 关闭复制模态框
function handleCloseCopyModal() {
    copyModal.style.display = 'none';
}

// 复制到剪贴板
function copyToClipboard() {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(currentTextContent)
            .then(() => showToast('文本已复制到剪贴板', 'success'))
            .catch(err => showError('复制失败: ' + err.message));
    } else {
        const textArea = document.createElement('textarea');
        textArea.value = currentTextContent;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy') ? showToast('文本已复制到剪贴板', 'success') : showError('复制失败');
        } catch (err) {
            showError('复制失败: ' + err.message);
        }
        document.body.removeChild(textArea);
    }
}

// 下载文本文件
function downloadTextFile(text, fileName) {
    const encoding = encodingOption.value;
    let blob;
    
    if (encoding === 'utf8') {
        blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    } else {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(text);
        blob = new Blob([bytes], { type: 'text/plain;charset=' + encoding });
    }
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace('.docx', '.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('文件已开始下载');
}

// 保存历史记录
function handleSaveHistory() {
    if (conversionResults.length === 0) {
        showWarning('没有可保存的结果');
        return;
    }
    
    const history = loadHistoryData();
    
    conversionResults.forEach(result => {
        history.unshift({
            id: Date.now() + Math.random(),
            name: result.name,
            content: result.content,
            messages: result.messages,
            time: new Date().toISOString(),
            size: result.content.length
        });
    });
    
    while (history.length > MAX_HISTORY) {
        history.pop();
    }
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
    showSuccess('已保存到历史记录');
}

// 加载历史数据
function loadHistoryData() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch {
        return [];
    }
}

// 加载历史记录
function loadHistory() {
    const history = loadHistoryData();
    
    if (history.length === 0) {
        historyEmpty.style.display = 'flex';
        historyList.style.display = 'none';
        return;
    }
    
    historyEmpty.style.display = 'none';
    historyList.style.display = 'block';
    
    historyList.innerHTML = history.map((item, index) => `
        <div class="history-item" data-index="${index}">
            <div class="history-item-icon">
                <span class="material-icons">description</span>
            </div>
            <div class="history-item-content">
                <p class="history-item-name">${escapeHtml(item.name)}</p>
                <p class="history-item-time">${formatTime(item.time)} · ${formatFileSize(item.size)}</p>
            </div>
            <div class="history-item-actions">
                <button class="history-item-btn view" data-index="${index}" title="查看">
                    <span class="material-icons">visibility</span>
                </button>
                <button class="history-item-btn download" data-index="${index}" title="下载">
                    <span class="material-icons">download</span>
                </button>
                <button class="history-item-btn delete" data-index="${index}" title="删除">
                    <span class="material-icons">delete</span>
                </button>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.history-item-btn.view').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            viewHistoryItem(history[index]);
        });
    });
    
    document.querySelectorAll('.history-item-btn.download').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            downloadTextFile(history[index].content, history[index].name);
        });
    });
    
    document.querySelectorAll('.history-item-btn.delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            deleteHistoryItem(index);
        });
    });
}

// 格式化时间
function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + ' 天前';
    
    return date.toLocaleDateString('zh-CN');
}

// 查看历史记录项
function viewHistoryItem(item) {
    closeHistoryModal();
    conversionResults = [{ name: item.name, content: item.content, messages: item.messages || [] }];
    showResults();
}

// 删除历史记录项
function deleteHistoryItem(index) {
    const history = loadHistoryData();
    history.splice(index, 1);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
    showSuccess('已删除');
}

// 清空历史记录
function handleClearHistory() {
    if (confirm('确定要清空所有历史记录吗？')) {
        localStorage.removeItem(HISTORY_KEY);
        loadHistory();
        showSuccess('历史记录已清空');
    }
}

// 导出历史记录
function handleExportHistory() {
    const history = loadHistoryData();
    if (history.length === 0) {
        showWarning('没有可导出的历史记录');
        return;
    }
    
    const exportData = history.map(h => 
        `=== ${h.name} ===\n时间: ${h.time}\n\n${h.content}`
    ).join('\n\n' + '='.repeat(50) + '\n\n');
    
    downloadTextFile(exportData, `docx_converter_history_${Date.now()}.txt`);
    showSuccess('已开始导出');
}

// 打开历史记录模态框
function openHistoryModal() {
    loadHistory();
    historyModal.style.display = 'flex';
}

// 关闭历史记录模态框
function closeHistoryModal() {
    historyModal.style.display = 'none';
}

// 打开帮助模态框
function openHelpModal() {
    helpModal.style.display = 'flex';
}

// 关闭帮助模态框
function closeHelpModal() {
    helpModal.style.display = 'none';
}

// 显示消息
function showError(message) {
    showMessage(errorMessage, message);
}

function showSuccess(message) {
    showMessage(successMessage, message);
}

function showWarning(message) {
    showMessage(warningMessage, message);
}

function showInfo(message) {
    showMessage(infoMessage, message);
}

function showMessage(element, message) {
    hideAllMessages();
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

function hideAllMessages() {
    [errorMessage, successMessage, warningMessage, infoMessage].forEach(el => {
        el.style.display = 'none';
    });
}

// 显示Toast
function showToast(message, type = '') {
    const existing = document.getElementById('toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast ' + type;
    toast.innerHTML = `
        <span class="material-icons">${type === 'error' ? 'error' : type === 'success' ? 'check_circle' : 'info'}</span>
        <span>${escapeHtml(message)}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}