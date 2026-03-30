/*
 * coax的小工具 - 一套实用的前端工具集合
 * 
 * MIT License
 * 
 * Copyright (c) 2025 coax
 */

// 工具数据，每个工具都有分类
const tools = [
    {
        id: 1,
        title: "压图",
        description: "在线压缩图片，支持多种格式，在保证质量的同时减小文件大小。",
        link: "pages/image-compressor.html",
        icon: "🖼️",
        category: "common"
    },
    {
        id: 2,
        title: "随机密码",
        description: "生成高强度安全密码，可自定义长度和字符类型。",
        link: "pages/password-generator.html",
        icon: "🔐",
        category: "security"
    },
    {
        id: 3,
        title: "换算",
        description: "支持长度、重量、温度等多种单位之间的换算。",
        link: "pages/converter.html",
        icon: "⚖️",
        category: "common"
    },
    {
        id: 4,
        title: "JSON",
        description: "验证并格式化JSON数据，使其更易读和调试。",
        link: "pages/json-formatter.html",
        icon: "{ }",
        category: "dev"
    },
    {
        id: 5,
        title: "身份证",
        description: "生成模拟身份证信息用于测试开发，请勿用于非法用途。",
        link: "pages/id-generator.html",
        icon: "🪪",
        category: "dev"
    },
    {
        id: 6,
        title: "Docx",
        description: "将Word文档(.docx)转换为纯文本格式，方便内容提取和处理。",
        link: "pages/docx-converter.html",
        icon: "📝",
        category: "doc"
    },
    {
        id: 7,
        title: "模拟数据",
        description: "生成模拟数据，支持多种数据类型，可自定义生成数量。",
        link: "pages/data-generator.html",
        icon: "🎲",
        category: "data"
    },
    {
        id: 8,
        title: "切片",
        description: "将大文本文件按行数或文件大小进行分割，支持多种分割方式。",
        link: "pages/text-slicer.html",
        icon: "✂️",
        category: "text"
    },
    {
        id: 9,
        title: "阅读",
        description: "支持超大文件的分块加载和虚拟滚动显示，实现流畅的阅读体验。",
        link: "pages/text-reader.html",
        icon: "📖",
        category: "text"
    },
    {
        id: 10,
        title: "合并",
        description: "将多个纯文本文件合并成一个大文件并提供下载功能。",
        link: "pages/text-file-merger.html",
        icon: "📋",
        category: "text"
    },
    {
        id: 11,
        title: "Markdown",
        description: "实时预览 Markdown 内容，支持语法高亮和常用编辑功能。",
        link: "pages/markdown-editor.html",
        icon: "📝",
        category: "text"
    },
];

// 分类配置
const categoryConfig = {
    common: { name: "常用工具", order: 1 },
    text: { name: "文本处理", order: 2 },
    data: { name: "数据工具", order: 3 },
    dev: { name: "开发相关", order: 4 },
    security: { name: "安全相关", order: 5 },
    doc: { name: "文档处理", order: 6 },
};

let toolCards = [];
let categorySections = [];

document.addEventListener('DOMContentLoaded', function() {
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
    
    initSearch();
    renderTools(tools);
});

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
        // 显示所有分类和工具
        categorySections.forEach(section => {
            section.classList.remove('hidden');
        });
        toolCards.forEach(card => card.classList.remove('hidden'));
        if (noResults) noResults.classList.add('hidden');
        return;
    }
    
    let totalVisible = 0;
    
    categorySections.forEach(section => {
        const cards = section.querySelectorAll('.tool-card');
        let categoryVisible = 0;
        
        cards.forEach(card => {
            const title = card.dataset.title.toLowerCase();
            const desc = card.dataset.desc.toLowerCase();
            const match = title.includes(query) || desc.includes(query);
            card.classList.toggle('hidden', !match);
            if (match) {
                categoryVisible++;
                totalVisible++;
            }
        });
        
        // 如果该分类下没有可见工具，隐藏整个分类
        section.classList.toggle('hidden', categoryVisible === 0);
    });
    
    if (noResults) {
        noResults.classList.toggle('hidden', totalVisible > 0);
    }
}

function renderTools(toolsList) {
    const toolsGrid = document.getElementById('toolsGrid');
    const noResults = document.getElementById('noResults');
    if (!toolsGrid) return;
    
    toolsGrid.innerHTML = '';
    toolCards = [];
    categorySections = [];
    
    // 按分类分组
    const grouped = {};
    toolsList.forEach(tool => {
        const cat = tool.category || 'common';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(tool);
    });
    
    // 按配置的顺序遍历分类
    const sortedCategories = Object.keys(categoryConfig).sort(
        (a, b) => (categoryConfig[a].order || 99) - (categoryConfig[b].order || 99)
    );
    
    sortedCategories.forEach((catKey, catIndex) => {
        const catTools = grouped[catKey];
        if (!catTools || catTools.length === 0) return;
        
        const catName = categoryConfig[catKey]?.name || catKey;
        
        // 创建分类区块
        const section = document.createElement('section');
        section.className = 'tool-category';
        
        // 分类标题
        const header = document.createElement('div');
        header.className = 'category-header';
        header.innerHTML = `<span class="category-icon">📂</span><span class="category-name">${catName}</span><span class="category-count">(${catTools.length})</span>`;
        section.appendChild(header);
        
        // 工具网格
        const grid = document.createElement('div');
        grid.className = 'category-tools-grid';
        
        catTools.forEach((tool, index) => {
            const card = document.createElement('div');
            card.className = 'tool-card';
            card.dataset.title = tool.title;
            card.dataset.desc = tool.description;
            
            card.innerHTML = `
                <span class="card-icon">${tool.icon}</span>
                <h3>${tool.title}</h3>
                <p>${tool.description}</p>
                <div class="card-arrow"></div>
            `;
            
            card.addEventListener('click', function() {
                window.location.href = tool.link;
            });
            
            grid.appendChild(card);
            toolCards.push(card);
            
            // 交错入场动画
            const delay = (catIndex * 100) + (index * 60);
            setTimeout(() => {
                card.classList.add('animate');
            }, delay);
        });
        
        section.appendChild(grid);
        toolsGrid.appendChild(section);
        categorySections.push(section);
    });
    
    if (noResults) noResults.classList.add('hidden');
}
