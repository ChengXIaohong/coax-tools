/*
 * coax的小工具 - 一套实用的前端工具集合
 * 
 * MIT License
 * 
 * Copyright (c) 2025 coax
 */

const tools = [
    {
        id: 2,
        title: "图片压缩工具",
        description: "在线压缩图片，支持多种格式，在保证质量的同时减小文件大小。",
        link: "pages/image-compressor.html"
    },
    {
        id: 3,
        title: "密码生成器",
        description: "生成高强度安全密码，可自定义长度和字符类型。",
        link: "pages/password-generator.html"
    },
    {
        id: 4,
        title: "单位换算器",
        description: "支持长度、重量、温度等多种单位之间的换算。",
        link: "pages/converter.html"
    },
    {
        id: 5,
        title: "JSON格式化",
        description: "验证并格式化JSON数据，使其更易读和调试。",
        link: "pages/json-formatter.html"
    },
    {
        id: 6,
        title: "身份证信息生成器",
        description: "生成模拟身份证信息用于测试开发，请勿用于非法用途。",
        link: "pages/id-generator.html"
    },
    {
        id: 7,
        title: "Docx转文本工具",
        description: "将Word文档(.docx)转换为纯文本格式，方便内容提取和处理。",
        link: "pages/docx-converter.html"
    },
    {
        id: 8,
        title: "模拟数据生成器",
        description: "生成模拟数据，支持多种数据类型，可自定义生成数量。",
        link: "pages/data-generator.html"
    },
    {
        id: 9,
        title: "文本文件切片工具",
        description: "将大文本文件按行数或文件大小进行分割，支持多种分割方式。",
        link: "pages/text-slicer.html"
    },
    {
        id: 10,
        title: "大文本文件阅读器",
        description: "支持超大文件的分块加载和虚拟滚动显示，实现流畅的阅读体验。",
        link: "pages/text-reader.html"
    },
    {
        id: 11,
        title: "文本文件合成器",
        description: "将多个纯文本文件合并成一个大文件并提供下载功能。",
        link: "pages/text-file-merger.html"
    },
    {
        id: 12,
        title: "面试刷题",
        description: "提供10年Java程序员面试题，涵盖计算机基础、网络、Linux、数据结构等。",
        link: "pages/interview-brush.html"
    },
    {
        id: 14,
        title: "XPath测试器",
        description: "实时测试XPath表达式，从XML/HTML文档中提取内容。",
        link: "pages/xpath-tester.html"
    },
    {
        id: 13,
        title: "颜色格式转换",
        description: "支持HEX、RGB、RGBA、HSL、HSB格式互转，带实时预览。",
        link: "pages/color-converter.html"
    }
];

const TITLE_KEY = 'coax-tools-title';
const DEFAULT_TITLE = 'coax的小工具';

let toolCards = [];

document.addEventListener('DOMContentLoaded', function() {
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
    
    initEditableTitle();
    initSearch();
    renderTools(tools);
});

function initEditableTitle() {
    const titleText = document.getElementById('titleText');
    const titleInput = document.getElementById('titleInput');
    const editBtn = document.getElementById('titleEditBtn');
    
    if (!titleText || !titleInput || !editBtn) return;
    
    const savedTitle = localStorage.getItem(TITLE_KEY);
    if (savedTitle) {
        titleText.textContent = savedTitle;
    }
    
    titleText.addEventListener('click', function() {
        titleText.classList.add('hidden');
        titleInput.classList.remove('hidden');
        titleInput.focus();
        titleInput.select();
    });
    
    editBtn.addEventListener('click', function() {
        titleText.classList.add('hidden');
        titleInput.classList.remove('hidden');
        titleInput.focus();
        titleInput.select();
    });
    
    function saveTitle() {
        const newTitle = titleInput.value.trim() || DEFAULT_TITLE;
        titleText.textContent = newTitle;
        localStorage.setItem(TITLE_KEY, newTitle);
        titleInput.classList.add('hidden');
        titleText.classList.remove('hidden');
    }
    
    titleInput.addEventListener('blur', saveTitle);
    titleInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveTitle();
        } else if (e.key === 'Escape') {
            titleInput.value = titleText.textContent;
            titleInput.classList.add('hidden');
            titleText.classList.remove('hidden');
        }
    });
}

function initSearch() {
    const searchInput = document.getElementById('toolSearch');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        filterTools(query);
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            searchInput.focus();
        }
    });
}

function filterTools(query) {
    const noResults = document.getElementById('noResults');
    
    if (!query) {
        toolCards.forEach(card => card.classList.remove('hidden'));
        if (noResults) noResults.classList.add('hidden');
        return;
    }
    
    let visibleCount = 0;
    toolCards.forEach(card => {
        const title = card.dataset.title.toLowerCase();
        const desc = card.dataset.desc.toLowerCase();
        const match = title.includes(query) || desc.includes(query);
        card.classList.toggle('hidden', !match);
        if (match) visibleCount++;
    });
    
    if (noResults) {
        noResults.classList.toggle('hidden', visibleCount > 0);
    }
}

function renderTools(toolsList) {
    const toolsGrid = document.getElementById('toolsGrid');
    const noResults = document.getElementById('noResults');
    if (!toolsGrid) return;
    
    toolsGrid.innerHTML = '';
    toolCards = [];
    
    toolsList.forEach((tool, index) => {
        const card = document.createElement('div');
        card.className = 'tool-card';
        card.dataset.title = tool.title;
        card.dataset.desc = tool.description;
        card.innerHTML = `
            <h3>${tool.title}</h3>
            <p>${tool.description}</p>
            <a href="${tool.link}" class="btn">立即使用</a>
        `;
        
        card.addEventListener('click', function(e) {
            if (!e.target.classList.contains('btn')) {
                const link = this.querySelector('.btn');
                if (link) {
                    e.preventDefault();
                    window.location.href = link.href;
                }
            }
        });
        
        toolsGrid.appendChild(card);
        toolCards.push(card);
        
        setTimeout(() => {
            card.classList.add('animate');
        }, index * 50);
    });
    
    if (noResults) noResults.classList.add('hidden');
}
