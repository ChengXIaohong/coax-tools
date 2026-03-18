const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const uploadSection = document.getElementById('uploadSection');
const editorSection = document.getElementById('editorSection');
const originalPreview = document.getElementById('originalPreview');
const compressedPreview = document.getElementById('compressedPreview');
const compressedPlaceholder = document.getElementById('compressedPlaceholder');
const originalTooltip = document.getElementById('originalTooltip');
const compressedTooltip = document.getElementById('compressedTooltip');
const controlsPanel = document.getElementById('controlsPanel');
const controlsToggle = document.getElementById('controlsToggle');
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

let originalImage = null;
let originalFile = null;
let compressedBlob = null;
let originalFileType = '';
let bestFormat = '';
let objectUrls = [];
let isCompressed = false;

currentYearSpan.textContent = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', function() {
    imageInput.addEventListener('change', handleImageUpload);
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    qualitySlider.addEventListener('input', updateQualityValue);
    widthSlider.addEventListener('input', updateWidthValue);
    compressBtn.addEventListener('click', compressImage);
    downloadBtn.addEventListener('click', downloadImage);
    resetBtn.addEventListener('click', resetAll);
    controlsToggle.addEventListener('click', toggleControls);
    
    updateQualityValue();
    updateWidthValue();
});

function toggleControls() {
    controlsPanel.classList.toggle('collapsed');
}

function updateQualityValue() {
    qualityValue.textContent = qualitySlider.value + '%';
}

function updateWidthValue() {
    widthValue.textContent = widthSlider.value + 'px';
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        processImageFile(file);
    }
}

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
    uploadArea.classList.remove('dragover');
    
    const file = event.dataTransfer.files[0];
    if (file && isImageFile(file)) {
        processImageFile(file);
    } else {
        showMessage('请上传有效的图片文件 (JPG, PNG, WEBP)', 'error');
    }
}

function isImageFile(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return validTypes.includes(file.type);
}

function processImageFile(file) {
    if (!isImageFile(file)) {
        showMessage('请上传有效的图片文件 (JPG, PNG, WEBP)', 'error');
        return;
    }

    originalFile = file;
    originalFileType = file.type;

    const reader = new FileReader();
    reader.onload = async function(e) {
        originalImage = new Image();
        
        try {
            const orientedImage = await loadOrientedImage(e.target.result);
            originalImage = orientedImage;
            
            originalPreview.src = e.target.result;
            originalPreview.classList.add('visible');
            compressedPreview.classList.remove('visible');
            compressedPlaceholder.classList.remove('hidden');

            originalTooltip.innerHTML = `
                <span>${originalImage.width} × ${originalImage.height}</span>
                <span>${formatFileSize(file.size)}</span>
            `;
            originalTooltip.classList.add('visible');

            compressedTooltip.innerHTML = `
                <span>-</span>
                <span>-</span>
            `;

            downloadBtn.classList.remove('visible');
            downloadBtn.href = '#';
            compressBtn.textContent = '压缩图片';
            isCompressed = false;

            uploadSection.classList.add('hidden');
            editorSection.classList.add('active');
            
            hideMessage();
        } catch (err) {
            showMessage('图片加载失败: ' + err.message, 'error');
        }
    };
    reader.readAsDataURL(file);
}

function loadOrientedImage(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            readFileAsArrayBuffer(originalFile).then(arrayBuffer => {
                const orientation = getOrientationFromArrayBuffer(arrayBuffer);
                if (orientation === 1 || orientation === -1) {
                    resolve(img);
                    return;
                }
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                let width = img.width;
                let height = img.height;
                
                if (orientation >= 5 && orientation <= 8) {
                    [width, height] = [height, width];
                }
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.save();
                
                switch (orientation) {
                    case 2: ctx.translate(width, 0); ctx.scale(-1, 1); break;
                    case 3: ctx.translate(width, height); ctx.rotate(Math.PI); break;
                    case 4: ctx.translate(0, height); ctx.scale(1, -1); break;
                    case 5: ctx.rotate(0.5 * Math.PI); ctx.scale(1, -1); break;
                    case 6: ctx.rotate(0.5 * Math.PI); break;
                    case 7: ctx.rotate(-0.5 * Math.PI); ctx.scale(-1, 1); break;
                    case 8: ctx.rotate(-0.5 * Math.PI); break;
                }
                
                ctx.drawImage(img, 0, 0);
                ctx.restore();
                
                const orientedImg = new Image();
                orientedImg.onload = () => resolve(orientedImg);
                orientedImg.onerror = reject;
                orientedImg.src = canvas.toDataURL();
            }).catch(() => {
                resolve(img);
            });
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function getOrientationFromArrayBuffer(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    
    if (view.getUint16(0, false) !== 0xFFD8) return -1;
    
    const length = view.byteLength;
    let offset = 2;
    
    while (offset < length) {
        if (view.getUint16(offset, false) === 0xFFE1) {
            const little = view.getUint16(offset + 2, false) === 0x4949;
            const app1Start = offset + 4;
            
            if (view.getUint32(app1Start, little) !== 0x45786966) return -1;
            
            const little2 = view.getUint16(offset + 10, little) === 0x4949;
            const exifStart = offset + 10;
            
            if (view.getUint32(exifStart, little2) !== 0x45786966) return -1;
            
            const tiffStart = offset + 14;
            const littleEndian = view.getUint16(tiffStart, little2);
            
            if (view.getUint32(tiffStart + 4, little2) !== 0x00002A00) return -1;
            
            const firstIFD = tiffStart + 8;
            const tagCount = view.getUint16(firstIFD, little2);
            
            for (let i = 0; i < tagCount; i++) {
                const tagOffset = firstIFD + 2 + i * 12;
                const tag = view.getUint16(tagOffset, little2);
                
                if (tag === 0x0112) {
                    return view.getUint16(tagOffset + 8, little2);
                }
            }
            return -1;
        }
        offset += 2 + view.getUint16(offset + 2, false);
    }
    
    return -1;
}

function preCompressionCheck(image, file) {
    const fileSizeMB = file.size / (1024 * 1024);
    const pixels = image.width * image.height;
    
    if (file.size < 100 * 1024) {
        return { message: '提示：文件较小，压缩效果可能不明显', type: 'info' };
    }
    
    if (fileSizeMB > 10) {
        return { message: '提示：文件较大，处理可能需要一些时间', type: 'info' };
    }
    
    if (file.type === 'image/jpeg' && file.size < pixels * 0.3) {
        return { message: '提示：原始JPEG文件可能已经过高度优化', type: 'info' };
    }
    
    return { message: '', type: '' };
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function compressImage() {
    if (!originalImage) {
        showMessage('请先上传图片', 'error');
        return;
    }

    progressContainer.style.display = 'block';
    setProgress(0);

    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const maxWidth = parseInt(widthSlider.value);
        const { width, height } = calculateDimensions(originalImage.width, originalImage.height, maxWidth);

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(originalImage, 0, 0, width, height);

        setProgress(30);

        const quality = parseInt(qualitySlider.value) / 100;
        const formatsToTry = determineBestFormats(originalFileType);

        setProgress(40);

        let bestBlob = null;
        let bestSize = Infinity;
        bestFormat = '';
        
        const step = 40 / formatsToTry.length;
        let progressOffset = 40;

        for (const format of formatsToTry) {
            const testQuality = format.quality || quality;
            
            const testBlob = await canvasToBlob(canvas, format.mimeType, testQuality);
            
            if (testBlob && testBlob.size < bestSize) {
                bestBlob = testBlob;
                bestSize = testBlob.size;
                bestFormat = format.extension;
            }
            
            progressOffset += step;
            setProgress(Math.min(progressOffset, 79));
        }

        setProgress(80);

        if (bestBlob) {
            revokeAllObjectUrls();
            compressedBlob = bestBlob;

            const compressedUrl = URL.createObjectURL(bestBlob);
            objectUrls.push(compressedUrl);
            
            compressedPreview.src = compressedUrl;
            compressedPreview.classList.add('visible');
            compressedPlaceholder.classList.add('hidden');

            const ratio = calculateCompressionRatio(originalFile.size, bestBlob.size);
            compressedTooltip.innerHTML = `
                <span>${width} × ${height}</span>
                <span class="highlight">${formatFileSize(bestBlob.size)} (${ratio})</span>
            `;
            compressedTooltip.classList.add('visible');

            if (bestBlob.size >= originalFile.size) {
                showMessage('注意：压缩后文件未减小，可能已是优化格式', 'warning');
            } else {
                showMessage('图片压缩完成!', 'success');
            }

            downloadBtn.href = compressedUrl;
            downloadBtn.download = 'compressed-image' + bestFormat;
            downloadBtn.classList.add('visible');
            compressBtn.textContent = '重新压缩';
            isCompressed = true;
        } else {
            showMessage('图片压缩失败: 无法生成压缩后的图片', 'error');
        }

        setProgress(100);
        setTimeout(() => { progressContainer.style.display = 'none'; }, 500);
    } catch (error) {
        progressContainer.style.display = 'none';
        showMessage('图片压缩失败: ' + error.message, 'error');
    }
}

function canvasToBlob(canvas, mimeType, quality) {
    return new Promise(resolve => {
        try {
            canvas.toBlob(resolve, mimeType, quality);
        } catch (e) {
            resolve(null);
        }
    });
}

function setProgress(percent) {
    progressFill.style.width = percent + '%';
}

function calculateDimensions(originalWidth, originalHeight, maxWidth) {
    if (originalWidth <= maxWidth) {
        return { width: originalWidth, height: originalHeight };
    }
    
    const ratio = originalHeight / originalWidth;
    const width = maxWidth;
    const height = Math.round(width * ratio);
    
    return { width, height };
}

function calculateCompressionRatio(originalSize, compressedSize) {
    const ratio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    return ratio + '%';
}

function determineBestFormats(fileType) {
    if (fileType === 'image/png') {
        return [
            { mimeType: 'image/webp', extension: '.webp', quality: 0.85 },
            { mimeType: 'image/png', extension: '.png', quality: 1.0 },
            { mimeType: 'image/jpeg', extension: '.jpg', quality: 0.85 }
        ];
    } else if (fileType === 'image/webp') {
        return [
            { mimeType: 'image/webp', extension: '.webp', quality: 0.85 },
            { mimeType: 'image/jpeg', extension: '.jpg', quality: 0.85 },
            { mimeType: 'image/png', extension: '.png', quality: 1.0 }
        ];
    } else {
        return [
            { mimeType: 'image/jpeg', extension: '.jpg', quality: 0.85 },
            { mimeType: 'image/webp', extension: '.webp', quality: 0.85 }
        ];
    }
}

async function adjustQualityDynamically(canvas, targetSize, formatsToTry) {
    let bestOverallBlob = null;
    let bestOverallSize = Infinity;
    let bestOverallFormat = '';
    
    for (const format of formatsToTry) {
        let low = 0.1;
        let high = 1.0;
        
        for (let i = 0; i < 8; i++) {
            const mid = (low + high) / 2;
            const blob = await canvasToBlob(canvas, format.mimeType, mid);
            
            if (!blob) break;
            
            if (blob.size <= targetSize && blob.size < bestOverallSize) {
                bestOverallBlob = blob;
                bestOverallSize = blob.size;
                bestOverallFormat = format.extension;
            }
            
            if (blob.size > targetSize) {
                high = mid - 0.05;
            } else {
                low = mid + 0.05;
            }
            
            if (Math.abs(blob.size - targetSize) < 2048) break;
        }
    }
    
    return { blob: bestOverallBlob, format: bestOverallFormat };
}

function revokeAllObjectUrls() {
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls = [];
}

function downloadImage() {
    if (!compressedBlob || !downloadBtn.href || downloadBtn.href === '#') {
        showMessage('没有可下载的图片', 'error');
        return;
    }
    showMessage('图片下载开始!', 'success');
}

function resetAll() {
    imageInput.value = '';
    originalPreview.classList.remove('visible');
    compressedPreview.classList.remove('visible');
    compressedPlaceholder.classList.remove('hidden');
    originalTooltip.classList.remove('visible');
    compressedTooltip.classList.remove('visible');
    downloadBtn.classList.remove('visible');
    downloadBtn.href = '#';
    progressContainer.style.display = 'none';
    compressBtn.textContent = '压缩图片';
    isCompressed = false;
    controlsPanel.classList.add('collapsed');
    
    revokeAllObjectUrls();
    
    originalImage = null;
    originalFile = null;
    compressedBlob = null;
    bestFormat = '';
    
    hideMessage();
    
    editorSection.classList.remove('active');
    uploadSection.classList.remove('hidden');
}

function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = 'message';
    messageDiv.classList.add(type + '-message');
    messageDiv.style.display = 'block';
    
    setTimeout(hideMessage, 3000);
}

function hideMessage() {
    messageDiv.style.display = 'none';
}