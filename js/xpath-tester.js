const inputDoc = document.getElementById('inputDoc');
const xpathInput = document.getElementById('xpathInput');
const outputResult = document.getElementById('outputResult');
const matchCount = document.getElementById('matchCount');
const evaluateBtn = document.getElementById('evaluateBtn');
const clearBtn = document.getElementById('clearBtn');
const clearInputBtn = document.getElementById('clearInput');
const copyOutputBtn = document.getElementById('copyOutput');
const loadSampleBtn = document.getElementById('loadSample');
const messageDiv = document.getElementById('message');
const currentYearSpan = document.getElementById('currentYear');

currentYearSpan.textContent = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', function() {
    evaluateBtn.addEventListener('click', evaluateXPath);
    clearBtn.addEventListener('click', clearAll);
    clearInputBtn.addEventListener('click', clearInput);
    copyOutputBtn.addEventListener('click', copyOutput);
    loadSampleBtn.addEventListener('click', loadSampleData);
    
    xpathInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            evaluateXPath();
        }
    });
});

function evaluateXPath() {
    const docText = inputDoc.value.trim();
    const xpathExpr = xpathInput.value.trim();
    
    if (!docText) {
        showMessage('请输入XML或HTML文档', 'error');
        return;
    }
    
    if (!xpathExpr) {
        showMessage('请输入XPath表达式', 'error');
        return;
    }
    
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(docText, 'text/xml');
        
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            const htmlDoc = parser.parseFromString(docText, 'text/html');
            return evaluateXPathOnHTML(htmlDoc, xpathExpr);
        }
        
        const result = doc.evaluate(xpathExpr, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        
        let output = '';
        let count = 0;
        
        for (let i = 0; i < result.snapshotLength; i++) {
            const node = result.snapshotItem(i);
            count++;
            
            if (node.nodeType === Node.ELEMENT_NODE) {
                output += `[${count}] ${getNodePath(node)}\n`;
                output += `    标签: ${node.nodeName}\n`;
                output += `    文本: ${node.textContent.trim().substring(0, 100)}${node.textContent.length > 100 ? '...' : ''}\n`;
                if (node.attributes.length > 0) {
                    output += `    属性: ${Array.from(node.attributes).map(a => `${a.name}="${a.value}"`).join(', ')}\n`;
                }
            } else if (node.nodeType === Node.TEXT_NODE) {
                output += `[${count}] 文本节点: "${node.textContent.trim()}"\n`;
            } else if (node.nodeType === Node.ATTRIBUTE_NODE) {
                output += `[${count}] 属性: ${node.name}="${node.value}"\n`;
            } else {
                output += `[${count}] ${node.toString()}\n`;
            }
            output += '\n';
        }
        
        outputResult.value = output || '没有匹配结果';
        matchCount.textContent = `${count} 个匹配`;
        
        if (count > 0) {
            showMessage(`找到 ${count} 个匹配`, 'success');
        } else {
            showMessage('没有匹配结果', 'info');
        }
        
    } catch (error) {
        showMessage('XPath执行错误: ' + error.message, 'error');
        outputResult.value = '';
        matchCount.textContent = '0 个匹配';
    }
}

function evaluateXPathOnHTML(doc, xpathExpr) {
    try {
        const result = doc.evaluate(xpathExpr, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        
        let output = '';
        let count = 0;
        
        for (let i = 0; i < result.snapshotLength; i++) {
            const node = result.snapshotItem(i);
            count++;
            
            if (node.nodeType === Node.ELEMENT_NODE) {
                output += `[${count}] ${getNodePath(node)}\n`;
                output += `    标签: ${node.nodeName}\n`;
                output += `    文本: ${node.textContent.trim().substring(0, 100)}${node.textContent.length > 100 ? '...' : ''}\n`;
                if (node.attributes.length > 0) {
                    output += `    属性: ${Array.from(node.attributes).map(a => `${a.name}="${a.value}"`).join(', ')}\n`;
                }
            } else if (node.nodeType === Node.TEXT_NODE) {
                output += `[${count}] 文本节点: "${node.textContent.trim()}"\n`;
            } else {
                output += `[${count}] ${node.toString()}\n`;
            }
            output += '\n';
        }
        
        outputResult.value = output || '没有匹配结果';
        matchCount.textContent = `${count} 个匹配`;
        
        if (count > 0) {
            showMessage(`找到 ${count} 个匹配`, 'success');
        } else {
            showMessage('没有匹配结果', 'info');
        }
        
    } catch (error) {
        showMessage('XPath执行错误: ' + error.message, 'error');
        outputResult.value = '';
        matchCount.textContent = '0 个匹配';
    }
}

function getNodePath(node) {
    const path = [];
    let current = node;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
        let pathPart = current.nodeName;
        if (current.id) {
            pathPart += `#${current.id}`;
        } else if (current.className) {
            const classes = current.className.split(/\s+/).filter(c => c).slice(0, 2);
            if (classes.length > 0) {
                pathPart += `.${classes.join('.')}`;
            }
        }
        path.unshift(pathPart);
        current = current.parentNode;
    }
    
    return '/' + path.join('/');
}

function clearAll() {
    inputDoc.value = '';
    xpathInput.value = '';
    outputResult.value = '';
    matchCount.textContent = '0 个匹配';
    hideMessage();
}

function clearInput() {
    inputDoc.value = '';
    hideMessage();
}

function copyOutput() {
    if (!outputResult.value) {
        showMessage('没有内容可复制', 'error');
        return;
    }
    
    navigator.clipboard.writeText(outputResult.value).then(() => {
        showMessage('已复制到剪贴板！', 'success');
    }).catch(err => {
        console.error('复制失败: ', err);
        showMessage('复制失败，请手动复制', 'error');
    });
}

function loadSampleData() {
    const sampleDoc = `<bookstore>
    <book category="fiction">
        <title lang="en">Harry Potter</title>
        <author>J.K. Rowling</author>
        <year>2005</year>
        <price>29.99</price>
    </book>
    <book category="programming">
        <title lang="zh">JavaScript高级程序设计</title>
        <author>Nicholas C. Zakas</author>
        <year>2020</year>
        <price>49.99</price>
    </book>
    <book category="programming">
        <title lang="en">Clean Code</title>
        <author>Robert C. Martin</author>
        <year>2008</year>
        <price>35.99</price>
    </book>
</bookstore>`;
    
    inputDoc.value = sampleDoc;
    xpathInput.value = '//book[@category="programming"]/title';
    showMessage('已加载示例数据', 'success');
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