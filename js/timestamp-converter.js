// DOM 元素
const timestampInput = document.getElementById('timestampInput');
const dateInput = document.getElementById('dateInput');
const timestampToDateBtn = document.getElementById('timestampToDateBtn');
const dateToTimestampBtn = document.getElementById('dateToTimestampBtn');
const currentTimestampBtn = document.getElementById('currentTimestampBtn');
const timestampToDateResult = document.getElementById('timestampToDateResult');
const dateToTimestampResult = document.getElementById('dateToTimestampResult');
const localTime = document.getElementById('localTime');
const utcTime = document.getElementById('utcTime');
const readableTime = document.getElementById('readableTime');
const timestampSeconds = document.getElementById('timestampSeconds');
const timestampMilliseconds = document.getElementById('timestampMilliseconds');
const messageDiv = document.getElementById('message');
const currentYearSpan = document.getElementById('currentYear');

// 初始化年份
currentYearSpan.textContent = new Date().getFullYear();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 绑定事件监听器
    timestampToDateBtn.addEventListener('click', convertTimestampToDate);
    dateToTimestampBtn.addEventListener('click', convertDateToTimestamp);
    currentTimestampBtn.addEventListener('click', useCurrentTime);
    
    // 设置当前时间到日期输入框
    setCurrentDateTime();
});

// 设置当前日期时间到输入框
function setCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    dateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
}

// 时间戳转日期时间
function convertTimestampToDate() {
    const timestamp = timestampInput.value.trim();
    
    // 检查输入是否为空
    if (!timestamp) {
        showMessage('请输入时间戳', 'error');
        return;
    }
    
    // 检查输入是否为数字
    if (!/^\d+$/.test(timestamp)) {
        showMessage('请输入有效的时间戳（纯数字）', 'error');
        return;
    }
    
    let timestampNumber = parseInt(timestamp);
    
    // 自动识别是秒还是毫秒
    if (timestamp.length === 10) {
        // 秒级时间戳
        timestampNumber *= 1000;
    } else if (timestamp.length === 13) {
        // 毫秒级时间戳，无需处理
    } else if (timestamp.length < 10) {
        // 小于10位，认为是秒
        timestampNumber *= 1000;
    } else if (timestamp.length > 13) {
        // 大于13位，认为是纳秒或更小单位，需要处理
        timestampNumber = Math.floor(timestampNumber / Math.pow(10, timestamp.length - 13));
    }
    
    try {
        const date = new Date(timestampNumber);
        
        // 检查日期是否有效
        if (isNaN(date.getTime())) {
            showMessage('无效的时间戳', 'error');
            return;
        }
        
        // 显示结果
        localTime.textContent = date.toLocaleString('zh-CN');
        utcTime.textContent = date.toISOString();
        readableTime.textContent = formatDateReadable(date);
        
        timestampToDateResult.style.display = 'block';
        showMessage('转换成功!', 'success');
    } catch (error) {
        showMessage('转换失败: ' + error.message, 'error');
    }
}

// 日期时间转时间戳
function convertDateToTimestamp() {
    const dateValue = dateInput.value;
    
    // 检查输入是否为空
    if (!dateValue) {
        showMessage('请选择日期时间', 'error');
        return;
    }
    
    try {
        const date = new Date(dateValue);
        
        // 检查日期是否有效
        if (isNaN(date.getTime())) {
            showMessage('无效的日期时间', 'error');
            return;
        }
        
        // 显示结果
        timestampSeconds.textContent = Math.floor(date.getTime() / 1000);
        timestampMilliseconds.textContent = date.getTime();
        
        dateToTimestampResult.style.display = 'block';
        showMessage('转换成功!', 'success');
    } catch (error) {
        showMessage('转换失败: ' + error.message, 'error');
    }
}

// 使用当前时间
function useCurrentTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    dateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    showMessage('已设置为当前时间', 'success');
}

// 格式化为可读日期
function formatDateReadable(date) {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    
    return `${year}年${month}月${day}日 星期${weekday} ${hours}:${minutes}:${seconds}`;
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