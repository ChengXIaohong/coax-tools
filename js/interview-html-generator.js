// 面试题 HTML 生成器
// 使用方法：在 Node.js 环境中运行，或作为浏览器工具使用

/**
 * 将面试题数据转换为格式化的 HTML 文档
 * @param {Object} categoryData - 分类数据（包含 name 和 questions）
 * @returns {string} - 完整的 HTML 文档字符串
 */
function generateInterviewQuestionsHTML(categoryData) {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${categoryData.name} - Java 面试题</title>
    <style>
        body {
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 2rem;
            background: #f5f5f5;
        }
        .header {
            text-align: center;
            margin-bottom: 3rem;
            padding: 2rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
        }
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        .question-card {
            background: white;
            border-radius: 10px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .question-title {
            font-size: 1.5rem;
            color: #667eea;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #f0f0f0;
        }
        .section {
            margin-bottom: 1.5rem;
        }
        .section-title {
            font-size: 1.2rem;
            color: #667eea;
            margin-bottom: 0.8rem;
            padding-left: 0.8rem;
            border-left: 4px solid #667eea;
        }
        .key-points {
            list-style: none;
            padding-left: 0;
        }
        .key-points li {
            padding: 0.6rem 1rem;
            margin: 0.5rem 0;
            background: #f8f9fa;
            border-radius: 5px;
            border-left: 3px solid #667eea;
        }
        .answer {
            padding: 1.5rem;
            background: #f8f9fa;
            border-radius: 5px;
            line-height: 1.8;
            white-space: pre-wrap;
        }
        .expansion-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.8rem;
        }
        .expansion-tag {
            padding: 0.5rem 1rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 20px;
            font-size: 0.9rem;
        }
        .footer {
            text-align: center;
            margin-top: 3rem;
            padding: 2rem;
            color: #666;
        }
        @media (max-width: 768px) {
            body {
                padding: 1rem;
            }
            .header h1 {
                font-size: 1.8rem;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📚 Java 面试题精选</h1>
        <p>${categoryData.name} - 共${categoryData.questions.length}题</p>
    </div>

${categoryData.questions.map((q, index) => `
    <!-- 第${index + 1}题 -->
    <div class="question-card">
        <h2 class="question-title">第${index + 1}题：${q.question}</h2>
        
        <div class="section">
            <h3 class="section-title">🎯 考察点</h3>
            <ul class="key-points">
${q.keyPoints.map(point => `                <li>${point}</li>`).join('\n')}
            </ul>
        </div>
        
        <div class="section">
            <h3 class="section-title">💡 参考答案</h3>
            <div class="answer">${escapeHTML(q.answer)}</div>
        </div>
        
        <div class="section">
            <h3 class="section-title">🔍 拓展范围</h3>
            <div class="expansion-tags">
${q.expansion.map(tag => `                <span class="expansion-tag">${tag}</span>`).join('\n')}
            </div>
        </div>
    </div>`).join('\n')}

    <div class="footer">
        <p>&copy; ${new Date().getFullYear()} coax 的小工具。保留所有权利。</p>
        <p>本试卷由面试刷题模块自动生成 | 共 ${categoryData.questions.length} 题</p>
    </div>
</body>
</html>`;

    return html;
}

/**
 * HTML 转义函数
 * @param {string} text - 需要转义的文本
 * @returns {string} - 转义后的文本
 */
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 从 JSON 文件加载并生成指定分类的 HTML
 * @param {string} jsonPath - JSON 文件路径
 * @param {number} categoryIndex - 分类索引
 * @returns {Promise<string>} - 生成的 HTML 字符串
 */
async function loadAndGenerate(jsonPath, categoryIndex) {
    try {
        const response = await fetch(jsonPath);
        const data = await response.json();
        
        if (categoryIndex < 0 || categoryIndex >= data.categories.length) {
            throw new Error('分类索引超出范围');
        }
        
        const category = data.categories[categoryIndex];
        return generateInterviewQuestionsHTML(category);
    } catch (error) {
        console.error('生成失败:', error);
        throw error;
    }
}

/**
 * 下载生成的 HTML 文件
 * @param {string} html - HTML 内容
 * @param {string} filename - 文件名
 */
function downloadHTML(html, filename) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// 如果在浏览器环境中，导出为全局函数
if (typeof window !== 'undefined') {
    window.InterviewQuestionGenerator = {
        generateHTML: generateInterviewQuestionsHTML,
        loadAndGenerate: loadAndGenerate,
        downloadHTML: downloadHTML
    };
}

// 如果在 Node.js 环境中，导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateInterviewQuestionsHTML,
        escapeHTML
    };
}
