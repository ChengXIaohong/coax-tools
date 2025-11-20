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
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const fileList = document.getElementById('fileList');
const messageDiv = document.getElementById('message');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');
const downloadSelectedBtn = document.getElementById('downloadSelectedBtn');
const currentYearSpan = document.getElementById('currentYear');

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
    // 绑定事件监听器
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
    
    // 隐藏进度条
    if (progressContainer) progressContainer.style.display = 'none';
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
    // 检查文件类型
    if (!isTextFile(file)) {
        showMessage('请选择文本文件 (.txt, .log, .csv)', 'error');
        return;
    }
    
    // 保存文件信息
    uploadedFile = file;
    
    // 显示文件信息
    if (fileInfo) fileInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
    showMessage(`已选择文件: ${file.name}`, 'info');
}

// 检查是否为文本文件
function isTextFile(file) {
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
    
    // 获取切片参数
    const method = sliceByLines.checked ? 'lines' : 'size';
    const param = method === 'lines' ? parseInt(linesPerFile.value) : parseInt(maxFileSize.value) * 1024;
    
    // 验证参数
    if (isNaN(param) || param <= 0) {
        showMessage('请输入有效的切片参数', 'error');
        return;
    }
    
    // 显示进度条
    if (progressContainer) progressContainer.style.display = 'block';
    if (progressFill) progressFill.style.width = '0%';
    if (fileList) fileList.innerHTML = '<p>正在处理文件...</p>';
    
    // 读取文件内容
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            performSlicingWithWorker(content, method, param);
        } catch (error) {
            showMessage('处理文件时出错: ' + error.message, 'error');
            if (progressContainer) progressContainer.style.display = 'none';
        }
    };
    reader.onerror = function() {
        showMessage('读取文件时出错', 'error');
        if (progressContainer) progressContainer.style.display = 'none';
    };
    reader.readAsText(uploadedFile, 'UTF-8');
}

// 使用Web Worker执行切片操作
function performSlicingWithWorker(content, method, param) {
    // 如果已有Worker在运行，先终止它
    if (worker) {
        worker.terminate();
    }
    
    // 创建新的Worker
    worker = new Worker('../js/text-slicer-worker.js');
    
    // 监听Worker消息
    worker.onmessage = function(e) {
        if (e.data.progress !== undefined) {
            // 更新进度
            if (progressFill) progressFill.style.width = e.data.progress + '%';
        } else if (e.data.success !== undefined) {
            // 处理完成
            if (e.data.success) {
                // 转换Worker返回的数据为Blob对象
                slicedFiles = e.data.slicedFiles.map(file => {
                    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
                    return {
                        name: file.name,
                        blob: blob,
                        size: file.size
                    };
                });
                
                // 显示结果
                displayResults();
                
                // 完成进度
                if (progressFill) progressFill.style.width = '100%';
                showMessage('文件切片完成!', 'success');
            } else {
                showMessage('切片过程中出错: ' + e.data.error, 'error');
                if (progressContainer) progressContainer.style.display = 'none';
            }
            
            // 清理Worker
            worker.terminate();
            worker = null;
        }
    };
    
    // 监听Worker错误
    worker.onerror = function(error) {
        showMessage('切片过程中出错: ' + error.message, 'error');
        if (progressContainer) progressContainer.style.display = 'none';
        worker.terminate();
        worker = null;
    };
    
    // 向Worker发送数据
    worker.postMessage({
        content: content,
        method: method,
        param: param,
        fileName: uploadedFile.name
    });
}

// 按行数切片
function sliceByLinesMethod(lines, linesPerFile) {
    slicedFiles = [];
    const totalLines = lines.length;
    const totalFiles = Math.ceil(totalLines / linesPerFile);
    
    for (let i = 0; i < totalFiles; i++) {
        // 计算进度
        const progress = ((i + 1) / totalFiles) * 100;
        if (progressFill) progressFill.style.width = progress + '%';
        
        // 获取当前文件的行
        const start = i * linesPerFile;
        const end = Math.min(start + linesPerFile, totalLines);
        const fileLines = lines.slice(start, end);
        
        // 创建文件内容
        const fileContent = fileLines.join('\n');
        
        // 创建文件对象
        const fileName = `${uploadedFile.name.replace(/\.[^/.]+$/, "")}_part${i + 1}.txt`;
        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        
        slicedFiles.push({
            name: fileName,
            blob: blob,
            size: blob.size
        });
    }
}

// 按大小切片
function sliceBySizeMethod(lines, maxSize) {
    slicedFiles = [];
    let currentFileLines = [];
    let currentFileSize = 0;
    let fileIndex = 1;
    
    for (let i = 0; i < lines.length; i++) {
        // 计算当前行的大小（近似）
        const lineSize = new Blob([lines[i] + '\n']).size;
        
        // 如果加上当前行会超过最大大小，或者这是最后一行
        if (currentFileSize + lineSize > maxSize && currentFileLines.length > 0) {
            // 保存当前文件
            const fileContent = currentFileLines.join('\n');
            const fileName = `${uploadedFile.name.replace(/\.[^/.]+$/, "")}_part${fileIndex}.txt`;
            const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
            
            slicedFiles.push({
                name: fileName,
                blob: blob,
                size: blob.size
            });
            
            // 重置当前文件
            currentFileLines = [];
            currentFileSize = 0;
            fileIndex++;
        }
        
        // 添加当前行到当前文件
        currentFileLines.push(lines[i]);
        currentFileSize += lineSize;
        
        // 更新进度
        const progress = ((i + 1) / lines.length) * 100;
        if (progressFill) progressFill.style.width = progress + '%';
    }
    
    // 保存最后一个文件（如果有内容）
    if (currentFileLines.length > 0) {
        const fileContent = currentFileLines.join('\n');
        const fileName = `${uploadedFile.name.replace(/\.[^/.]+$/, "")}_part${fileIndex}.txt`;
        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        
        slicedFiles.push({
            name: fileName,
            blob: blob,
            size: blob.size
        });
    }
}

// 显示结果
function displayResults() {
    if (slicedFiles.length === 0) {
        if (fileList) fileList.innerHTML = '<p>没有生成切片文件</p>';
        return;
    }
    
    let html = `<div class="select-controls">
                    <button id="selectAllBtn">全选</button>
                    <button id="deselectAllBtn">取消全选</button>
                    <button id="downloadSelectedBtn">下载选中</button>
                </div>
                <p>共生成 ${slicedFiles.length} 个切片文件:</p>`;
    
    slicedFiles.forEach((file, index) => {
        const fileUrl = URL.createObjectURL(file.blob);
        html += `
            <div class="file-item">
                <label class="checkbox-item">
                    <input type="checkbox" data-index="${index}">
                    <span>${file.name} (${formatFileSize(file.size)})</span>
                </label>
                <a href="${fileUrl}" download="${file.name}" class="download-btn">下载</a>
            </div>
        `;
    });
    
    if (fileList) fileList.innerHTML = html;
    
    // 重新绑定按钮事件
    document.getElementById('selectAllBtn').addEventListener('click', selectAll);
    document.getElementById('deselectAllBtn').addEventListener('click', deselectAll);
    document.getElementById('downloadSelectedBtn').addEventListener('click', downloadSelected);
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
    
    // 批量下载所有选中的文件
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
    
    showMessage(`开始下载 ${checkboxes.length} 个文件`, 'success');
}

// 重置所有
function resetAll() {
    // 重置文件
    uploadedFile = null;
    slicedFiles = [];
    
    // 如果有Worker在运行，终止它
    if (worker) {
        worker.terminate();
        worker = null;
    }
    
    // 重置表单
    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.textContent = '';
    if (linesPerFile) linesPerFile.value = '1000';
    if (maxFileSize) maxFileSize.value = '1024';
    if (sliceByLines) sliceByLines.checked = true;
    toggleSliceOptions();
    
    // 重置界面
    if (progressContainer) progressContainer.style.display = 'none';
    if (progressFill) progressFill.style.width = '0%';
    if (fileList) fileList.innerHTML = '<p>切片完成后，文件列表将显示在此处</p>';
    if (messageDiv) {
        messageDiv.className = 'message';
        messageDiv.textContent = '';
    }
    
    showMessage('已重置所有内容', 'info');
}

// 显示消息
function showMessage(text, type) {
    if (messageDiv) {
        messageDiv.textContent = text;
        messageDiv.className = 'message ' + type;
    }
}