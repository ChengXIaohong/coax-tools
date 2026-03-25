// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const sliceByLines = document.getElementById('sliceByLines');
const sliceBySize = document.getElementById('sliceBySize');
const linesOptions = document.getElementById('linesOptions');
const sizeOptions = document.getElementById('sizeOptions');
const linesPerFile = document.getElementById('linesPerFile');
const maxFileSize = document.getElementById('maxFileSize');
const sliceBtn = document.getElementById('sliceBtn');
const resetBtn = document.getElementById('resetBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressPercent = document.getElementById('progressPercent');
const resultSection = document.getElementById('resultSection');
const resultSummary = document.getElementById('resultSummary');
const fileList = document.getElementById('fileList');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');
const downloadSelectedBtn = document.getElementById('downloadSelectedBtn');
const currentYearSpan = document.getElementById('currentYear');

// 区块元素（切片完成后隐藏）
const operationZone = document.querySelector('.operation-zone');
const controlsZone = document.querySelector('.controls-zone');

// 消息元素
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const warningMessage = document.getElementById('warningMessage');
const infoMessage = document.getElementById('infoMessage');

// 文件数据
let uploadedFile = null;
let slicedFiles = [];
let worker = null;

// 初始化年份
if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    if (fileInput) fileInput.addEventListener('change', handleFileUpload);
    if (uploadArea) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
    }
    if (sliceByLines) sliceByLines.addEventListener('change', toggleSliceOptions);
    if (sliceBySize) sliceBySize.addEventListener('change', toggleSliceOptions);
    if (sliceBtn) sliceBtn.addEventListener('click', sliceFile);
    if (resetBtn) resetBtn.addEventListener('click', resetAll);
    if (selectAllBtn) selectAllBtn.addEventListener('click', selectAll);
    if (deselectAllBtn) deselectAllBtn.addEventListener('click', deselectAll);
    if (downloadSelectedBtn) downloadSelectedBtn.addEventListener('click', downloadSelected);
});

// 切换切片选项
function toggleSliceOptions() {
    if (sliceByLines && sliceByLines.checked) {
        if (linesOptions) linesOptions.classList.add('active');
        if (sizeOptions) sizeOptions.classList.remove('active');
    } else {
        if (linesOptions) linesOptions.classList.remove('active');
        if (sizeOptions) sizeOptions.classList.add('active');
    }
}

// 处理文件上传
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        processFile(file);
    }
}

// 处理拖拽事件
function handleDragOver(event) {
    event.preventDefault();
    if (uploadArea) uploadArea.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    if (uploadArea) uploadArea.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    if (uploadArea) uploadArea.classList.remove('dragover');

    const files = event.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

// 处理文件
function processFile(file) {
    if (!isTextFile(file)) {
        showMessage('请选择文本文件 (.txt, .log, .csv)', 'error');
        return;
    }

    uploadedFile = file;

    if (fileInfo) fileInfo.textContent = file.name + ' (' + formatFileSize(file.size) + ')';
    showMessage('已选择文件: ' + file.name, 'info');
}

// 检查是否为文本文件
function isTextFile(file) {
    const validTypes = ['text/plain', 'text/csv'];
    const validExtensions = ['.txt', '.log', '.csv'];
    const fileName = file.name.toLowerCase();

    if (validTypes.includes(file.type)) {
        return true;
    }

    for (const ext of validExtensions) {
        if (fileName.endsWith(ext)) {
            return true;
        }
    }

    return false;
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 切片文件
function sliceFile() {
    if (!uploadedFile) {
        showMessage('请先选择要切片的文件', 'error');
        return;
    }

    const method = sliceByLines.checked ? 'lines' : 'size';
    const param = method === 'lines' ? parseInt(linesPerFile.value) : parseInt(maxFileSize.value) * 1024;

    if (isNaN(param) || param <= 0) {
        showMessage('请输入有效的切片参数', 'error');
        return;
    }

    if (progressSection) progressSection.style.display = 'block';
    if (progressFill) progressFill.style.width = '0%';
    if (progressPercent) progressPercent.textContent = '0%';
    if (resultSection) resultSection.style.display = 'none';

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            performSlicingWithWorker(content, method, param);
        } catch (error) {
            showMessage('处理文件时出错: ' + error.message, 'error');
            if (progressSection) progressSection.style.display = 'none';
        }
    };
    reader.onerror = function() {
        showMessage('读取文件时出错', 'error');
        if (progressSection) progressSection.style.display = 'none';
    };
    reader.readAsText(uploadedFile, 'UTF-8');
}

// 使用Web Worker执行切片操作
function performSlicingWithWorker(content, method, param) {
    if (worker) {
        worker.terminate();
    }

    worker = new Worker('../js/text-slicer-worker.js');

    worker.onmessage = function(e) {
        if (e.data.progress !== undefined) {
            const progress = Math.round(e.data.progress);
            if (progressFill) progressFill.style.width = progress + '%';
            if (progressPercent) progressPercent.textContent = progress + '%';
        } else if (e.data.success !== undefined) {
            if (e.data.success) {
                slicedFiles = e.data.slicedFiles.map(file => {
                    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
                    return {
                        name: file.name,
                        blob: blob,
                        size: file.size
                    };
                });

                displayResults();

                if (progressFill) progressFill.style.width = '100%';
                if (progressPercent) progressPercent.textContent = '100%';
                showMessage('文件切片完成！', 'success');
            } else {
                showMessage('切片过程中出错: ' + e.data.error, 'error');
                if (progressSection) progressSection.style.display = 'none';
            }

            worker.terminate();
            worker = null;
        }
    };

    worker.onerror = function(error) {
        showMessage('切片过程中出错: ' + error.message, 'error');
        if (progressSection) progressSection.style.display = 'none';
        worker.terminate();
        worker = null;
    };

    worker.postMessage({
        content: content,
        method: method,
        param: param,
        fileName: uploadedFile.name
    });
}

// 显示结果
function displayResults() {
    // 隐藏操作区、控制区、进度区
    if (operationZone) operationZone.style.display = 'none';
    if (controlsZone) controlsZone.style.display = 'none';
    if (progressSection) progressSection.style.display = 'none';
    if (resultSection) resultSection.style.display = 'block';

    if (slicedFiles.length === 0) {
        if (fileList) fileList.innerHTML = '<div class="result-empty">没有生成切片文件</div>';
        return;
    }

    const totalSize = slicedFiles.reduce((sum, f) => sum + f.size, 0);
    if (resultSummary) {
        resultSummary.textContent = '共生成 ' + slicedFiles.length + ' 个切片文件，原始文件：' + uploadedFile.name;
    }

    let html = '';
    slicedFiles.forEach((file, index) => {
        const fileUrl = URL.createObjectURL(file.blob);
        html += `
            <div class="file-item">
                <label class="file-item-select">
                    <input type="checkbox" data-index="${index}">
                    <span>${file.name}</span>
                </label>
                <div class="file-item-info">
                    <p class="file-item-name">${formatFileSize(file.size)}</p>
                </div>
                <a href="${fileUrl}" download="${file.name}" class="file-item-download">
                    <span class="material-icons" style="font-size:0.9rem;">download</span>
                    下载
                </a>
            </div>
        `;
    });

    if (fileList) fileList.innerHTML = html;
}

// 全选
function selectAll() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][data-index]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
}

// 取消全选
function deselectAll() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][data-index]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
}

// 下载选中文件
function downloadSelected() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][data-index]:checked');

    if (checkboxes.length === 0) {
        showMessage('请至少选择一个文件进行下载', 'error');
        return;
    }

    checkboxes.forEach(checkbox => {
        const index = parseInt(checkbox.getAttribute('data-index'));
        const file = slicedFiles[index];

        if (file) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(file.blob);
            link.download = file.name;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });

    showMessage('开始下载 ' + checkboxes.length + ' 个文件', 'success');
}

// 重置所有
function resetAll() {
    uploadedFile = null;
    slicedFiles = [];

    if (worker) {
        worker.terminate();
        worker = null;
    }

    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.textContent = '';
    if (linesPerFile) linesPerFile.value = '1000';
    if (maxFileSize) maxFileSize.value = '1024';
    if (sliceByLines) sliceByLines.checked = true;
    toggleSliceOptions();

    if (progressSection) progressSection.style.display = 'none';
    if (progressFill) progressFill.style.width = '0%';
    if (progressPercent) progressPercent.textContent = '0%';
    if (resultSection) resultSection.style.display = 'none';
    if (operationZone) operationZone.style.display = '';
    if (controlsZone) controlsZone.style.display = '';

    clearMessages();
    showMessage('已重置所有内容', 'info');
}

// 显示消息
function showMessage(text, type) {
    clearMessages();

    let msgEl;
    switch (type) {
        case 'error':
            msgEl = errorMessage;
            break;
        case 'success':
            msgEl = successMessage;
            break;
        case 'warning':
            msgEl = warningMessage;
            break;
        case 'info':
        default:
            msgEl = infoMessage;
            break;
    }

    if (msgEl) {
        msgEl.textContent = text;
        msgEl.style.display = 'block';
        setTimeout(function() {
            msgEl.style.display = 'none';
        }, 3000);
    }
}

// 清除所有消息
function clearMessages() {
    if (errorMessage) errorMessage.style.display = 'none';
    if (successMessage) successMessage.style.display = 'none';
    if (warningMessage) warningMessage.style.display = 'none';
    if (infoMessage) infoMessage.style.display = 'none';
}
