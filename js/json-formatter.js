// DOM 元素
const inputJson = document.getElementById('inputJson');
const outputJson = document.getElementById('outputJson');
const formatBtn = document.getElementById('formatBtn');
const structureBtn = document.getElementById('structureBtn');
const toonBtn = document.getElementById('toonBtn');
const yamlBtn = document.getElementById('yamlBtn');
const clearBtn = document.getElementById('clearBtn');
const clearInputBtn = document.getElementById('clearInput');
const copyOutputBtn = document.getElementById('copyOutput');
const extractStructureBtn = document.getElementById('extractStructure');
const toonConvertBtn = document.getElementById('toonConvert');
const yamlConvertBtn = document.getElementById('yamlConvert');
const indentSize = document.getElementById('indentSize');
const loadSampleBtn = document.getElementById('loadSample');
const messageDiv = document.getElementById('message');
const currentYearSpan = document.getElementById('currentYear');

// 初始化年份
currentYearSpan.textContent = new Date().getFullYear();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 绑定事件监听器
    formatBtn.addEventListener('click', formatJson);
    structureBtn.addEventListener('click', extractStructure);
    toonBtn.addEventListener('click', convertToToon);
    yamlBtn.addEventListener('click', convertToYaml);
    clearBtn.addEventListener('click', clearAll);
    clearInputBtn.addEventListener('click', clearInput);
    copyOutputBtn.addEventListener('click', copyOutput);
    extractStructureBtn.addEventListener('click', extractStructureFromOutput);
    toonConvertBtn.addEventListener('click', convertToToonFromOutput);
    yamlConvertBtn.addEventListener('click', convertToYamlFromOutput);
    loadSampleBtn.addEventListener('click', loadSampleData);
});

// 格式化JSON
function formatJson() {
    const jsonString = inputJson.value.trim();
    
    // 检查输入是否为空
    if (!jsonString) {
        showMessage('请输入JSON数据', 'error');
        return;
    }
    
    try {
        // 解析JSON
        const parsedJson = JSON.parse(jsonString);
        
        // 格式化JSON
        const indent = parseInt(indentSize.value);
        const formattedJson = JSON.stringify(parsedJson, null, indent);
        
        // 显示格式化结果
        outputJson.value = formattedJson;
        
        // 显示成功消息
        showMessage('JSON格式化成功!', 'success');
    } catch (error) {
        // 显示错误消息
        showMessage(`JSON格式错误: ${error.message}`, 'error');
    }
}

// 提取JSON结构
function extractStructure() {
    const jsonString = inputJson.value.trim();
    
    // 检查输入是否为空
    if (!jsonString) {
        showMessage('请输入JSON数据', 'error');
        return;
    }
    
    try {
        // 解析JSON
        const parsedJson = JSON.parse(jsonString);
        
        // 提取结构
        const structure = extractJsonStructure(parsedJson);
        
        // 格式化结构
        const indent = parseInt(indentSize.value);
        const formattedStructure = JSON.stringify(structure, null, indent);
        
        // 显示结果
        outputJson.value = formattedStructure;
        
        // 显示成功消息
        showMessage('JSON结构提取成功!', 'success');
    } catch (error) {
        // 显示错误消息
        showMessage(`JSON格式错误: ${error.message}`, 'error');
    }
}

// 从输出中提取结构（当点击输出面板的提取结构按钮时）
function extractStructureFromOutput() {
    const jsonString = outputJson.value.trim();
    
    // 检查输入是否为空
    if (!jsonString) {
        showMessage('输出区域没有JSON数据', 'error');
        return;
    }
    
    try {
        // 解析JSON
        const parsedJson = JSON.parse(jsonString);
        
        // 提取结构
        const structure = extractJsonStructure(parsedJson);
        
        // 格式化结构
        const indent = parseInt(indentSize.value);
        const formattedStructure = JSON.stringify(structure, null, indent);
        
        // 显示结果
        outputJson.value = formattedStructure;
        
        // 显示成功消息
        showMessage('JSON结构提取成功!', 'success');
    } catch (error) {
        // 显示错误消息
        showMessage(`JSON格式错误: ${error.message}`, 'error');
    }
}

// 递归提取JSON结构
function extractJsonStructure(obj) {
    if (obj === null || obj === undefined) {
        return null;
    }
    
    if (Array.isArray(obj)) {
        if (obj.length === 0) {
            return [];
        }
        
        // 对于数组，我们只保留第一个元素的结构
        return [extractJsonStructure(obj[0])];
    }
    
    if (typeof obj === 'object') {
        const structure = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                structure[key] = extractJsonStructure(obj[key]);
            }
        }
        return structure;
    }
    
    // 对于基本类型，返回类型的占位符
    if (typeof obj === 'string') {
        return '';
    }
    
    if (typeof obj === 'number') {
        return 0;
    }
    
    if (typeof obj === 'boolean') {
        return false;
    }
    
    return null;
}

// 转换为TOON格式
function convertToToon() {
    const jsonString = inputJson.value.trim();
    
    // 检查输入是否为空
    if (!jsonString) {
        showMessage('请输入JSON数据', 'error');
        return;
    }
    
    try {
        // 解析JSON
        const parsedJson = JSON.parse(jsonString);
        
        // 转换为TOON格式
        const toonString = convertToToonFormat(parsedJson, 0);
        
        // 显示结果
        outputJson.value = toonString;
        
        // 显示成功消息
        showMessage('JSON转TOON格式成功!', 'success');
    } catch (error) {
        // 显示错误消息
        showMessage(`JSON格式错误: ${error.message}`, 'error');
    }
}

// 从输出中转换为TOON格式
function convertToToonFromOutput() {
    const jsonString = outputJson.value.trim();
    
    // 检查输入是否为空
    if (!jsonString) {
        showMessage('输出区域没有JSON数据', 'error');
        return;
    }
    
    try {
        // 解析JSON
        const parsedJson = JSON.parse(jsonString);
        
        // 转换为TOON格式
        const toonString = convertToToonFormat(parsedJson, 0);
        
        // 显示结果
        outputJson.value = toonString;
        
        // 显示成功消息
        showMessage('JSON转TOON格式成功!', 'success');
    } catch (error) {
        // 显示错误消息
        showMessage(`JSON格式错误: ${error.message}`, 'error');
    }
}

// 将对象转换为TOON格式
function convertToToonFormat(obj, indentLevel = 0) {
    const indent = '  '.repeat(indentLevel);
    
    if (obj === null) {
        return 'null';
    }
    
    if (obj === undefined) {
        return 'null';
    }
    
    if (Array.isArray(obj)) {
        // 处理空数组
        if (obj.length === 0) {
            return '[]';
        }
        
        // 检查是否为对象数组且具有相同的键
        if (typeof obj[0] === 'object' && obj[0] !== null && !Array.isArray(obj[0])) {
            const firstObjKeys = Object.keys(obj[0]);
            const isUniformArray = obj.every(item => 
                typeof item === 'object' && 
                item !== null && 
                !Array.isArray(item) && 
                JSON.stringify(Object.keys(item).sort()) === JSON.stringify(firstObjKeys.sort())
            );
            
            if (isUniformArray) {
                // 统一对象数组，使用表格格式
                const header = `{${firstObjKeys.join(',')}}`;
                const rows = obj.map(item => 
                    firstObjKeys.map(key => formatToonValue(item[key])).join(',')
                );
                return `${indent}[${obj.length}]${header}:\n${rows.map(row => `${indent}  ${row}`).join('\n')}`;
            }
        }
        
        // 普通数组
        const items = obj.map(item => convertToToonFormat(item, 0)).join(',');
        return `[${obj.length}]: ${items}`;
    }
    
    if (typeof obj === 'object') {
        const keys = Object.keys(obj);
        if (keys.length === 0) {
            return '{}';
        }
        
        const entries = keys.map(key => {
            const value = obj[key];
            if (typeof value === 'object' && value !== null) {
                // 对于嵌套对象，递归处理
                const nested = convertToToonFormat(value, indentLevel + 1);
                if (nested.startsWith('  ')) {
                    // 多行对象
                    return `${indent}${key}:\n${nested}`;
                } else {
                    // 单行对象
                    return `${indent}${key}: ${nested}`;
                }
            } else {
                // 简单值
                return `${indent}${key}: ${formatToonValue(value)}`;
            }
        });
        
        return entries.join('\n');
    }
    
    // 基本类型
    return formatToonValue(obj);
}

// 格式化TOON值
function formatToonValue(value) {
    if (typeof value === 'string') {
        // 如果字符串包含特殊字符，需要加引号
        if (/[,\[\]{}:\s]/.test(value)) {
            return `"${value}"`;
        }
        return value;
    }
    
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
        return String(value);
    }
    
    return String(value);
}

// 转换为YAML格式
function convertToYaml() {
    const jsonString = inputJson.value.trim();
    
    // 检查输入是否为空
    if (!jsonString) {
        showMessage('请输入JSON数据', 'error');
        return;
    }
    
    try {
        // 解析JSON
        const parsedJson = JSON.parse(jsonString);
        
        // 转换为YAML格式
        const indent = parseInt(indentSize.value);
        const yamlString = convertToYamlFormat(parsedJson, 0, indent);
        
        // 显示结果
        outputJson.value = yamlString;
        
        // 显示成功消息
        showMessage('JSON转YAML格式成功!', 'success');
    } catch (error) {
        // 显示错误消息
        showMessage(`JSON格式错误: ${error.message}`, 'error');
    }
}

// 从输出中转换为YAML格式
function convertToYamlFromOutput() {
    const jsonString = outputJson.value.trim();
    
    // 检查输入是否为空
    if (!jsonString) {
        showMessage('输出区域没有JSON数据', 'error');
        return;
    }
    
    try {
        // 解析JSON
        const parsedJson = JSON.parse(jsonString);
        
        // 转换为YAML格式
        const indent = parseInt(indentSize.value);
        const yamlString = convertToYamlFormat(parsedJson, 0, indent);
        
        // 显示结果
        outputJson.value = yamlString;
        
        // 显示成功消息
        showMessage('JSON转YAML格式成功!', 'success');
    } catch (error) {
        // 显示错误消息
        showMessage(`JSON格式错误: ${error.message}`, 'error');
    }
}

// 将对象转换为YAML格式
function convertToYamlFormat(obj, depth, indentSize) {
    const indent = ' '.repeat(depth * indentSize);
    
    if (obj === null) {
        return 'null';
    }
    
    if (obj === undefined) {
        return 'null';
    }
    
    if (Array.isArray(obj)) {
        // 处理空数组
        if (obj.length === 0) {
            return '[]';
        }
        
        // 处理数组元素
        let result = '';
        for (let i = 0; i < obj.length; i++) {
            const item = obj[i];
            if (typeof item === 'object' && item !== null) {
                // 对于对象或数组元素
                result += `${indent}- ${convertToYamlFormat(item, depth + 1, indentSize)}\n`;
            } else {
                // 对于基本类型元素
                result += `${indent}- ${formatYamlValue(item)}\n`;
            }
        }
        return result.trimEnd();
    }
    
    if (typeof obj === 'object') {
        const keys = Object.keys(obj);
        if (keys.length === 0) {
            return '{}';
        }
        
        let result = '';
        for (const key of keys) {
            const value = obj[key];
            if (typeof value === 'object' && value !== null) {
                // 对于嵌套对象或数组
                if (Array.isArray(value) && value.length === 0) {
                    result += `${indent}${key}: []\n`;
                } else if (Array.isArray(value)) {
                    result += `${indent}${key}:\n${convertToYamlFormat(value, depth + 1, indentSize)}\n`;
                } else if (Object.keys(value).length === 0) {
                    result += `${indent}${key}: {}\n`;
                } else {
                    result += `${indent}${key}:\n${convertToYamlFormat(value, depth + 1, indentSize)}\n`;
                }
            } else {
                // 对于基本类型
                result += `${indent}${key}: ${formatYamlValue(value)}\n`;
            }
        }
        return result.trimEnd();
    }
    
    // 基本类型
    return formatYamlValue(obj);
}

// 格式化YAML值
function formatYamlValue(value) {
    if (typeof value === 'string') {
        // 处理包含特殊字符的字符串
        if (/[":{}\[\],&*#?|>-]/.test(value) || 
            value.startsWith('- ') || 
            value.startsWith('?') || 
            value.startsWith(': ') ||
            value.includes('\n')) {
            // 使用引号包裹
            if (value.includes('"')) {
                // 如果包含双引号，使用单引号
                return `'${value.replace(/'/g, "''")}'`;
            } else {
                // 使用双引号
                return `"${value.replace(/"/g, '\\"')}"`;
            }
        }
        return value;
    }
    
    if (typeof value === 'number') {
        return String(value);
    }
    
    if (typeof value === 'boolean') {
        return String(value);
    }
    
    if (value === null) {
        return 'null';
    }
    
    return String(value);
}

// 清空所有内容
function clearAll() {
    inputJson.value = '';
    outputJson.value = '';
    hideMessage();
}

// 清空输入
function clearInput() {
    inputJson.value = '';
    hideMessage();
}

// 复制输出结果
function copyOutput() {
    if (!outputJson.value) {
        showMessage('没有内容可复制', 'error');
        return;
    }
    
    outputJson.select();
    outputJson.setSelectionRange(0, 99999); // For mobile devices
    
    navigator.clipboard.writeText(outputJson.value).then(() => {
        showMessage('已复制到剪贴板!', 'success');
    }).catch(err => {
        console.error('复制失败: ', err);
        showMessage('复制失败，请手动复制', 'error');
    });
}

// 加载示例数据
function loadSampleData() {
    const sampleData = {
        "姓名": "张三",
        "年龄": 30,
        "邮箱": "zhangsan@example.com",
        "地址": {
            "国家": "中国",
            "城市": "北京",
            "邮编": "100000"
        },
        "爱好": [
            "读书",
            "游泳",
            "编程"
        ],
        "已婚": true,
        "子女": null
    };
    
    inputJson.value = JSON.stringify(sampleData, null, 2);
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