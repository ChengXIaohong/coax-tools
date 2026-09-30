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
        id: 7,
        title: "模拟数据",
        description: "生成模拟数据，支持多种数据类型，可自定义生成数量。",
        link: "pages/data-generator.html",
        icon: "🎲",
        category: "data"
    },
    {
        id: 12,
        title: "字符画",
        description: "将文字转换为炫酷的 ASCII Art 效果，支持多种字体风格，可导出为图片。",
        link: "pages/ascii-art.html",
        icon: "🎨",
        category: "text"
    },
    {
        id: 14,
        title: "文字云",
        description: "将文本或 CSV 数据生成漂亮的词云图片，支持多种形状和配色方案。",
        link: "pages/word-cloud.html",
        icon: "☁️",
        category: "data"
    },
    {
        id: 15,
        title: "图转字",
        description: "将图片转换为 ASCII 字符画，支持多种字符集和灰度调节。",
        link: "pages/image-to-ascii.html",
        icon: "💻",
        category: "common"
    },
    {
        id: 17,
        title: "Txt转Epub",
        description: "将 TXT 文本文件转换为 EPUB 电子书，支持自动章节解析和封面设置。",
        link: "pages/txt-to-epub.html",
        icon: "📚",
        category: "doc"
    },
];

// 分类配置
const categoryConfig = {
    common: { name: "常用工具", order: 1 },
    text: { name: "文本处理", order: 2 },
    data: { name: "数据工具", order: 3 },
    dev: { name: "开发相关", order: 4 },
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
        
        // 分类图标 SVG
        const categoryIcons = {
            common: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
            text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
            data: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
            dev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
            doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
        };

        // 分类标题
        const header = document.createElement('div');
        header.className = 'category-header';
        header.innerHTML = `<span class="category-icon">${categoryIcons[catKey] || categoryIcons.common}</span><span class="category-name">${catName}</span><span class="category-count">(${catTools.length})</span>`;
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
            
            card.addEventListener('click', function(e) {
                // 添加涟漪效果
                const rect = card.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                card.style.setProperty('--ripple-x', x + '%');
                card.style.setProperty('--ripple-y', y + '%');
                card.classList.remove('ripple');
                void card.offsetWidth; // 强制重绘
                card.classList.add('ripple');

                // 延迟跳转，让涟漪效果先显示
                setTimeout(() => {
                    window.location.href = tool.link;
                }, 150);
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
