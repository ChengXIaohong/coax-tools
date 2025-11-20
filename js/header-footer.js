document.addEventListener('DOMContentLoaded', function() {
    const header = document.getElementById('mainHeader');
    const footer = document.getElementById('mainFooter');
    const themeSwitcher = document.getElementById('themeSwitcher');
    let hideTimeout;
    let isHeaderVisible = true;
    
    // 主题切换功能
    // 获取当前主题设置，如果没有则默认跟随系统
    let currentTheme = localStorage.getItem('theme') || 'system';
    
    // 应用主题
    function applyTheme(theme) {
        if (theme === 'system') {
            // 跟随系统
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.setAttribute('data-theme', systemPrefersDark ? 'dark' : 'light');
        } else {
            // 使用指定主题
            document.body.setAttribute('data-theme', theme);
        }
        
        // 更新按钮图标
        updateThemeIcon(theme);
    }
    
    // 更新主题按钮图标
    function updateThemeIcon(theme) {
        if (theme === 'light') {
            themeSwitcher.textContent = '☀️'; // 太阳图标
        } else if (theme === 'dark') {
            themeSwitcher.textContent = '🌙'; // 月亮图标
        } else {
            themeSwitcher.textContent = '🌓'; // 半太阳半月亮图标
        }
    }
    
    // 切换主题
    function switchTheme() {
        if (currentTheme === 'system') {
            currentTheme = 'light';
        } else if (currentTheme === 'light') {
            currentTheme = 'dark';
        } else {
            currentTheme = 'system';
        }
        
        // 保存设置
        localStorage.setItem('theme', currentTheme);
        
        // 应用主题
        applyTheme(currentTheme);
    }
    
    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (currentTheme === 'system') {
            applyTheme('system');
        }
    });
    
    // 绑定点击事件
    themeSwitcher.addEventListener('click', switchTheme);
    
    // 初始化主题
    applyTheme(currentTheme);
    
    // 5秒后隐藏header
    hideTimeout = setTimeout(() => {
        header.classList.add('hidden');
        isHeaderVisible = false;
    }, 5000);
    
    // 监听鼠标移动到顶部边界时显示header
    document.addEventListener('mousemove', (e) => {
        if (e.clientY <= 5) {
            // 清除之前的隐藏定时器
            clearTimeout(hideTimeout);
            
            // 显示header
            header.classList.remove('hidden');
            isHeaderVisible = true;
            
            // 5秒后再次隐藏
            hideTimeout = setTimeout(() => {
                header.classList.add('hidden');
                isHeaderVisible = false;
            }, 5000);
        }
    });
    
    // 监听滚动事件控制footer显示/隐藏
    let lastScrollTop = 0;
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // 向下滚动时隐藏footer
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            footer.classList.add('hidden');
        } 
        // 滚动到顶部时显示footer
        else if (scrollTop === 0) {
            footer.classList.remove('hidden');
        }
        // 向上滚动且已经滚动了一定距离时显示footer
        else if (scrollTop < lastScrollTop && scrollTop > 100) {
            footer.classList.remove('hidden');
        }
        
        lastScrollTop = scrollTop;
    });
});