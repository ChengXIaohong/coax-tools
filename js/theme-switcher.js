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
        // TODO: 主题切换功能暂时禁用，默认暗色系
        // loadSavedMode();
        // createThemeSwitcher();
        // applyMode(currentMode);
        // listenForThemeChanges();
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

        const switcher = document.querySelector('.theme-switcher');
        if (switcher) {
            if (mode === 'dark') {
                switcher.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" stroke-width="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
                switcher.setAttribute('aria-label', '切换到浅色模式');
            } else {
                switcher.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" stroke-width="1.5"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"></path><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/></svg>';
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