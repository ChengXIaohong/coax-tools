// DOM 元素
const inputJson = document.getElementById('inputJson');
const outputJson = document.getElementById('outputJson');
const actionToggle = document.getElementById('actionToggle');
const actionMenu = document.getElementById('actionMenu');
const yamlConvertBtn = document.getElementById('yamlConvert');
const toonConvertBtn = document.getElementById('toonConvert');
const extractStructureBtn = document.getElementById('extractStructure');
const compressJsonBtn = document.getElementById('compressJson');
const sortKeysBtn = document.getElementById('sortKeys');
const copyOutputBtn = document.getElementById('copyOutput');
const jsonPathInput = document.getElementById('jsonPathInput');
const jsonPathSearchBtn = document.getElementById('jsonPathSearch');

// 默认缩进
const DEFAULT_INDENT = 2;

function compressJson() {
    const jsonString = outputJson.value.trim();
    if (!jsonString) return;
    
    try {
        const parsedJson = JSON.parse(jsonString);
        outputJson.value = JSON.stringify(parsedJson);
    } catch (e) {}
}

function sortJsonKeys() {
    const jsonString = outputJson.value.trim();
    if (!jsonString) return;
    
    try {
        const parsedJson = JSON.parse(jsonString);
        const sorted = sortKeysRecursive(parsedJson);
        outputJson.value = JSON.stringify(sorted, null, DEFAULT_INDENT);
    } catch (e) {}
}

function sortKeysRecursive(obj) {
    if (Array.isArray(obj)) {
        return obj.map(item => sortKeysRecursive(item));
    }
    if (obj !== null && typeof obj === 'object') {
        const sorted = {};
        Object.keys(obj).sort().forEach(key => {
            sorted[key] = sortKeysRecursive(obj[key]);
        });
        return sorted;
    }
    return obj;
}

function jsonPathQuery() {
    const jsonString = outputJson.value.trim();
    const path = jsonPathInput.value.trim();
    if (!jsonString || !path) return;
    
    try {
        const parsedJson = JSON.parse(jsonString);
        const result = jsonPathGet(parsedJson, path);
        if (result !== undefined) {
            outputJson.value = JSON.stringify(result, null, DEFAULT_INDENT);
        }
    } catch (e) {}
}

function jsonPathGet(obj, path) {
    const tokens = parseJsonPath(path);
    let current = obj;
    
    for (const token of tokens) {
        if (current === undefined || current === null) return undefined;
        
        if (token.type === 'root') {
            continue;
        } else if (token.type === 'key') {
            current = current[token.value];
        } else if (token.type === 'index') {
            current = current[token.value];
        } else if (token.type === 'wildcard') {
            if (Array.isArray(current)) {
                return current.map(item => jsonPathGet(item, path.slice(path.indexOf(token.raw) + token.raw.length)));
            } else if (typeof current === 'object') {
                const results = [];
                for (const key in current) {
                    results.push(jsonPathGet(current[key], path.slice(path.indexOf(token.raw) + token.raw.length)));
                }
                return results;
            }
        } else if (token.type === 'recursive') {
            return getRecursive(current, tokens.slice(tokens.indexOf(token) + 1));
        }
    }
    
    return current;
}

function getRecursive(obj, remainingTokens) {
    if (obj === null || typeof obj !== 'object') return [];
    const results = [];
    
    function traverse(o) {
        if (Array.isArray(o)) {
            o.forEach(item => traverse(item));
        } else if (typeof o === 'object') {
            for (const key in o) {
                if (o.hasOwnProperty(key)) {
                    const result = jsonPathGet(o[key], remainingTokens.map(t => t.raw).join(''));
                    if (result !== undefined) results.push(result);
                    traverse(o[key]);
                }
            }
        }
    }
    
    traverse(obj);
    return results;
}

function parseJsonPath(path) {
    const tokens = [];
    let i = 0;
    
    while (i < path.length) {
        if (path[i] === '$') {
            tokens.push({ type: 'root', value: '$', raw: '$' });
            i++;
        } else if (path[i] === '.') {
            if (path[i + 1] === '.') {
                tokens.push({ type: 'recursive', value: '..', raw: '..' });
                i += 2;
            } else {
                i++;
            }
        } else if (path[i] === '[') {
            let j = path.indexOf(']', i);
            if (j === -1) j = path.length;
            const bracket = path.slice(i + 1, j);
            if (/^\d+$/.test(bracket)) {
                tokens.push({ type: 'index', value: parseInt(bracket), raw: bracket });
            } else {
                tokens.push({ type: 'key', value: bracket.replace(/^["']|["']$/g, ''), raw: bracket });
            }
            i = j + 1;
        } else if (path[i] === '*') {
            tokens.push({ type: 'wildcard', value: '*', raw: '*' });
            i++;
        } else {
            let j = i;
            while (j < path.length && path[j] !== '.' && path[j] !== '[') j++;
            const key = path.slice(i, j);
            if (key) {
                tokens.push({ type: 'key', value: key, raw: key });
            }
            i = j;
        }
    }
    
    return tokens;
}

document.addEventListener('DOMContentLoaded', function() {
    // 自动格式化
    inputJson.addEventListener('input', autoFormat);
    inputJson.addEventListener('paste', () => setTimeout(autoFormat, 0));
    
    // 操作菜单
    actionToggle.addEventListener('click', toggleActionMenu);
    document.addEventListener('click', closeActionMenu);
    
    // 操作按钮
    yamlConvertBtn.addEventListener('click', () => convertFromOutput('yaml'));
    toonConvertBtn.addEventListener('click', () => convertFromOutput('toon'));
    extractStructureBtn.addEventListener('click', () => convertFromOutput('structure'));
    compressJsonBtn.addEventListener('click', compressJson);
    sortKeysBtn.addEventListener('click', sortJsonKeys);
    copyOutputBtn.addEventListener('click', copyOutput);
    
    // JSON Path 查询
    jsonPathSearchBtn.addEventListener('click', jsonPathQuery);
    jsonPathInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') jsonPathQuery();
    });
    
    // 加载示例数据
    loadSampleData();
});

// 自动格式化
function autoFormat() {
    const jsonString = inputJson.value.trim();
    if (!jsonString) {
        outputJson.value = '';
        return;
    }
    
    try {
        const parsedJson = JSON.parse(jsonString);
        outputJson.value = JSON.stringify(parsedJson, null, DEFAULT_INDENT);
    } catch (e) {
        // 无效JSON，不处理
    }
}

// 加载示例数据
function loadSampleData() {
    inputJson.value = JSON.stringify({
        "name": "张三",
        "age": 30,
        "email": "zhangsan@example.com",
        "address": {
            "country": "中国",
            "city": "北京"
        },
        "hobbies": ["读书", "游泳", "编程"],
        "married": true
    }, null, DEFAULT_INDENT);
    autoFormat();
}

// 切换操作菜单
function toggleActionMenu(e) {
    e.stopPropagation();
    actionMenu.classList.toggle('show');
}

function closeActionMenu(e) {
    if (!actionMenu.contains(e.target)) {
        actionMenu.classList.remove('show');
    }
}

// 从输出区转换
function convertFromOutput(type) {
    const jsonString = outputJson.value.trim();
    if (!jsonString) return;
    
    try {
        const parsedJson = JSON.parse(jsonString);
        let result;
        
        switch (type) {
            case 'yaml':
                result = convertToYamlFormat(parsedJson, 0, DEFAULT_INDENT);
                break;
            case 'toon':
                result = convertToToonFormat(parsedJson, 0);
                break;
            case 'structure':
                result = extractJsonStructure(parsedJson);
                result = JSON.stringify(result, null, DEFAULT_INDENT);
                break;
        }
        
        outputJson.value = result;
    } catch (e) {
        // 转换失败不处理
    }
    actionMenu.classList.remove('show');
}

// 复制输出
function copyOutput() {
    if (!outputJson.value) return;
    
    navigator.clipboard.writeText(outputJson.value);
    actionMenu.classList.remove('show');
}

// 加载示例数据
function loadSampleData() {
    const sampleData = {
        "name": "张三",
        "age": 30,
        "email": "zhangsan@example.com",
        "address": {
            "country": "中国",
            "city": "北京"
        },
        "hobbies": ["读书", "游泳", "编程"],
        "married": true
    };
    inputJson.value = JSON.stringify(sampleData, null, 2);
    autoFormat();
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

// 递归提取JSON结构
function extractJsonStructure(obj) {
    if (obj === null || obj === undefined) {
        return null;
    }
    
    if (Array.isArray(obj)) {
        if (obj.length === 0) {
            return [];
        }
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
    
    if (typeof obj === 'string') return '';
    if (typeof obj === 'number') return 0;
    if (typeof obj === 'boolean') return false;
    return null;
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