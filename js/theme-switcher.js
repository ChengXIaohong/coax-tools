/*
 * coax的小工具 - 一套实用的前端工具集合
 * 
 * MIT License
 * 
 * Copyright (c) 2025 coax
 */

const ThemeSwitcher = (function() {
    const MODE_KEY = 'coax-tools-mode';
    const DEFAULT_MODE = 'dark';

    let currentMode = DEFAULT_MODE;

    function init() {
        loadSavedMode();
        createThemeSwitcher();
        applyMode(currentMode);
        listenForThemeChanges();
    }

    function loadSavedMode() {
        const saved = localStorage.getItem(MODE_KEY);
        if (saved === 'light') {
            currentMode = 'light';
        } else if (saved === 'sci-fi') {
            currentMode = 'dark';
        }
        // 其他值（包括 null）保持默认 dark
    }

    function saveMode(mode) {
        localStorage.setItem(MODE_KEY, mode);
    }

    function createThemeSwitcher() {
        const existing = document.querySelector('.theme-switcher');
        if (existing) existing.remove();

        // 仅首页显示切换按钮
        if (!isHomePage()) return;

        const switcher = document.createElement('button');
        switcher.className = 'theme-switcher';
        switcher.setAttribute('aria-label', '切换明暗主题');

        switcher.addEventListener('click', () => {
            switchMode(currentMode === 'dark' ? 'light' : 'dark');
        });

        document.body.appendChild(switcher);
    }

    function isHomePage() {
        return window.location.pathname.endsWith('index.html') ||
               window.location.pathname.endsWith('/') ||
               window.location.pathname === '';
    }

    function listenForThemeChanges() {
        // 监听其他页面广播的主题变化事件
        window.addEventListener('coax-theme-change', (e) => {
            applyMode(e.detail.theme);
        });

        // 跨标签页同步（storage 事件）
        window.addEventListener('storage', (e) => {
            if (e.key === MODE_KEY) {
                loadSavedMode();
                applyMode(currentMode);
            }
        });
    }

    function applyMode(mode) {
        currentMode = mode;
        const themeValue = mode === 'light' ? 'light' : 'sci-fi';

        document.body.setAttribute('data-theme', themeValue);
        saveMode(themeValue);

        // 广播主题变化事件，通知同标签页的所有页面
        window.dispatchEvent(new CustomEvent('coax-theme-change', {
            detail: { theme: themeValue }
        }));

        const switcher = document.querySelector('.theme-switcher');
        if (switcher) {
            if (mode === 'dark') {
                switcher.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
                switcher.setAttribute('aria-label', '切换到浅色模式');
            } else {
                switcher.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
                switcher.setAttribute('aria-label', '切换到深色模式');
            }
        }
    }

    function switchMode(mode) {
        applyMode(mode);
    }

    function getCurrentMode() {
        return currentMode;
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        switchMode,
        getCurrentMode
    };
})();