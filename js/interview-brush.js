// DOM 元素
const categorySelect = document.getElementById('categorySelect');
const progressSection = document.getElementById('progressSection');
const questionSection = document.getElementById('questionSection');
const emptyState = document.getElementById('emptyState');
const completionState = document.getElementById('completionState');
const currentCategory = document.getElementById('currentCategory');
const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');
const questionNumber = document.getElementById('questionNumber');
const questionText = document.getElementById('questionText');
const keyPoints = document.getElementById('keyPoints');
const answerContent = document.getElementById('answerContent');
const expansionTags = document.getElementById('expansionTags');
const showAnswerBtn = document.getElementById('showAnswerBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const randomBtn = document.getElementById('randomBtn');
const exportBtn = document.getElementById('exportBtn');
const chooseCategoryBtn = document.getElementById('chooseCategoryBtn');
const messageDiv = document.getElementById('message');
const currentYearSpan = document.getElementById('currentYear');

// 当前状态
let questionsData = null;
let currentCategoryIndex = -1;
let currentQuestionIndex = 0;
let answeredCount = 0;

// 初始化年份
currentYearSpan.textContent = new Date().getFullYear();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadQuestionsData();
});

// 加载题目数据
async function loadQuestionsData() {
    try {
        const response = await fetch('../data/interview-questions.json');
        if (!response.ok) {
            throw new Error('加载题目数据失败');
        }
        questionsData = await response.json();
        initCategorySelect();
    } catch (error) {
        showMessage('加载题目数据失败：' + error.message, 'error');
        console.error('加载数据失败:', error);
    }
}

// 初始化分类选择器
function initCategorySelect() {
    categorySelect.innerHTML = '<option value="">-- 请选择面试类型 --</option>';
    
    questionsData.categories.forEach((category, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${category.name}（${category.questions.length}题）`;
        categorySelect.appendChild(option);
    });
    
    // 监听分类选择
    categorySelect.addEventListener('change', handleCategoryChange);
    
    // 默认选择第一个分类（计算机基础）
    categorySelect.value = '0';
    currentCategoryIndex = 0;
    showCategory(0);
}

// 处理分类变化
function handleCategoryChange(e) {
    const selectedIndex = e.target.value;
    
    if (selectedIndex === '') {
        resetState();
        return;
    }
    
    currentCategoryIndex = parseInt(selectedIndex);
    currentQuestionIndex = 0;
    answeredCount = 0;
    
    showCategory(currentCategoryIndex);
}

// 显示指定分类的题目
function showCategory(categoryIndex) {
    const category = questionsData.categories[categoryIndex];
    
    // 更新 UI 状态
    emptyState.style.display = 'none';
    completionState.style.display = 'none';
    progressSection.style.display = 'block';
    questionSection.style.display = 'block';
    
    // 更新进度信息
    currentCategory.textContent = category.name;
    updateProgress();
    
    // 显示第一题
    showQuestion(0);
}

// 重置状态
function resetState() {
    currentCategoryIndex = -1;
    currentQuestionIndex = 0;
    answeredCount = 0;
    
    emptyState.style.display = 'block';
    completionState.style.display = 'none';
    progressSection.style.display = 'none';
    questionSection.style.display = 'none';
}

// 更新进度显示
function updateProgress() {
    const category = questionsData.categories[currentCategoryIndex];
    const total = category.questions.length;
    const current = currentQuestionIndex + 1;
    
    progressText.textContent = `${current}/${total}`;
    const percentage = (current / total) * 100;
    progressFill.style.width = percentage + '%';
}

// 显示指定题目
function showQuestion(index) {
    const category = questionsData.categories[currentCategoryIndex];
    const question = category.questions[index];
    
    // 更新题号
    questionNumber.textContent = `第 ${index + 1} 题`;
    
    // 更新题目文本
    questionText.textContent = question.question;
    
    // 更新考察点
    keyPoints.innerHTML = '';
    question.keyPoints.forEach(point => {
        const li = document.createElement('li');
        li.textContent = point;
        keyPoints.appendChild(li);
    });
    
    // 更新答案（默认显示）
    answerContent.textContent = question.answer;
    answerContent.classList.add('show');
    showAnswerBtn.textContent = '隐藏答案';
    
    // 更新拓展标签
    expansionTags.innerHTML = '';
    question.expansion.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'expansion-tag';
        span.textContent = tag;
        expansionTags.appendChild(span);
    });
    
    // 更新按钮状态
    prevBtn.disabled = index === 0;
    nextBtn.disabled = false;
    
    // 更新进度
    currentQuestionIndex = index;
    updateProgress();
    
    // 检查是否完成
    if (index === category.questions.length - 1 && answeredCount >= category.questions.length) {
        showCompletion();
    }
}

// 显示答案
function toggleAnswer() {
    if (answerContent.classList.contains('show')) {
        answerContent.classList.remove('show');
        showAnswerBtn.textContent = '查看答案';
    } else {
        answerContent.classList.add('show');
        showAnswerBtn.textContent = '隐藏答案';
        
        // 记录已答题数
        if (!isCurrentQuestionAnswered()) {
            answeredCount++;
            updateProgress();
        }
    }
}

// 检查当前题目是否已回答
function isCurrentQuestionAnswered() {
    // 简单实现：如果答案显示则认为已回答
    return answerContent.classList.contains('show');
}

// 上一题
function prevQuestion() {
    if (currentQuestionIndex > 0) {
        showQuestion(currentQuestionIndex - 1);
    }
}

// 下一题
function nextQuestion() {
    const category = questionsData.categories[currentCategoryIndex];
    
    if (currentQuestionIndex < category.questions.length - 1) {
        showQuestion(currentQuestionIndex + 1);
    } else {
        // 已经是最后一题
        if (answeredCount >= category.questions.length) {
            showCompletion();
        } else {
            showMessage('恭喜！已完成本分类所有题目', 'success');
        }
    }
}

// 随机一题
function randomQuestion() {
    const category = questionsData.categories[currentCategoryIndex];
    const randomIndex = Math.floor(Math.random() * category.questions.length);
    showQuestion(randomIndex);
    showMessage('已随机选择一道题目', 'info');
}

// 显示完成状态
function showCompletion() {
    questionSection.style.display = 'none';
    completionState.style.display = 'block';
}

// 导出为文档
function exportToDocument() {
    const category = questionsData.categories[currentCategoryIndex];
    let content = `${category.name} - Java 面试题\n\n`;
    content += '='.repeat(50) + '\n\n';
    
    category.questions.forEach((q, index) => {
        content += `【第${index + 1}题】${q.question}\n\n`;
        content += `🎯 考察点：\n`;
        q.keyPoints.forEach(point => {
            content += `  • ${point}\n`;
        });
        content += `\n💡 参考答案：\n${q.answer}\n`;
        content += `\n🔍 拓展范围：${q.expansion.join('、')}\n`;
        content += '\n' + '-'.repeat(50) + '\n\n';
    });
    
    // 创建下载
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${category.name}-面试题.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    showMessage('文档已生成并下载', 'success');
}

// 事件监听
showAnswerBtn.addEventListener('click', toggleAnswer);
prevBtn.addEventListener('click', prevQuestion);
nextBtn.addEventListener('click', nextQuestion);
randomBtn.addEventListener('click', randomQuestion);
exportBtn.addEventListener('click', exportToDocument);
chooseCategoryBtn.addEventListener('click', function() {
    categorySelect.value = '';
    resetState();
});

// 键盘快捷键支持
document.addEventListener('keydown', function(e) {
    // 只在题目区域显示时生效
    if (questionSection.style.display === 'none') return;
    
    switch(e.key) {
        case ' ':
        case 'Enter':
            e.preventDefault();
            toggleAnswer();
            break;
        case 'ArrowLeft':
            if (currentQuestionIndex > 0) {
                prevQuestion();
            }
            break;
        case 'ArrowRight':
            if (currentQuestionIndex < questionsData.categories[currentCategoryIndex].questions.length - 1) {
                nextQuestion();
            }
            break;
        case 'r':
        case 'R':
            randomQuestion();
            break;
    }
});

// 显示消息
function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = 'message';
    messageDiv.classList.add(type + '-message');
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        hideMessage();
    }, 3000);
}

// 隐藏消息
function hideMessage() {
    messageDiv.style.display = 'none';
}
