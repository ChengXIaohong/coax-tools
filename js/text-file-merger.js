// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const fileListContainer = document.getElementById('fileListContainer');
const fileCount = document.getElementById('fileCount');
const clearAllBtn = document.getElementById('clearAllBtn');
const separatorSelect = document.getElementById('separator');
const fileNameInput = document.getElementById('fileName');
const mergeBtn = document.getElementById('mergeBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const currentYearSpan = document.getElementById('currentYear');

// 存储选择的文件
let selectedFiles = [];

// 初始化年份
currentYearSpan.textContent = new Date().getFullYear();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 绑定事件监听器
    uploadArea.addEventListener('click', handleUploadAreaClick);
    fileInput.addEventListener('change', handleFileSelect);
    clearAllBtn.addEventListener('click', clearAllFiles);
    mergeBtn.addEventListener('click', mergeFiles);
    
    // 拖拽上传功能
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
});

// 处理上传区域点击事件
function handleUploadAreaClick(event) {
    const fileLabel = document.getElementById('fileLabel');
    // 防止点击label时重复触发
    if (event.target !== fileLabel) {
        fileInput.click();
    }
}

// 处理文件选择
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        // 检查是否为文本文件（根据文件类型或扩展名）
        const textFiles = Array.from(files).filter(file => {
            // 检查 MIME 类型是否为文本类型
            if (file.type.startsWith('text/')) {
                return true;
            }
            // 检查文件扩展名是否为常见的文本文件格式
            const textExtensions = ['.txt', '.json', '.log', '.yaml', '.yml', '.ini', '.toml', '.csv', '.md', '.xml', '.conf', '.cfg', '.properties', '.env', '.sql', '.sh', '.bat', '.cmd', '.ps1'];
            const fileName = file.name.toLowerCase();
            return textExtensions.some(ext => fileName.endsWith(ext));
        });
        
        if (textFiles.length > 0) {
            addFiles(textFiles);
        } else {
            showError('请选择有效的文本文件 (txt, json, log, yaml, ini, toml, csv, md 等)');
        }
    }
}

// 处理拖拽事件
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        // 检查是否为文本文件（根据文件类型或扩展名）
        const textFiles = Array.from(files).filter(file => {
            // 检查 MIME 类型是否为文本类型
            if (file.type.startsWith('text/')) {
                return true;
            }
            // 检查文件扩展名是否为常见的文本文件格式
            const textExtensions = ['.txt', '.json', '.log', '.yaml', '.yml', '.ini', '.toml', '.csv', '.md', '.xml', '.conf', '.cfg', '.properties', '.env', '.sql', '.sh', '.bat', '.cmd', '.ps1'];
            const fileName = file.name.toLowerCase();
            return textExtensions.some(ext => fileName.endsWith(ext));
        });
        
        if (textFiles.length > 0) {
            addFiles(textFiles);
        } else {
            showError('请选择有效的文本文件 (txt, json, log, yaml, ini, toml, csv, md 等)');
        }
    }
}

// 添加文件到列表
function addFiles(files) {
    files.forEach(file => {
        // 检查是否已经添加了该文件
        if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
            selectedFiles.push(file);
        }
    });
    
    updateFileList();
}

// 更新文件列表显示
function updateFileList() {
    // 清空当前列表
    fileList.innerHTML = '';
    
    // 更新文件计数
    fileCount.textContent = selectedFiles.length;
    
    if (selectedFiles.length > 0) {
        fileListContainer.style.display = 'block';
        
        // 添加文件到列表
        selectedFiles.forEach((file, index) => {
            const li = document.createElement('li');
            
            const fileNameSpan = document.createElement('span');
            fileNameSpan.className = 'file-name';
            fileNameSpan.textContent = file.name;
            
            const fileSizeSpan = document.createElement('span');
            fileSizeSpan.className = 'file-size';
            fileSizeSpan.textContent = formatFileSize(file.size);
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = '删除';
            removeBtn.onclick = () => removeFile(index);
            
            li.appendChild(fileNameSpan);
            li.appendChild(fileSizeSpan);
            li.appendChild(removeBtn);
            
            fileList.appendChild(li);
        });
    } else {
        fileListContainer.style.display = 'none';
    }
    
    // 控制合并按钮状态：只有选择了超过一个文件才启用
    mergeBtn.disabled = selectedFiles.length < 2;
}

// 移除单个文件
function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
}

// 清空所有文件
function clearAllFiles() {
    selectedFiles = [];
    updateFileList();
}

// 合并文件
async function mergeFiles() {
    if (selectedFiles.length === 0) {
        showError('请先选择要合并的文件');
        return;
    }
    
    // 显示加载状态
    loading.style.display = 'block';
    mergeBtn.disabled = true;
    hideMessage();
    
    try {
        // 获取分隔符
        let separator = separatorSelect.value;
        // 替换转义字符
        separator = separator.replace('\\n', '\n');
        
        // 获取输出文件名
        const outputFileName = fileNameInput.value || 'merged-text-file.txt';
        
        // 读取所有文件内容
        const fileContents = [];
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const content = await readFileAsText(file);
            fileContents.push(content);
            
            // 更新进度
            const progress = Math.round(((i + 1) / selectedFiles.length) * 100);
            updateProgress(progress, `正在处理文件 ${i + 1}/${selectedFiles.length}`);
        }
        
        // 合并文件内容
        updateProgress(100, '正在合并文件...');
        let mergedContent = '';
        if (separator === '') {
            // 无分隔符
            mergedContent = fileContents.join('');
        } else {
            // 使用指定分隔符
            mergedContent = fileContents.join(separator);
        }
        
        // 创建并下载文件
        downloadFile(mergedContent, outputFileName);
        
        showSuccess(`文件合并成功！已保存为 "${outputFileName}"`);
    } catch (error) {
        console.error('合并文件时出错:', error);
        showError('合并文件时出错: ' + error.message);
    } finally {
        // 恢复按钮状态
        loading.style.display = 'none';
        mergeBtn.disabled = false;
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 2000);
    }
}

// 读取文件内容
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error(`无法读取文件: ${file.name}`));
        reader.readAsText(file, 'UTF-8');
    });
}

// 下载文件
function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // 清理
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// 更新进度条
function updateProgress(percent, text) {
    progressContainer.style.display = 'block';
    progressFill.style.width = percent + '%';
    progressText.textContent = text;
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 显示错误消息
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
}

// 显示成功消息
function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
}

// 隐藏所有消息
function hideMessage() {
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
}