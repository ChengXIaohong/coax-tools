// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const previewContainer = document.getElementById('previewContainer');
const previewContent = document.getElementById('previewContent');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const loading = document.getElementById('loading');
const copyBtn = document.getElementById('copyBtn');
const currentYearSpan = document.getElementById('currentYear');
const fileLabel = document.getElementById('fileLabel');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

// 模态框相关元素
let copyModal, modalBody, downloadBtn, copyAnywayBtn, cancelBtn;

// 存储当前文本内容
let currentTextContent = '';

// 初始化年份
currentYearSpan.textContent = new Date().getFullYear();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 获取模态框相关元素
    copyModal = document.getElementById('copyModal');
    modalBody = document.getElementById('modalBody');
    downloadBtn = document.getElementById('downloadBtn');
    copyAnywayBtn = document.getElementById('copyAnywayBtn');
    cancelBtn = document.getElementById('cancelBtn');
    
    // 添加事件监听器
    uploadArea.addEventListener('click', handleUploadAreaClick);
    fileInput.addEventListener('change', handleFileSelect);
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    copyBtn.addEventListener('click', handleCopyClick);
    
    // 模态框按钮事件监听器
    if (downloadBtn && copyAnywayBtn && cancelBtn) {
        downloadBtn.addEventListener('click', handleDownloadClick);
        copyAnywayBtn.addEventListener('click', handleCopyAnywayClick);
        cancelBtn.addEventListener('click', handleCloseModal);
        
        // 点击模态框外部关闭
        copyModal.addEventListener('click', function(event) {
            if (event.target === copyModal) {
                handleCloseModal();
            }
        });
    }
    
    // 隐藏预览容器
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
});

// 处理上传区域点击事件
function handleUploadAreaClick(event) {
    // 防止点击label时重复触发
    if (event.target !== fileLabel) {
        fileInput.click();
    }
}

// 处理文件选择
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processFile(file);
    }
}

// 处理拖拽事件
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
    
    const file = event.dataTransfer.files[0];
    if (file && file.name.endsWith('.docx')) {
        processFile(file);
    } else {
        showError('请上传.docx格式的文件');
    }
}

// 处理复制按钮点击事件
function handleCopyClick() {
    // 检查文本大小
    if (currentTextContent.length > 65536) { // 64KB
        // 显示模态框
        const sizeInKB = (currentTextContent.length / 1024).toFixed(2);
        modalBody.textContent = `文本大小为 ${sizeInKB} KB，超过64KB可能会导致浏览器卡顿。请选择处理方式：`;
        copyModal.style.display = 'block';
        return;
    }
    
    // 直接复制到剪贴板
    copyToClipboard();
}

// 处理下载按钮点击事件
function handleDownloadClick() {
    handleCloseModal();
    downloadTextFile(currentTextContent);
}

// 处理仍然复制按钮点击事件
function handleCopyAnywayClick() {
    handleCloseModal();
    copyToClipboard();
}

// 关闭模态框
function handleCloseModal() {
    copyModal.style.display = 'none';
}

// 处理文件
function processFile(file) {
    // 显示文件信息
    fileInfo.innerHTML = `已选择文件: ${file.name}<br>文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    fileInfo.style.display = 'block';
    
    // 隐藏之前的结果和消息
    hideMessages();
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
    
    // 检查文件类型
    if (!file.name.endsWith('.docx')) {
        showError('仅支持.docx格式的文件');
        return;
    }
    
    // 显示进度条
    if (progressContainer) {
        progressContainer.style.display = 'block';
    }
    updateProgress(0, '开始处理文件...');
    
    // 对大文件显示警告
    if (file.size > 5 * 1024 * 1024) { // 大于5MB
        updateProgress(10, '检测到大文件，处理可能需要一些时间...');
    }
    
    // 使用setTimeout让UI有时间更新
    setTimeout(() => {
        convertFile(file);
    }, 100);
}

// 更新进度
function updateProgress(percent, text) {
    if (progressFill) {
        progressFill.style.width = percent + '%';
    }
    if (progressText) {
        progressText.textContent = text;
    }
}

// 转换文件
function convertFile(file) {
    updateProgress(20, '正在读取文件...');
    
    const reader = new FileReader();
    
    reader.onload = function(event) {
        updateProgress(40, '文件读取完成，正在解析内容...');
        
        const arrayBuffer = event.target.result;
        
        // 使用setTimeout让UI有时间更新
        setTimeout(() => {
            // 使用extractRawText方法提取纯文本内容
            mammoth.extractRawText({arrayBuffer: arrayBuffer})
                .then(function(result) {
                    updateProgress(80, '解析完成，正在生成结果...');
                    
                    // 使用setTimeout让UI有时间更新
                    setTimeout(() => {
                        // 显示结果
                        showResult(result.value, result.messages);
                        updateProgress(100, '处理完成!');
                        
                        // 1秒后隐藏进度条
                        setTimeout(() => {
                            if (progressContainer) {
                                progressContainer.style.display = 'none';
                            }
                        }, 1000);
                    }, 100);
                })
                .catch(function(error) {
                    // 隐藏进度条
                    if (progressContainer) {
                        progressContainer.style.display = 'none';
                    }
                    
                    // 显示错误
                    showError('转换过程中发生错误: ' + error.message);
                });
        }, 100);
    };
    
    reader.onerror = function(error) {
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        showError('读取文件时发生错误: ' + error.message);
    };
    
    reader.readAsArrayBuffer(file);
}

// 显示转换结果
function showResult(text, messages) {
    // 存储当前文本内容
    currentTextContent = text;
    
    // 显示文本内容
    if (previewContent) {
        previewContent.textContent = text;
    }
    if (previewContainer) {
        previewContainer.style.display = 'block';
    }
    
    // 显示成功消息
    if (successMessage) {
        successMessage.textContent = '文件转换成功!';
        successMessage.style.display = 'block';
    }
    
    // 如果有警告或错误消息，显示它们
    if (messages && messages.length > 0) {
        const messageText = messages.map(msg => `${msg.type}: ${msg.message}`).join('\n');
        showError('转换消息:\n' + messageText);
    }
    
    // 如果文本很大，提示用户
    if (text.length > 65536) { // 64KB
        showWarning(`转换后的文本较大(${(text.length / 1024).toFixed(2)} KB)，点击"复制文本"按钮时将提示您选择下载或直接复制。`);
    }
}

// 显示警告消息
function showWarning(message) {
    if (!successMessage) return;
    
    const warningMessage = document.createElement('div');
    warningMessage.className = 'message warning-message';
    warningMessage.textContent = message;
    warningMessage.style.display = 'block';
    warningMessage.style.background = '#fff3cd';
    warningMessage.style.color = '#856404';
    warningMessage.style.border = '1px solid #ffeaa7';
    
    // 插入到successMessage之后
    successMessage.parentNode.insertBefore(warningMessage, successMessage.nextSibling);
    
    // 5秒后自动隐藏
    setTimeout(() => {
        if (warningMessage.parentNode) {
            warningMessage.parentNode.removeChild(warningMessage);
        }
    }, 5000);
}

// 显示错误消息
function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

// 隐藏所有消息
function hideMessages() {
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
    if (successMessage) {
        successMessage.style.display = 'none';
    }
    
    // 移除所有警告消息
    const warningMessages = document.querySelectorAll('.warning-message');
    warningMessages.forEach(msg => {
        if (msg.parentNode) {
            msg.parentNode.removeChild(msg);
        }
    });
}

// 复制文本到剪贴板
function copyToClipboard() {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(currentTextContent)
            .then(() => {
                showCopyToast('文本已复制到剪贴板');
            })
            .catch(err => {
                showError('复制失败: ' + err);
            });
    } else {
        // 降级处理
        const textArea = document.createElement('textarea');
        textArea.value = currentTextContent;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showCopyToast('文本已复制到剪贴板');
            } else {
                showError('复制失败');
            }
        } catch (err) {
            showError('复制失败: ' + err);
        }
        
        document.body.removeChild(textArea);
    }
}

// 下载文本文件
function downloadTextFile(text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'converted-text.txt';
    document.body.appendChild(link);
    link.click();
    
    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showCopyToast('文本文件已开始下载');
}

// 显示复制提示（Toast）
function showCopyToast(message) {
    // 移除已存在的提示
    const existingToast = document.getElementById('copyToast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // 创建新的提示
    const toast = document.createElement('div');
    toast.id = 'copyToast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 10000;
        font-size: 14px;
        animation: fadeInOut 2s ease-in-out forwards;
    `;
    
    // 添加淡入淡出动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-20px); }
            20% { opacity: 1; transform: translateY(0); }
            80% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-20px); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(toast);
    
    // 2秒后自动移除
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        }
    }, 2000);
}