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
let originalFileType = '';

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

    // 压缩前预检查
    const preCheckResult = preCompressionCheck(file);
    if (!preCheckResult.isValid) {
        showMessage(preCheckResult.message, 'warning');
    }

    // 保存原始文件和类型
    originalFile = file;
    originalFileType = file.type;

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

// 压缩前预检查
function preCompressionCheck(file) {
    // 检查文件大小
    const fileSizeMB = file.size / (1024 * 1024);
    
    // 如果文件很小（< 100KB），压缩可能不会有明显效果
    if (file.size < 100 * 1024) {
        return {
            isValid: true,
            message: '提示：文件较小，压缩效果可能不明显'
        };
    }
    
    // 如果文件很大（> 5MB），可能需要较长时间处理
    if (fileSizeMB > 5) {
        return {
            isValid: true,
            message: '提示：文件较大，压缩可能需要一些时间'
        };
    }
    
    // 检查是否已经是高度压缩的图片
    if (file.type === 'image/jpeg' && file.size < (originalImage?.width * originalImage?.height * 0.5)) {
        return {
            isValid: true,
            message: '提示：原始JPEG文件可能已经过优化，进一步压缩效果有限'
        };
    }
    
    return {
        isValid: true,
        message: ''
    };
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
async function compressImage() {
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

        // 智能格式选择和多格式尝试
        let bestBlob = null;
        let bestSize = Infinity;
        let bestFormat = '';
        
        // 根据原始文件类型和内容特征决定最佳输出格式
        const formatsToTry = determineBestFormats(originalFileType, originalImage);

        // 尝试不同格式和质量
        for (const format of formatsToTry) {
            let mimeType = format.mimeType;
            let testQuality = format.quality || quality;
            
            const testBlob = await new Promise(resolve => {
                canvas.toBlob(resolve, mimeType, testQuality);
            });
            
            if (testBlob && testBlob.size < bestSize) {
                bestBlob = testBlob;
                bestSize = testBlob.size;
                bestFormat = format.extension;
            }
        }

        // 如果最好的结果仍然比原图大，使用动态质量调整
        if (bestBlob && bestBlob.size > originalFile.size) {
            bestBlob = await adjustQualityDynamically(canvas, originalFile.size, formatsToTry[0]);
            bestSize = bestBlob ? bestBlob.size : bestSize;
        }

        if (bestBlob) {
            compressedBlob = bestBlob;

            // 显示压缩后的图片
            const compressedUrl = URL.createObjectURL(bestBlob);
            compressedPreview.src = compressedUrl;
            compressedPreview.style.display = 'block';

            // 显示压缩后图片信息
            compressedInfo.innerHTML = `
                <p>尺寸: ${width} × ${height}</p>
                <p>文件大小: ${formatFileSize(bestBlob.size)}</p>
                <p>压缩率: ${calculateCompressionRatio(originalFile.size, bestBlob.size)}</p>
            `;

            // 检查压缩是否有效
            if (bestBlob.size >= originalFile.size) {
                showMessage(`注意：压缩后的文件(${formatFileSize(bestBlob.size)})比原文件(${formatFileSize(originalFile.size)})大或相等，这可能是因为原始文件已经过高度优化`, 'warning');
            } else {
                showMessage('图片压缩完成!', 'success');
            }

            // 显示下载按钮，使用最佳格式的扩展名
            downloadBtn.href = compressedUrl;
            downloadBtn.download = 'compressed-image' + bestFormat;
            downloadBtn.style.display = 'inline-block';
        } else {
            showMessage('图片压缩失败: 无法生成压缩后的图片', 'error');
        }

        // 隐藏进度条
        progressContainer.style.display = 'none';
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

// 确定最佳格式
function determineBestFormats(originalFileType, image) {
    // 分析图片特征以决定最佳格式
    const hasTransparency = checkForTransparency(originalFileType, image);
    
    // 根据原始格式和透明度决定尝试的格式
    if (originalFileType === 'image/png') {
        if (hasTransparency) {
            // 如果有透明度，优先考虑PNG和WEBP
            return [
                { mimeType: 'image/webp', extension: '.webp', quality: 0.8 },
                { mimeType: 'image/png', extension: '.png', quality: 1.0 },
                { mimeType: 'image/jpeg', extension: '.jpg', quality: 0.8 }
            ];
        } else {
            // 如果没有透明度，优先考虑JPEG和WEBP
            return [
                { mimeType: 'image/jpeg', extension: '.jpg', quality: 0.8 },
                { mimeType: 'image/webp', extension: '.webp', quality: 0.8 },
                { mimeType: 'image/png', extension: '.png', quality: 1.0 }
            ];
        }
    } else if (originalFileType === 'image/webp') {
        return [
            { mimeType: 'image/webp', extension: '.webp', quality: 0.8 },
            { mimeType: 'image/jpeg', extension: '.jpg', quality: 0.8 },
            { mimeType: 'image/png', extension: '.png', quality: 1.0 }
        ];
    } else {
        // 默认为JPEG或其他格式
        return [
            { mimeType: 'image/jpeg', extension: '.jpg', quality: 0.8 },
            { mimeType: 'image/webp', extension: '.webp', quality: 0.8 },
            { mimeType: 'image/png', extension: '.png', quality: 1.0 }
        ];
    }
}

// 检查图片是否有透明度
function checkForTransparency(fileType, image) {
    // PNG格式可能有透明度，其他格式通常没有
    if (fileType !== 'image/png') {
        return false;
    }
    
    // 创建临时canvas检查是否有透明像素
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // 检查是否有alpha值小于255的像素
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
            return true; // 发现透明像素
        }
    }
    
    return false;
}

// 动态调整质量以达到目标大小
async function adjustQualityDynamically(canvas, targetSize, preferredFormat) {
    let low = 0.1;
    let high = 1.0;
    let mid;
    let bestBlob = null;
    let bestSize = Infinity;
    
    // 最多尝试10次
    for (let i = 0; i < 10; i++) {
        mid = (low + high) / 2;
        
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, preferredFormat.mimeType, mid);
        });
        
        if (!blob) continue;
        
        // 如果当前blob大小最接近目标且小于目标，则保存
        if (blob.size <= targetSize && blob.size < bestSize) {
            bestBlob = blob;
            bestSize = blob.size;
        }
        
        if (blob.size > targetSize) {
            high = mid - 0.05; // 减少质量
        } else {
            low = mid + 0.05; // 增加质量
        }
        
        // 如果我们找到了一个小于目标大小的文件，且足够接近，就停止
        if (Math.abs(blob.size - targetSize) < 1024) { // 误差在1KB内
            return blob;
        }
    }
    
    // 返回最接近目标大小且不超过目标的文件
    return bestBlob;
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
    
    // 使用与下载按钮相同的文件名
    let extension = '.jpg';
    if (originalFileType === 'image/png') {
        extension = '.png';
    } else if (originalFileType === 'image/webp') {
        extension = '.webp';
    }
    
    link.download = 'compressed-image' + extension;
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