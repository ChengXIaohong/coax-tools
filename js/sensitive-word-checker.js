// DOM 元素
const textInput = document.getElementById('textInput');
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const fileInfo = document.getElementById('fileInfo');
const wordInput = document.getElementById('wordInput');
const addWordBtn = document.getElementById('addWordBtn');
const wordList = document.getElementById('wordList');
const checkBtn = document.getElementById('checkBtn');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const resultSection = document.getElementById('resultSection');
const resultSummary = document.getElementById('resultSummary');
const previewContent = document.getElementById('previewContent');
const inputMethods = document.querySelectorAll('.input-method');
const textInputContainer = document.querySelector('.text-input-container');
const fileInputContainer = document.querySelector('.file-input-container');
const currentYearSpan = document.getElementById('currentYear');

// 存储自定义敏感词
let customSensitiveWords = [];

// 系统默认敏感词库
const defaultSensitiveWords = [
    '暴力', '色情', '赌博', '诈骗', '毒品', '黑客', '病毒', '木马', '色情网站',
    '非法', '违法', '犯罪', '恐怖', '极端主义', '分裂主义', '泄露', '机密',
    '国家机密', '隐私', '个人信息', '侮辱', '诽谤', '歧视', '种族歧视',
    '性别歧视', '宗教歧视', '政治敏感', '反政府', '颠覆国家',
    // 英文敏感词
    'violence', 'porn', 'gambling', 'fraud', 'drugs', 'hack', 'virus', 'trojan',
    'illegal', 'crime', 'terror', 'extremism', 'separatism', 'leak', 'secret',
    'confidential', 'privacy', 'insult', 'defamation', 'discrimination'
];

// 初始化年份
currentYearSpan.textContent = new Date().getFullYear();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 绑定事件监听器
    inputMethods.forEach(method => {
        method.addEventListener('click', switchInputMethod);
    });
    
    fileInput.addEventListener('change', handleFileSelect);
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    addWordBtn.addEventListener('click', addCustomWord);
    wordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addCustomWord();
        }
    });
    
    checkBtn.addEventListener('click', checkSensitiveWords);
    
    // 初始化敏感词列表显示
    updateWordList();
});

// 切换输入方式
function switchInputMethod(e) {
    const method = e.target.dataset.method;
    
    // 更新按钮状态
    inputMethods.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    // 显示对应的输入区域
    if (method === 'text') {
        textInputContainer.classList.add('active');
        fileInputContainer.classList.remove('active');
    } else {
        textInputContainer.classList.remove('active');
        fileInputContainer.classList.add('active');
    }
}

// 处理文件选择
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
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
    
    const file = e.dataTransfer.files[0];
    if (file) {
        processFile(file);
    }
}

// 处理文件
function processFile(file) {
    // 检查文件类型
    if (!file.type.startsWith('text/') && !file.name.endsWith('.txt')) {
        showError('请选择文本文件 (.txt)');
        return;
    }
    
    // 显示文件信息
    fileInfo.innerHTML = `已选择文件: ${file.name}<br>文件大小: ${formatFileSize(file.size)}`;
    fileInfo.style.display = 'block';
    
    // 读取文件内容
    const reader = new FileReader();
    reader.onload = function(e) {
        textInput.value = e.target.result;
        showSuccess('文件内容已加载');
    };
    reader.onerror = function() {
        showError('读取文件失败');
    };
    reader.readAsText(file, 'UTF-8');
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 添加自定义敏感词
function addCustomWord() {
    const word = wordInput.value.trim();
    if (word && !customSensitiveWords.includes(word)) {
        customSensitiveWords.push(word);
        wordInput.value = '';
        updateWordList();
        showSuccess(`已添加敏感词: ${word}`);
    } else if (customSensitiveWords.includes(word)) {
        showError('该敏感词已存在');
    } else {
        showError('请输入有效的敏感词');
    }
}

// 删除自定义敏感词
function removeCustomWord(word) {
    customSensitiveWords = customSensitiveWords.filter(w => w !== word);
    updateWordList();
    showSuccess(`已删除敏感词: ${word}`);
}

// 更新敏感词列表显示
function updateWordList() {
    wordList.innerHTML = '';
    
    // 显示自定义敏感词
    customSensitiveWords.forEach(word => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${word}</span>
            <button class="remove-word-btn" data-word="${word}">删除</button>
        `;
        wordList.appendChild(li);
    });
    
    // 绑定删除按钮事件
    document.querySelectorAll('.remove-word-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const word = this.dataset.word;
            removeCustomWord(word);
        });
    });
}

// 检测敏感词
function checkSensitiveWords() {
    // 获取待检测文本
    let text = '';
    const activeMethod = document.querySelector('.input-method.active').dataset.method;
    
    if (activeMethod === 'text') {
        text = textInput.value.trim();
    } else {
        text = textInput.value.trim();
    }
    
    if (!text) {
        showError('请输入要检测的文本内容');
        return;
    }
    
    // 显示加载状态
    loading.style.display = 'block';
    hideMessage();
    resultSection.style.display = 'none';
    
    // 使用setTimeout让UI有时间更新
    setTimeout(() => {
        try {
            // 合并系统默认敏感词和自定义敏感词
            const allSensitiveWords = [...defaultSensitiveWords, ...customSensitiveWords];
            
            // 检测敏感词
            const detectedWords = detectSensitiveWords(text, allSensitiveWords);
            
            // 显示结果
            showResults(text, detectedWords, allSensitiveWords);
        } catch (error) {
            console.error('检测过程中发生错误:', error);
            showError('检测过程中发生错误: ' + error.message);
        } finally {
            loading.style.display = 'none';
        }
    }, 100);
}

// 检测敏感词的具体实现
function detectSensitiveWords(text, sensitiveWords) {
    const detected = [];
    const foundWords = new Set(); // 用于去重
    
    sensitiveWords.forEach(word => {
        // 转义特殊字符
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedWord, 'gi');
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            if (!foundWords.has(match[0])) {
                detected.push({
                    word: match[0],
                    index: match.index
                });
                foundWords.add(match[0]);
            }
        }
    });
    
    // 按位置排序
    return detected.sort((a, b) => a.index - b.index);
}

// 显示检测结果
function showResults(text, detectedWords, allSensitiveWords) {
    resultSection.style.display = 'block';
    
    if (detectedWords.length === 0) {
        resultSummary.innerHTML = '<p style="color: green; font-weight: bold;">未检测到敏感词，文本内容安全。</p>';
        previewContent.textContent = text;
    } else {
        // 显示统计信息
        resultSummary.innerHTML = `
            <p style="color: #dc3545; font-weight: bold;">
                检测到 ${detectedWords.length} 个敏感词
            </p>
            <ul class="sensitive-words-list">
                ${detectedWords.map(item => `<li>${item.word}</li>`).join('')}
            </ul>
        `;
        
        // 高亮显示敏感词
        let highlightedText = text;
        // 按长度降序排列，避免替换时影响位置
        const sortedWords = [...detectedWords].sort((a, b) => b.word.length - a.word.length);
        
        sortedWords.forEach(item => {
            const escapedWord = item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escapedWord})`, 'gi');
            highlightedText = highlightedText.replace(regex, '<span class="highlight">$1</span>');
        });
        
        previewContent.innerHTML = highlightedText;
    }
    
    // 滚动到结果区域
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

// 显示错误消息
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
    
    // 3秒后自动隐藏
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 3000);
}

// 显示成功消息
function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    
    // 3秒后自动隐藏
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 3000);
}

// 隐藏所有消息
function hideMessage() {
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
}