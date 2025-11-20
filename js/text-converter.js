// DOM 元素
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const convertBtn = document.getElementById('convertBtn');
const clearBtn = document.getElementById('clearBtn');
const clearInputBtn = document.getElementById('clearInput');
const copyOutputBtn = document.getElementById('copyOutput');
const loadSampleBtn = document.getElementById('loadSample');
const messageDiv = document.getElementById('message');
const currentYearSpan = document.getElementById('currentYear');
const conversionTypeInputs = document.querySelectorAll('input[name="conversionType"]');

// 初始化年份
currentYearSpan.textContent = new Date().getFullYear();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 绑定事件监听器
    convertBtn.addEventListener('click', convertText);
    clearBtn.addEventListener('click', clearAll);
    clearInputBtn.addEventListener('click', clearInput);
    copyOutputBtn.addEventListener('click', copyOutput);
    loadSampleBtn.addEventListener('click', loadSampleData);
});

// 文本转换函数
function convertText() {
    const text = inputText.value;
    
    // 检查输入是否为空
    if (!text.trim()) {
        showMessage('请输入需要转换的文本', 'error');
        return;
    }
    
    // 获取选中的转换类型
    const conversionType = document.querySelector('input[name="conversionType"]:checked').value;
    
    // 执行相应的转换
    let convertedText;
    switch (conversionType) {
        case 'toUpperCase':
            convertedText = text.toUpperCase();
            break;
        case 'toLowerCase':
            convertedText = text.toLowerCase();
            break;
        case 'capitalize':
            convertedText = capitalizeText(text);
            break;
        case 'camelCase':
            convertedText = toCamelCase(text);
            break;
        case 'snakeCase':
            convertedText = toSnakeCase(text);
            break;
        case 'kebabCase':
            convertedText = toKebabCase(text);
            break;
        default:
            convertedText = text;
    }
    
    // 显示转换结果
    outputText.value = convertedText;
    
    // 显示成功消息
    showMessage('文本转换成功!', 'success');
}

// 首字母大写转换
function capitalizeText(text) {
    return text.replace(/\b\w/g, function(char) {
        return char.toUpperCase();
    });
}

// 驼峰命名转换
function toCamelCase(text) {
    return text.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
}

// 蛇形命名转换
function toSnakeCase(text) {
    return text.replace(/\s+/g, '_').toLowerCase();
}

// 串式命名转换
function toKebabCase(text) {
    return text.replace(/\s+/g, '-').toLowerCase();
}

// 清空所有内容
function clearAll() {
    inputText.value = '';
    outputText.value = '';
    hideMessage();
}

// 清空输入
function clearInput() {
    inputText.value = '';
    hideMessage();
}

// 复制输出结果
function copyOutput() {
    if (!outputText.value) {
        showMessage('没有内容可复制', 'error');
        return;
    }
    
    outputText.select();
    outputText.setSelectionRange(0, 99999); // For mobile devices
    
    navigator.clipboard.writeText(outputText.value).then(() => {
        showMessage('已复制到剪贴板!', 'success');
    }).catch(err => {
        console.error('复制失败: ', err);
        showMessage('复制失败，请手动复制', 'error');
    });
}

// 加载示例数据
function loadSampleData() {
    const sampleText = `hello world
this is a sample text
convert me to different formats`;
    
    inputText.value = sampleText;
    showMessage('已加载示例数据', 'success');
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