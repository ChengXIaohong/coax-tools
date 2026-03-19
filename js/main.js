/*
 * coax的小工具 - 一套实用的前端工具集合
 * 
 * MIT License
 * 
 * Copyright (c) 2025 coax
 */

const tools = [
    {
        id: 1,
        title: "压图",
        description: "在线压缩图片，支持多种格式，在保证质量的同时减小文件大小。",
        link: "pages/image-compressor.html"
    },
    {
        id: 2,
        title: "随机密码",
        description: "生成高强度安全密码，可自定义长度和字符类型。",
        link: "pages/password-generator.html"
    },
    {
        id: 3,
        title: "换算",
        description: "支持长度、重量、温度等多种单位之间的换算。",
        link: "pages/converter.html"
    },
    {
        id: 4,
        title: "JSON",
        description: "验证并格式化JSON数据，使其更易读和调试。",
        link: "pages/json-formatter.html"
    },
    {
        id: 5,
        title: "身份证",
        description: "生成模拟身份证信息用于测试开发，请勿用于非法用途。",
        link: "pages/id-generator.html"
    },
    {
        id: 6,
        title: "Docx",
        description: "将Word文档(.docx)转换为纯文本格式，方便内容提取和处理。",
        link: "pages/docx-converter.html"
    },
    {
        id: 7,
        title: "模拟数据",
        description: "生成模拟数据，支持多种数据类型，可自定义生成数量。",
        link: "pages/data-generator.html"
    },
    {
        id: 8,
        title: "切片",
        description: "将大文本文件按行数或文件大小进行分割，支持多种分割方式。",
        link: "pages/text-slicer.html"
    },
    {
        id: 9,
        title: "阅读",
        description: "支持超大文件的分块加载和虚拟滚动显示，实现流畅的阅读体验。",
        link: "pages/text-reader.html"
    },
    {
        id: 10,
        title: "合并",
        description: "将多个纯文本文件合并成一个大文件并提供下载功能。",
        link: "pages/text-file-merger.html"
    },
    {
        id: 11,
        title: "面试题",
        description: "提供10年Java程序员面试题，涵盖计算机基础、网络、Linux、数据结构等。",
        link: "pages/interview-brush.html"
    },
    {
        id: 12,
        title: "颜色",
        description: "支持HEX、RGB、RGBA、HSL、HSB格式互转，带实时预览。",
        link: "pages/color-converter.html"
    }
];

let toolCards = [];

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
    
    let cursor = document.querySelector('.type-cursor');
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.className = 'type-cursor';
        document.body.appendChild(cursor);
    }
    cursor.classList.add('active');
    
    toolsList.forEach((tool, index) => {
        const card = document.createElement('div');
        card.className = 'tool-card';
        card.dataset.title = tool.title;
        card.dataset.desc = tool.description;
        card.innerHTML = `
            <h3>${tool.title}</h3>
            <p>${tool.description}</p>
        `;
        
        card.addEventListener('click', function() {
            window.location.href = tool.link;
        });
        
        toolsGrid.appendChild(card);
        toolCards.push(card);
        
        setTimeout(() => {
            card.classList.add('animate');
            requestAnimationFrame(() => {
                const h3 = card.querySelector('h3');
                const rect = h3.getBoundingClientRect();
                cursor.style.left = rect.right + 'px';
                cursor.style.top = rect.top + 'px';
                
                if (index === toolsList.length - 1) {
                    setTimeout(() => {
                        cursor.classList.remove('active');
                    }, 150);
                }
            });
        }, index * 50);
    });
    
    if (noResults) noResults.classList.add('hidden');
}
