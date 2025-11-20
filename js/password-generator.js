// DOM 元素
const passwordOutput = document.getElementById('passwordOutput');
const passwordLength = document.getElementById('passwordLength');
const lengthValue = document.getElementById('lengthValue');
const includeUppercase = document.getElementById('includeUppercase');
const includeLowercase = document.getElementById('includeLowercase');
const includeNumbers = document.getElementById('includeNumbers');
const includeSymbols = document.getElementById('includeSymbols');
const excludeSimilar = document.getElementById('excludeSimilar');
const excludeAmbiguous = document.getElementById('excludeAmbiguous');
const generateBtn = document.getElementById('generateBtn');
const copyBtn = document.getElementById('copyBtn');
const copiedMessage = document.getElementById('copiedMessage');
const currentYearSpan = document.getElementById('currentYear');

// 新增的DOM元素
const historyBtn = document.getElementById('historyBtn');
const protocolBtn = document.getElementById('protocolBtn');
const historyModal = document.getElementById('historyModal');
const protocolModal = document.getElementById('protocolModal');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const historyList = document.getElementById('historyList');
const closeButtons = document.querySelectorAll('.close');
const messageDiv = document.getElementById('message');

// 字符集定义
const charSets = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

// 相似字符和模糊字符
const similarChars = 'il1Lo0O';
const ambiguousChars = '{}[]()/\\\'"`~,;.<>';

// 初始化年份
currentYearSpan.textContent = new Date().getFullYear();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 绑定事件监听器
    passwordLength.addEventListener('input', updateLengthValue);
    generateBtn.addEventListener('click', generatePassword);
    copyBtn.addEventListener('click', copyPassword);
    
    // 新增的事件监听器
    historyBtn.addEventListener('click', showHistory);
    protocolBtn.addEventListener('click', showProtocol);
    clearHistoryBtn.addEventListener('click', clearHistory);
    
    // 关闭模态框的事件监听器
    closeButtons.forEach(button => {
        button.addEventListener('click', closeModals);
    });
    
    // 点击模态框外部关闭模态框
    window.addEventListener('click', function(event) {
        if (event.target === historyModal || event.target === protocolModal) {
            closeModals();
        }
    });
    
    // 历史记录项点击事件委托
    historyList.addEventListener('click', function(e) {
        if (e.target.classList.contains('history-password')) {
            copyFromHistory(e.target);
        }
    });
    
    // 初始生成密码
    generatePassword();
});

// 更新长度显示值
function updateLengthValue() {
    lengthValue.textContent = passwordLength.value;
}

// 生成密码
function generatePassword() {
    const length = parseInt(passwordLength.value);
    
    // 检查是否至少选择了一种字符类型
    if (!includeUppercase.checked && 
        !includeLowercase.checked && 
        !includeNumbers.checked && 
        !includeSymbols.checked) {
        passwordOutput.value = '请至少选择一种字符类型';
        return;
    }
    
    // 构建字符集
    let charset = '';
    let requiredChars = '';
    
    if (includeUppercase.checked) {
        let chars = charSets.uppercase;
        if (excludeSimilar.checked) {
            chars = removeChars(chars, similarChars);
        }
        if (excludeAmbiguous.checked) {
            chars = removeChars(chars, ambiguousChars);
        }
        charset += chars;
        if (chars.length > 0) {
            requiredChars += chars[Math.floor(Math.random() * chars.length)];
        }
    }
    
    if (includeLowercase.checked) {
        let chars = charSets.lowercase;
        if (excludeSimilar.checked) {
            chars = removeChars(chars, similarChars);
        }
        if (excludeAmbiguous.checked) {
            chars = removeChars(chars, ambiguousChars);
        }
        charset += chars;
        if (chars.length > 0) {
            requiredChars += chars[Math.floor(Math.random() * chars.length)];
        }
    }
    
    if (includeNumbers.checked) {
        let chars = charSets.numbers;
        if (excludeSimilar.checked) {
            chars = removeChars(chars, similarChars);
        }
        if (excludeAmbiguous.checked) {
            chars = removeChars(chars, ambiguousChars);
        }
        charset += chars;
        if (chars.length > 0) {
            requiredChars += chars[Math.floor(Math.random() * chars.length)];
        }
    }
    
    if (includeSymbols.checked) {
        let chars = charSets.symbols;
        if (excludeSimilar.checked) {
            chars = removeChars(chars, similarChars);
        }
        if (excludeAmbiguous.checked) {
            chars = removeChars(chars, ambiguousChars);
        }
        charset += chars;
        if (chars.length > 0) {
            requiredChars += chars[Math.floor(Math.random() * chars.length)];
        }
    }
    
    // 生成密码
    let password = '';
    
    // 确保至少包含每种选定类型的字符各一个
    password += requiredChars;
    
    // 填充剩余长度
    for (let i = requiredChars.length; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    
    // 打乱密码字符顺序
    password = shuffleString(password);
    
    // 显示密码
    passwordOutput.value = password;
    
    // 保存到历史记录（只有点击生成按钮才记录）
    if (event && event.type === 'click') {
        saveToHistory(password);
    }
}

// 从字符串中移除指定字符
function removeChars(str, charsToRemove) {
    let result = str;
    for (let char of charsToRemove) {
        result = result.replace(new RegExp(char, 'g'), '');
    }
    return result;
}

// 打乱字符串顺序
function shuffleString(str) {
    const array = str.split('');
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array.join('');
}

// 复制密码到剪贴板
function copyPassword() {
    if (!passwordOutput.value || passwordOutput.value.includes('请至少选择')) {
        return;
    }
    
    passwordOutput.select();
    passwordOutput.setSelectionRange(0, 99999); // For mobile devices
    
    navigator.clipboard.writeText(passwordOutput.value).then(() => {
        // 显示复制成功消息
        copiedMessage.classList.add('show');
        
        // 3秒后隐藏消息
        setTimeout(() => {
            copiedMessage.classList.remove('show');
        }, 3000);
    }).catch(err => {
        console.error('复制失败: ', err);
        showMessage('复制失败，请手动复制', 'error');
    });
}

// 保存密码到历史记录
function saveToHistory(password) {
    // 获取现有的历史记录
    let history = localStorage.getItem('passwordGeneratorHistory');
    history = history ? JSON.parse(history) : [];
    
    // 添加新记录
    const now = new Date();
    const timeString = now.toLocaleString('zh-CN');
    history.unshift({
        password: password,
        time: timeString
    });
    
    // 只保留最近50条记录
    if (history.length > 50) {
        history = history.slice(0, 50);
    }
    
    // 保存回localStorage
    localStorage.setItem('passwordGeneratorHistory', JSON.stringify(history));
}

// 显示历史记录
function showHistory() {
    // 获取历史记录
    let history = localStorage.getItem('passwordGeneratorHistory');
    history = history ? JSON.parse(history) : [];
    
    // 清空历史列表
    historyList.innerHTML = '';
    
    // 如果没有历史记录
    if (history.length === 0) {
        const noHistoryItem = document.createElement('li');
        noHistoryItem.className = 'no-history';
        noHistoryItem.textContent = '暂无历史记录';
        historyList.appendChild(noHistoryItem);
    } else {
        // 添加历史记录项
        history.forEach(item => {
            const listItem = document.createElement('li');
            listItem.className = 'history-item';
            
            const passwordSpan = document.createElement('span');
            passwordSpan.className = 'history-password';
            passwordSpan.textContent = item.password;
            passwordSpan.title = '点击复制';
            
            const timeSpan = document.createElement('span');
            timeSpan.className = 'history-time';
            timeSpan.textContent = item.time;
            
            listItem.appendChild(passwordSpan);
            listItem.appendChild(timeSpan);
            
            historyList.appendChild(listItem);
        });
    }
    
    // 显示模态框
    historyModal.style.display = 'block';
}

// 显示使用协议
function showProtocol() {
    protocolModal.style.display = 'block';
}

// 关闭所有模态框
function closeModals() {
    historyModal.style.display = 'none';
    protocolModal.style.display = 'none';
}

// 清除历史记录
function clearHistory() {
    // 使用消息提示替换原始的alert确认
    showMessage('确定要清除所有生成历史吗？此操作不可恢复。请在下方确认。', 'error');
    
    // 创建确认按钮
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '确认清除';
    confirmBtn.className = 'clear-history-btn';
    confirmBtn.style.marginLeft = '10px';
    
    // 创建取消按钮
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.className = 'copy-btn';
    cancelBtn.style.marginLeft = '10px';
    
    // 添加按钮到消息区域
    messageDiv.appendChild(confirmBtn);
    messageDiv.appendChild(cancelBtn);
    
    // 确认清除事件
    confirmBtn.addEventListener('click', function() {
        localStorage.removeItem('passwordGeneratorHistory');
        showHistory(); // 重新加载显示
        hideMessage();
        showMessage('历史记录已清除', 'success');
    });
    
    // 取消事件
    cancelBtn.addEventListener('click', function() {
        hideMessage();
    });
}

// 从历史记录复制密码
function copyFromHistory(element) {
    const password = element.textContent;
    
    navigator.clipboard.writeText(password).then(() => {
        // 临时改变文本提示已复制
        const originalText = element.textContent;
        element.textContent = '已复制!';
        setTimeout(() => {
            element.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('复制失败: ', err);
        showMessage('复制失败，请手动复制', 'error');
    });
}

// 显示消息 (参考text-converter.html的样式)
function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = 'message';
    messageDiv.classList.add(type + '-message');
    messageDiv.style.display = 'block';
    
    // 3秒后自动隐藏消息（除非是清除历史的确认消息）
    if (!text.includes('确定要清除所有生成历史吗')) {
        setTimeout(hideMessage, 3000);
    }
}

// 隐藏消息
function hideMessage() {
    messageDiv.style.display = 'none';
    
    // 清除可能存在的确认按钮
    const buttons = messageDiv.querySelectorAll('button');
    buttons.forEach(button => button.remove());
}