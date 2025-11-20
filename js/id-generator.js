// 生成指定范围内的随机日期（YYYYMMDD格式）
function generateRandomDate(minAge, maxAge) {
    const currentYear = new Date().getFullYear();
    // 根据年龄范围计算出生年份范围
    const maxBirthYear = currentYear - minAge;
    const minBirthYear = currentYear - maxAge;
    
    // 生成随机出生年份
    const year = Math.floor(Math.random() * (maxBirthYear - minBirthYear + 1)) + minBirthYear;
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    // 根据月份确定日期范围
    let dayMax = 31;
    if (month === '02') {
        // 简单处理二月，不考虑闰年
        dayMax = 28;
    } else if (['04', '06', '09', '11'].includes(month)) {
        dayMax = 30;
    }
    const day = String(Math.floor(Math.random() * dayMax) + 1).padStart(2, '0');
    
    const result = `${year}${month}${day}`;
    // 确保返回的是8位字符串
    if (result.length !== 8) {
        console.error("出生日期长度不是8位:", result, result.length);
    }
    
    return result;
}

// 计算身份证校验码
function calculateCheckDigit(idBase) {
    // 确保idBase是17位
    let correctedIdBase = idBase;
    if (idBase.length !== 17) {
        console.error("校验码计算错误：idBase长度不是17位", idBase, idBase.length);
        // 如果超过17位，截取前17位
        if (idBase.length > 17) {
            correctedIdBase = idBase.substring(0, 17);
        } else {
            // 如果不足17位，用0补齐
            correctedIdBase = idBase.padEnd(17, '0');
        }
    }
    
    const weights = [2, 4, 8, 5, 10, 9, 7, 3, 6, 1, 2, 4, 8, 5, 10, 9, 7];
    const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    
    let sum = 0;
    for (let i = 0; i < 17; i++) {
        sum += parseInt(correctedIdBase[i]) * weights[i];
    }
    
    const checkDigit = checkCodes[sum % 11];
    // 确保校验码是1位
    if (checkDigit.length !== 1) {
        console.error("校验码不是1位:", checkDigit, checkDigit.length);
    }
    
    return checkDigit;
}

// 生成随机身份证号码
function generateIDNumber(gender, minAge, maxAge, areaCode) {
    // 选择区域码
    let selectedAreaCode;
    if (areaCode && areaCode !== "random") {
        selectedAreaCode = areaCode;
    } else {
        // 随机选择一个区域码
        const areaCodesArray = Object.keys(IdData.areaCodes);
        selectedAreaCode = areaCodesArray[Math.floor(Math.random() * areaCodesArray.length)];
    }
    
    // 确保区域码是6位
    selectedAreaCode = selectedAreaCode.padEnd(6, '0').substring(0, 6);
    
    // 生成出生日期
    const birthDate = generateRandomDate(minAge, maxAge);
    
    // 生成顺序码（3位数字）
    const sequenceCode = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    
    // 生成性别码（1位数字）
    const genderCode = String(Math.floor(Math.random() * 10));
    
    // 确保性别码是1位
    const correctedGenderCode = genderCode.substring(0, 1);
    if (genderCode.length > 1) {
        console.error("性别码超过1位:", genderCode, genderCode.length);
    }
    
    // 组成17位身份证号基础部分
    const idBase = selectedAreaCode + birthDate + sequenceCode + correctedGenderCode;
    
    // 确保idBase是17位，强制截取或补齐
    let correctedIdBase = idBase;
    if (idBase.length > 17) {
        correctedIdBase = idBase.substring(0, 17);
    } else if (idBase.length < 17) {
        // 这种情况不应该发生，但为了保险起见
        console.error("ID基础部分不足17位:", idBase, idBase.length);
        correctedIdBase = idBase.padEnd(17, '0');
    }
    
    // 计算校验码
    const checkDigit = calculateCheckDigit(correctedIdBase);
    
    // 确保最终结果是18位
    const fullID = correctedIdBase + checkDigit;
    if (fullID.length !== 18) {
        console.error("生成的身份证号码不是18位:", fullID, fullID.length);
        // 强制截取到18位
        return fullID.substring(0, 18);
    }
    
    return fullID;
}

// 根据身份证号获取性别
function getGenderFromID(idNumber) {
    const genderCode = parseInt(idNumber[16]);
    return genderCode % 2 === 1 ? "男" : "女";
}

// 根据身份证号计算年龄
function getAgeFromID(idNumber) {
    const birthYear = parseInt(idNumber.substring(6, 10));
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear;
}

// 根据身份证号获取出生日期
function getBirthDateFromID(idNumber) {
    const year = idNumber.substring(6, 10);
    const month = idNumber.substring(10, 12);
    const day = idNumber.substring(12, 14);
    return `${year}年${month}月${day}日`;
}

// 生成随机姓名
function generateName() {
    const surname = IdData.surnames[Math.floor(Math.random() * IdData.surnames.length)];
    // 随机决定是单字名还是双字名
    const isDoubleName = Math.random() > 0.5;
    
    if (isDoubleName) {
        // 双字名
        const givenName1 = IdData.givenNames[Math.floor(Math.random() * IdData.givenNames.length)];
        const givenName2 = IdData.givenNames[Math.floor(Math.random() * IdData.givenNames.length)];
        return surname + givenName1 + givenName2;
    } else {
        // 单字名
        const givenName = IdData.givenNames[Math.floor(Math.random() * IdData.givenNames.length)];
        return surname + givenName;
    }
}

// 生成指定区域的地址
function generateAddress(areaCode) {
    let selectedAreaCode;
    if (areaCode && areaCode !== "random") {
        selectedAreaCode = areaCode;
    } else {
        // 随机选择一个区域码
        const areaCodesArray = Object.keys(IdData.areaCodes);
        selectedAreaCode = areaCodesArray[Math.floor(Math.random() * areaCodesArray.length)];
    }
    
    const city = IdData.areaCodes[selectedAreaCode];
    const detail = IdData.addressDetails[Math.floor(Math.random() * IdData.addressDetails.length)];
    return city + detail;
}

// 创建气泡提示
function createToast(message) {
    // 移除已存在的气泡提示
    const existingToast = document.getElementById('copyToast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // 创建新的气泡提示
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

// 复制文本到剪贴板
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    // 显示气泡提示而不是alert
    createToast('已复制到剪贴板');
}

// 生成完整的身份证信息
function generateIDInfo() {
    // 获取用户选择的选项
    const genderSelect = document.getElementById('genderSelect');
    const minAgeInput = document.getElementById('minAge');
    const maxAgeInput = document.getElementById('maxAge');
    const areaSelect = document.getElementById('areaSelect');
    
    const gender = genderSelect.value;
    const minAge = parseInt(minAgeInput.value) || 18;
    const maxAge = parseInt(maxAgeInput.value) || 65;
    const areaCode = areaSelect.value;
    
    // 确保年龄范围有效
    if (minAge > maxAge) {
        alert('最小年龄不能大于最大年龄');
        return null;
    }
    
    const idNumber = generateIDNumber(gender, minAge, maxAge, areaCode);
    const fullName = generateName();
    const genderText = getGenderFromID(idNumber);
    const birthDate = getBirthDateFromID(idNumber);
    const age = getAgeFromID(idNumber);
    const address = generateAddress(areaCode);
    
    return {
        idNumber,
        fullName,
        gender: genderText,
        birthDate,
        age,
        address
    };
}

// 复制JSON到剪贴板
function copyJSONToClipboard(info) {
    const jsonString = JSON.stringify(info, null, 2);
    copyToClipboard(jsonString);
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateBtn');
    const copyJsonBtn = document.getElementById('copyJsonBtn');
    const idInfo = document.getElementById('idInfo');
    
    let currentInfo = null;
    
    // 生成按钮点击事件
    generateBtn.addEventListener('click', function() {
        const info = generateIDInfo();
        
        if (info) {
            currentInfo = info;
            
            // 填充信息到页面
            document.getElementById('idNumber').textContent = info.idNumber;
            document.getElementById('fullName').textContent = info.fullName;
            document.getElementById('gender').textContent = info.gender;
            document.getElementById('birthDate').textContent = info.birthDate;
            document.getElementById('age').textContent = info.age;
            document.getElementById('address').textContent = info.address;
            
            // 显示信息区域和复制JSON按钮
            idInfo.style.display = 'block';
            copyJsonBtn.style.display = 'inline-block';
        }
    });
    
    // 复制JSON按钮点击事件
    copyJsonBtn.addEventListener('click', function() {
        if (currentInfo) {
            copyJSONToClipboard(currentInfo);
        }
    });
    
    // 复制按钮点击事件
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const text = document.getElementById(targetId).textContent;
            copyToClipboard(text);
        });
    });
});