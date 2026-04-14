// 图片转 ASCII 字符画核心逻辑
document.addEventListener('DOMContentLoaded', function() {
    // DOM 元素
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    const previewThumb = document.getElementById('previewThumb');
    const thumbPreview = document.getElementById('thumbPreview');
    const thumbName = document.getElementById('thumbName');
    const fileInfo = document.getElementById('fileInfo');
    const configSection = document.getElementById('configSection');
    const convertBtn = document.getElementById('convertBtn');
    const inputSection = document.getElementById('inputSection');
    const outputSection = document.getElementById('outputSection');
    const asciiOutput = document.getElementById('asciiOutput');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');
    const charsetSelect = document.getElementById('charsetSelect');
    const widthInput = document.getElementById('widthInput');
    const invertToggle = document.getElementById('invertToggle');

    let currentImage = null;

    // ========== 拖拽上传 ==========
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            loadImage(file);
        }
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) loadImage(file);
    });

    function loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                currentImage = img;
                // 显示缩略图
                thumbPreview.src = e.target.result;
                thumbName.textContent = file.name;
                previewThumb.style.display = 'flex';
                fileInfo.textContent = `${img.width} × ${img.height} · ${(file.size / 1024).toFixed(1)} KB`;
                // 启用转换按钮
                convertBtn.disabled = false;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // ========== 渲染 ASCII ==========
    function renderAscii() {
        if (!currentImage) return;
        const width = parseInt(widthInput.value) || 120;
        const charset = charsetSelect.value;
        const inverted = invertToggle.checked;

        // 应用反色
        if (inverted) {
            document.body.classList.add('inverted');
        } else {
            document.body.classList.remove('inverted');
        }

        // 执行转换
        const ascii = imageToAscii(currentImage, width, charset, inverted);
        asciiOutput.textContent = ascii;
    }

    // ========== 转换 ==========
    convertBtn.addEventListener('click', () => {
        if (!currentImage) return;

        // 切换视图：隐藏输入区，显示配置区和输出区
        inputSection.style.display = 'none';
        configSection.style.display = 'block';
        outputSection.style.display = 'block';

        // 首次渲染
        renderAscii();
    });

    // ========== 配置变动实时渲染 ==========
    charsetSelect.addEventListener('change', renderAscii);
    widthInput.addEventListener('input', renderAscii);
    invertToggle.addEventListener('change', renderAscii);

    // ========== 核心算法 ==========
    const CHARSETS = {
        standard: '@%#*+=-:. ',
        simple: '@#%&*=- ',
        blocks: ' ░▒▓█'
    };

    function imageToAscii(img, targetWidth, charset, inverted) {
        const chars = CHARSETS[charset] || CHARSETS.standard;

        // 计算缩放比例，保持宽高比
        const aspectRatio = img.height / img.width;
        // 字符高度约为宽度的 2 倍（因为字符高度 > 宽度），所以宽度 / 2
        const targetHeight = Math.floor(targetWidth * aspectRatio / 2);

        // 创建 Canvas
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const pixels = imageData.data;

        let ascii = '';
        for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
                const idx = (y * targetWidth + x) * 4;
                const r = pixels[idx];
                const g = pixels[idx + 1];
                const b = pixels[idx + 2];

                // 灰度转换
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;

                // 映射到字符
                const charIndex = Math.floor((gray / 255) * (chars.length - 1));
                const invertedIndex = (chars.length - 1) - charIndex;
                ascii += chars[inverted ? invertedIndex : charIndex];
            }
            ascii += '\n';
        }
        return ascii;
    }

    // ========== 复制 ==========
    copyBtn.addEventListener('click', async () => {
        const text = asciiOutput.textContent;
        try {
            await navigator.clipboard.writeText(text);
            copyBtn.textContent = '✅ 已复制';
            setTimeout(() => copyBtn.textContent = '📋 复制纯文本', 1500);
        } catch (err) {
            // fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            copyBtn.textContent = '✅ 已复制';
            setTimeout(() => copyBtn.textContent = '📋 复制纯文本', 1500);
        }
    });

    // ========== 下载（纯文本） ==========
    downloadBtn.addEventListener('click', () => {
        const text = asciiOutput.textContent;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ascii-art.txt';
        a.click();
        URL.revokeObjectURL(url);
    });

    // ========== 重新选择 ==========
    resetBtn.addEventListener('click', () => {
        outputSection.style.display = 'none';
        configSection.style.display = 'none';
        inputSection.style.display = 'block';
        currentImage = null;
        imageInput.value = '';
        previewThumb.style.display = 'none';
        fileInfo.textContent = '';
        convertBtn.disabled = true;
        asciiOutput.textContent = '';
        document.body.classList.remove('inverted');
    });
});