/*
 * coax的小工具 - 主题切换（工具页）
 *
 * 在工具页顶栏注入一个纯文字的明暗切换按钮，无图标。
 * 与首页 (js/main.js) 共用同一个 localStorage 键和 data-theme 属性。
 *
 * MIT License
 * Copyright (c) 2025 coax
 */

const ThemeSwitcher = (function() {
    const MODE_KEY = 'coax-tools-mode';

    function getTheme() {
        return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    // 按钮上显示的是「切换后会变成的模式」
    function labelFor(theme) {
        return theme === 'dark' ? '浅色' : '深色';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem(MODE_KEY, theme);
        } catch (e) {
            /* 隐私模式下 localStorage 可能不可用，忽略 */
        }
        const btn = document.querySelector('.tool-theme-toggle');
        if (btn) {
            btn.textContent = labelFor(theme);
            btn.setAttribute('aria-label', theme === 'dark' ? '切换到浅色主题' : '切换到深色主题');
        }
    }

    function createSwitcher() {
        // 优先放进工具页顶栏；json-formatter 这类全屏工作区改用 .ws-bar
        const host = document.querySelector('.tool-header-bar') || document.querySelector('.ws-bar');
        // 没有承载容器的页面不注入
        if (!host || host.querySelector('.tool-theme-toggle')) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-theme-toggle';
        btn.textContent = labelFor(getTheme());
        btn.setAttribute('aria-label', '切换明暗主题');
        btn.addEventListener('click', function() {
            applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
        });
        host.appendChild(btn);
    }

    function init() {
        createSwitcher();

        // 跨标签页同步
        window.addEventListener('storage', function(e) {
            if (e.key === MODE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
                applyTheme(e.newValue);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        switchMode: applyTheme,
        getCurrentMode: getTheme
    };
})();
