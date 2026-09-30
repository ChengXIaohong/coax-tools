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
        icon: "image",
        category: "common"
    },
    {
        id: 4,
        title: "JSON",
        description: "验证并格式化JSON数据，使其更易读和调试。",
        link: "pages/json-formatter.html",
        icon: "braces",
        category: "dev"
    },
    {
        id: 5,
        title: "身份证",
        description: "生成模拟身份证信息用于测试开发，请勿用于非法用途。",
        link: "pages/id-generator.html",
        icon: "id-card",
        category: "dev"
    },
    {
        id: 7,
        title: "模拟数据",
        description: "生成模拟数据，支持多种数据类型，可自定义生成数量。",
        link: "pages/data-generator.html",
        icon: "database",
        category: "data"
    },
    {
        id: 12,
        title: "字符画",
        description: "将文字转换为炫酷的 ASCII Art 效果，支持多种字体风格，可导出为图片。",
        link: "pages/ascii-art.html",
        icon: "terminal",
        category: "text"
    },
    {
        id: 14,
        title: "文字云",
        description: "将文本或 CSV 数据生成漂亮的词云图片，支持多种形状和配色方案。",
        link: "pages/word-cloud.html",
        icon: "cloud",
        category: "data"
    },
    {
        id: 15,
        title: "图转字",
        description: "将图片转换为 ASCII 字符画，支持多种字符集和灰度调节。",
        link: "pages/image-to-ascii.html",
        icon: "monitor",
        category: "common"
    },
    {
        id: 17,
        title: "Txt转Epub",
        description: "将 TXT 文本文件转换为 EPUB 电子书，支持自动章节解析和封面设置。",
        link: "pages/txt-to-epub.html",
        icon: "book",
        category: "doc"
    },
];

// 分类配置：name 为完整名称，short 为 Tab 上的短标签
const categoryConfig = {
    common: { name: "常用工具", short: "常用", order: 1 },
    text: { name: "文本处理", short: "文本", order: 2 },
    data: { name: "数据工具", short: "数据", order: 3 },
    dev: { name: "开发相关", short: "开发", order: 4 },
    doc: { name: "文档处理", short: "文档", order: 6 },
};

// 24px 单色线性图标，替代彩色 / emoji 图标
const ICONS = {
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m4 17 5-4 4 3 3-2 4 3"/></svg>',
    braces: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4c-2 0-2.5 1-2.5 3v2c0 1.5-.5 3-2 3 1.5 0 2 1.5 2 3v2c0 2 .5 3 2.5 3"/><path d="M16 4c2 0 2.5 1 2.5 3v2c0 1.5.5 3 2 3-1.5 0-2 1.5-2 3v2c0 2-.5 3-2.5 3"/></svg>',
    "id-card": '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M4.5 16c.6-1.4 1.9-2 3.5-2s2.9.6 3.5 2"/><path d="M15 10h4"/><path d="M15 14h3"/></svg>',
    database: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/></svg>',
    terminal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3"/><path d="M13 15h4"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.2 11.2 3.5 3.5 0 0 0 7 18Z"/><path d="M10 22 12 14l2 8M9.2 18.4h5.6"/></svg>',
    monitor: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><path d="M6 12.5 8.5 10l2 1.8 2.5-3 3 3.7"/></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z"/><path d="M4 5v14"/><path d="M8 7h7"/><path d="M8 11h5"/></svg>',
};

let toolCards = [];
let activeCategory = 'all';
let activeQuery = '';

document.addEventListener('DOMContentLoaded', function() {
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    initThemeToggle();
    initSearch();
    renderCategories();
    renderTools(tools);
});

/* ========================================
   主题切换：纯文字按钮，无图标
   ======================================== */

function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('coax-tools-mode', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) {
        // 按钮显示的是「切换后会变成的模式」
        btn.textContent = theme === 'dark' ? '浅色' : '深色';
    }
}

function initThemeToggle() {
    const btn = document.getElementById('themeToggle');
    applyTheme(currentTheme());
    if (!btn) return;
    btn.addEventListener('click', function() {
        applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
}

/* ========================================
   搜索
   ======================================== */

function initSearch() {
    const searchInput = document.getElementById('toolSearch');
    if (!searchInput) return;

    // 实时过滤，直接 DOM 更新，无过渡动画
    searchInput.addEventListener('input', function() {
        activeQuery = this.value.trim().toLowerCase();
        applyFilter();
    });

    document.addEventListener('keydown', function(e) {
        const active = document.activeElement;
        const typing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');

        // ⌘K / Ctrl+K 聚焦搜索框
        if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
            return;
        }

        // 保留原有的 "/" 快捷键
        if (e.key === '/' && !typing) {
            e.preventDefault();
            searchInput.focus();
        }
    });
}

/* ========================================
   分类 Tab
   ======================================== */

function renderCategories() {
    const bar = document.getElementById('catBar');
    if (!bar) return;

    // 按配置顺序排列，只列出实际存在工具的分类
    const keys = Object.keys(categoryConfig)
        .filter(key => tools.some(t => (t.category || 'common') === key))
        .sort((a, b) => (categoryConfig[a].order || 99) - (categoryConfig[b].order || 99));

    const items = [{ key: 'all', short: '全部', count: tools.length }]
        .concat(keys.map(key => ({
            key: key,
            short: categoryConfig[key].short,
            count: tools.filter(t => (t.category || 'common') === key).length
        })));

    bar.innerHTML = '';

    items.forEach(item => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'catbar__item' + (item.key === activeCategory ? ' is-active' : '');
        btn.dataset.category = item.key;
        btn.innerHTML = `${item.short}<span class="catbar__count">${item.count}</span>`;
        btn.addEventListener('click', function() {
            if (activeCategory === item.key) return;
            activeCategory = item.key;
            markActiveCategory();
            switchCategory();
        });
        bar.appendChild(btn);
    });
}

function markActiveCategory() {
    document.querySelectorAll('.catbar__item').forEach(el => {
        el.classList.toggle('is-active', el.dataset.category === activeCategory);
    });
}

function switchCategory() {
    const grid = document.getElementById('toolsGrid');
    if (!grid) {
        applyFilter();
        return;
    }
    // 最多 120ms 的透明度过渡，不做缩放或位移动画
    grid.classList.add('is-switching');
    setTimeout(function() {
        applyFilter();
        grid.classList.remove('is-switching');
    }, 120);
}

/* ========================================
   过滤
   ======================================== */

function applyFilter() {
    const noResults = document.getElementById('noResults');
    let totalVisible = 0;

    toolCards.forEach(function(entry) {
        const matchesCategory = activeCategory === 'all' || entry.category === activeCategory;
        const matchesQuery = !activeQuery
            || entry.searchText.includes(activeQuery);
        const visible = matchesCategory && matchesQuery;
        entry.el.classList.toggle('hidden', !visible);
        if (visible) totalVisible++;
    });

    if (noResults) {
        noResults.classList.toggle('hidden', totalVisible > 0);
    }
}

/* ========================================
   渲染
   ======================================== */

function renderTools(toolsList) {
    const toolsGrid = document.getElementById('toolsGrid');
    const noResults = document.getElementById('noResults');
    if (!toolsGrid) return;

    toolsGrid.innerHTML = '';
    toolCards = [];

    toolsList.forEach(function(tool) {
        const category = tool.category || 'common';
        const catName = categoryConfig[category]?.short || category;

        const card = document.createElement('div');
        card.className = 'tool-card';
        card.dataset.title = tool.title;
        card.dataset.desc = tool.description;
        card.setAttribute('role', 'link');
        card.setAttribute('tabindex', '0');

        card.innerHTML = `
            <div class="tool-card__head">
                <span class="tool-card__icon">${ICONS[tool.icon] || ICONS.image}</span>
                <span class="tool-card__tag">[${catName}]</span>
            </div>
            <h3 class="tool-card__title">${tool.title}</h3>
            <p class="tool-card__desc">${tool.description}</p>
            <div class="tool-card__meta"><span>~/${tool.link}</span></div>
        `;

        // 路由保持不变：点击直接进入工具页
        card.addEventListener('click', function() {
            window.location.href = tool.link;
        });
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                window.location.href = tool.link;
            }
        });

        toolsGrid.appendChild(card);
        toolCards.push({
            el: card,
            category: category,
            searchText: (tool.title + ' ' + tool.description + ' ' + catName).toLowerCase()
        });
    });

    if (noResults) noResults.classList.add('hidden');
}
