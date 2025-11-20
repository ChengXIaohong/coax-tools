// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const originalPreview = document.getElementById('originalPreview');
const compressedPreview = document.getElementById('compressedPreview');
const originalInfo = document.getElementById('originalInfo');
const compressedInfo = document.getElementById('compressedInfo');
const fileInfo = document.getElementById('fileInfo');
const qualitySlider = document.getElementById('quality');
const qualityValue = document.getElementById('qualityValue');
const widthSlider = document.getElementById('maxWidth');
const widthValue = document.getElementById('widthValue');
const compressBtn = document.getElementById('compressBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const messageDiv = document.getElementById('message');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const currentYearSpan = document.getElementById('currentYear');

// 图片数据
let originalImage = null;
let originalFile = null;
let compressedBlob = null;

// 初始化年份
currentYearSpan.textContent = new Date().getFullYear();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 绑定事件监听器
    imageInput.addEventListener('change', handleImageUpload);
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    qualitySlider.addEventListener('input', updateQualityValue);
    widthSlider.addEventListener('input', updateWidthValue);
    compressBtn.addEventListener('click', compressImage);
    downloadBtn.addEventListener('click', downloadImage);
    resetBtn.addEventListener('click', resetAll);
    
    // 初始化滑块值显示
    updateQualityValue();
    updateWidthValue();
});

// 更新质量滑块值显示
function updateQualityValue() {
    qualityValue.textContent = qualitySlider.value + '%';
}

// 更新宽度滑块值显示
function updateWidthValue() {
    widthValue.textContent = widthSlider.value + 'px';
}

// 处理图片上传
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        processImageFile(file);
    }
}

// 处理拖拽悬停
function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}

// 处理拖拽离开
function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
}

// 处理拖拽放置
function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const file = event.dataTransfer.files[0];
    if (file && isImageFile(file)) {
        processImageFile(file);
    } else {
        showMessage('请上传有效的图片文件 (JPG, PNG, WEBP)', 'error');
    }
}

// 检查是否为图片文件
function isImageFile(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return validTypes.includes(file.type);
}

// 处理图片文件
function processImageFile(file) {
    if (!isImageFile(file)) {
        showMessage('请上传有效的图片文件 (JPG, PNG, WEBP)', 'error');
        return;
    }
    
    // 保存原始文件
    originalFile = file;
    
    // 显示文件信息
    fileInfo.textContent = `文件名: ${file.name} | 大小: ${formatFileSize(file.size)}`;
    
    // 读取图片
    const reader = new FileReader();
    reader.onload = function(e) {
        originalImage = new Image();
        originalImage.onload = function() {
            // 显示原始图片预览
            originalPreview.src = e.target.result;
            originalPreview.style.display = 'block';
            
            // 显示原始图片信息
            originalInfo.innerHTML = `
                <p>尺寸: ${originalImage.width} × ${originalImage.height}</p>
                <p>文件大小: ${formatFileSize(file.size)}</p>
                <p>类型: ${file.type.split('/')[1].toUpperCase()}</p>
            `;
            
            // 隐藏压缩图片信息
            compressedPreview.style.display = 'none';
            compressedInfo.innerHTML = '<p>请先压缩图片</p>';
            downloadBtn.style.display = 'none';
            
            showMessage('图片上传成功!', 'success');
        };
        originalImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 压缩图片
function compressImage() {
    if (!originalImage) {
        showMessage('请先上传图片', 'error');
        return;
    }
    
    // 显示进度条
    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    
    // 模拟处理过程
    simulateProgress();
    
    try {
        // 创建 canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 计算新尺寸
        const maxWidth = parseInt(widthSlider.value);
        let { width, height } = calculateDimensions(originalImage.width, originalImage.height, maxWidth);
        
        // 设置 canvas 尺寸
        canvas.width = width;
        canvas.height = height;
        
        // 在 canvas 上绘制图片
        ctx.drawImage(originalImage, 0, 0, width, height);
        
        // 获取质量值
        const quality = parseInt(qualitySlider.value) / 100;
        
        // 导出为 blob
        canvas.toBlob(function(blob) {
            compressedBlob = blob;
            
            // 显示压缩后的图片
            const compressedUrl = URL.createObjectURL(blob);
            compressedPreview.src = compressedUrl;
            compressedPreview.style.display = 'block';
            
            // 显示压缩后图片信息
            compressedInfo.innerHTML = `
                <p>尺寸: ${width} × ${height}</p>
                <p>文件大小: ${formatFileSize(blob.size)}</p>
                <p>压缩率: ${calculateCompressionRatio(originalFile.size, blob.size)}</p>
            `;
            
            // 显示下载按钮
            downloadBtn.href = compressedUrl;
            downloadBtn.style.display = 'inline-block';
            
            // 隐藏进度条
            progressContainer.style.display = 'none';
            
            showMessage('图片压缩完成!', 'success');
        }, 'image/jpeg', quality);
    } catch (error) {
        // 隐藏进度条
        progressContainer.style.display = 'none';
        showMessage('图片压缩失败: ' + error.message, 'error');
    }
}

// 计算新尺寸
function calculateDimensions(originalWidth, originalHeight, maxWidth) {
    if (originalWidth <= maxWidth) {
        return { width: originalWidth, height: originalHeight };
    }
    
    const ratio = originalHeight / originalWidth;
    const width = maxWidth;
    const height = Math.round(width * ratio);
    
    return { width, height };
}

// 计算压缩率
function calculateCompressionRatio(originalSize, compressedSize) {
    const ratio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    return ratio + '%';
}

// 模拟进度条
function simulateProgress() {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
        }
        progressFill.style.width = progress + '%';
    }, 100);
}

// 下载图片
function downloadImage() {
    if (!compressedBlob) {
        showMessage('没有可下载的图片', 'error');
        return;
    }
    
    // 创建下载链接
    const link = document.createElement('a');
    link.href = URL.createObjectURL(compressedBlob);
    link.download = 'compressed-image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('图片下载开始!', 'success');
}

// 重置所有
function resetAll() {
    // 重置文件输入
    imageInput.value = '';
    
    // 重置预览
    originalPreview.style.display = 'none';
    compressedPreview.style.display = 'none';
    
    // 重置信息显示
    fileInfo.textContent = '';
    originalInfo.innerHTML = '<p>请先上传图片</p>';
    compressedInfo.innerHTML = '<p>请先压缩图片</p>';
    
    // 重置按钮
    downloadBtn.style.display = 'none';
    
    // 隐藏进度条
    progressContainer.style.display = 'none';
    
    // 重置数据
    originalImage = null;
    originalFile = null;
    compressedBlob = null;
    
    hideMessage();
}

// 显示消息
function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = 'message';
    messageDiv.classList.add(type + '-message');
    messageDiv.style.display = 'block';
    
    // 3秒后自动隐藏消息
    setTimeout(hideMessage, 3000);
}

// 隐藏消息
function hideMessage() {
    messageDiv.style.display = 'none';
}