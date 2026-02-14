// 工具数据
const tools = [
    {
        id: 1,
        title: "文本转换工具",
        description: "提供各种文本格式转换功能，包括大小写转换、编码转换等。柑橘有点鸡肋",
        link: "pages/text-converter.html"
    },
    {
        id: 2,
        title: "图片压缩工具",
        description: "在线压缩图片，支持多种格式，在保证质量的同时减小文件大小。这个我喜欢",
        link: "pages/image-compressor.html"
    },
    {
        id: 3,
        title: "密码生成器",
        description: "生成高强度安全密码，可自定义长度和字符类型。小声逼逼：想不通谁会用50位的密码，我反正是不会。",
        link: "pages/password-generator.html"
    },
    {
        id: 4,
        title: "单位换算器",
        description: "支持长度、重量、温度等多种单位之间的换算。等站住以后给你们搞点高级的单位换算",
        link: "pages/converter.html"
    },
    {
        id: 5,
        title: "时间戳转换",
        description: "快速将时间戳转换为可读日期，或将日期转换为时间戳。感觉这个也有点鸡肋，但是我用的也多，奇了怪了真是",
        link: "pages/timestamp-converter.html"
    },
    {
        id: 6,
        title: "JSON格式化",
        description: "验证并格式化JSON数据，使其更易读和调试。可视化操作空间有点小，但是谁让站住懒呢，先这样吧",
        link: "pages/json-formatter.html"
    },
    {
        id: 7,
        title: "身份证信息生成器",
        description: "生成模拟身份证信息用于测试开发，请勿用于非法用途。可不敢乱用啊,can not see me,🤐🤐🤐 ",
        link: "pages/id-generator.html"
    },
    {
        id: 8,
        title: "Docx转文本工具",
        description: "将Word文档(.docx)转换为纯文本格式，方便内容提取和处理。感觉用到的场景不多啊，先简单兼容一下吧",
        link: "pages/docx-converter.html"
    },
    {
        id: 9,
        title: "模拟数据生成器",
        description: "生成模拟数据，支持多种数据类型。可自定义生成数量和数据类型。",
        link: "pages/data-generator.html"
    },
    {
        id: 10,
        title: "文本文件切片工具",
        description: "将大文本文件按行数或文件大小进行分割，支持多种分割方式和自定义参数设置。",
        link: "pages/text-slicer.html"
    },
    {
        id: 11,
        title: "大文本文件阅读器",
        description: "支持超大文件的分块加载和虚拟滚动显示，实现流畅的阅读体验。",
        link: "pages/text-reader.html"
    },
    {
        id: 12,
        title: "文本文件合成器",
        description: "将多个纯文本文件合并成一个大文件并提供下载功能，方便批量处理文本文件。",
        link: "pages/text-file-merger.html"
    },
    {
        id: 13,
        title: "GPU性能测试",
        description: "基于WebGL的交互式3D体积渲染器，毒蘑菇的复刻，也不知道最开始是哪位大佬贡献的，暂时引用不了",
        link: "pages/gpu-test.html"
    },
    {
        id: 14,
        title: "敏感词校验器",
        description: "检测文本中的敏感词，支持自定义敏感词库，帮助用户过滤不当内容。",
        link: "pages/sensitive-word-checker.html"
    },
    {
        id: 15,
        title: "本地音乐播放器",
        description: "支持多种音频格式的本地音乐播放，可创建播放列表，调节音量和进度。",
        link: "pages/music-player.html"
    }
];

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 设置当前年份
    const currentYear = new Date().getFullYear();
    document.getElementById('currentYear').textContent = currentYear;
    
    const toolsGrid = document.getElementById('toolsGrid');
    
    // 动态生成工具卡片
    tools.forEach((tool, index) => {
        const toolCard = document.createElement('div');
        toolCard.className = 'tool-card';
        toolCard.innerHTML = `
            <h3>${tool.title}</h3>
            <p>${tool.description}</p>
            <a href="${tool.link}" class="btn">立即使用</a>
        `;
        toolsGrid.appendChild(toolCard);
        
        // 为每个卡片添加 staggered 动画延迟
        setTimeout(() => {
            toolCard.classList.add('animate');
        }, index * 100); // 每个卡片延迟100毫秒
    });
    
    // 为工具卡片添加鼠标悬停事件
    const toolCards = document.querySelectorAll('.tool-card');
    toolCards.forEach((card, index) => {
        card.addEventListener('mouseenter', function() {
            // 生成更浅、更优雅的随机渐变色
            // 限制色调范围，避免过深的颜色
            const hue1 = Math.floor(Math.random() * 360);
            const hue2 = (hue1 + 60 + Math.floor(Math.random() * 60)) % 360; // 保持色相差异较小，形成和谐搭配
            const saturation = 40 + Math.floor(Math.random() * 30); // 降低饱和度(40-70)，避免过于鲜艳
            const lightness = 60 + Math.floor(Math.random() * 20);  // 提高亮度(60-80)，确保颜色足够浅
            
            // 应用渐变背景
            this.style.background = `linear-gradient(135deg, 
                hsl(${hue1}, ${saturation}%, ${lightness}%), 
                hsl(${hue2}, ${saturation}%, ${lightness}%))`;
            
            // 根据背景亮度调整按钮颜色，确保对比度
            const btn = this.querySelector('.btn');
            // 使用更优雅的深灰色渐变替代纯黑色
            btn.style.background = 'linear-gradient(135deg, #4a5568, #2d3748)';
            btn.style.color = 'white';
        });
        
        card.addEventListener('mouseleave', function() {
            // 恢复原始背景
            this.style.background = 'white';
            
            // 恢复按钮默认样式
            const btn = this.querySelector('.btn');
            btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            btn.style.color = 'white';
        });
        
        // 阻止卡片内链接的默认行为，使用自定义页面过渡
        const link = card.querySelector('.btn');
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            navigateToPage(href);
        });
    });
    
    // 处理浏览器后退按钮
    window.addEventListener('popstate', function(event) {
        if (event.state && event.state.page) {
            showMainPage();
        }
    });
});

// 导航到指定页面
function navigateToPage(pageUrl) {
    // 创建过渡元素
    createPageTransitionElements();
    
    // 显示遮罩层和返回按钮
    document.querySelector('.overlay').classList.add('active');
    document.querySelector('.back-button').style.display = 'flex';
    
    // 从左侧滑入页面
    const pageTransition = document.querySelector('.page-transition');
    
    // 使用绝对路径确保正确加载页面
    // 基于当前页面构建正确的绝对路径
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    const absoluteUrl = baseUrl + pageUrl;
    
    pageTransition.innerHTML = `<iframe src="${absoluteUrl}" style="width:100%; height:100%; border:none;"></iframe>`;
    pageTransition.classList.add('slide-in-left');
    setTimeout(() => {
        pageTransition.classList.add('active');
    }, 10);
}

// 创建页面过渡元素
function createPageTransitionElements() {
    // 创建遮罩层
    if (!document.querySelector('.overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.addEventListener('click', showMainPage);
        document.body.appendChild(overlay);
    }
    
    // 创建返回按钮
    if (!document.querySelector('.back-button')) {
        const backButton = document.createElement('div');
        backButton.className = 'back-button';
        backButton.innerHTML = '←';
        backButton.addEventListener('click', showMainPage);
        document.body.appendChild(backButton);
    }
    
    // 创建页面过渡容器
    if (!document.querySelector('.page-transition')) {
        const pageTransition = document.createElement('div');
        pageTransition.className = 'page-transition';
        document.body.appendChild(pageTransition);
    }
}

// 显示主页
function showMainPage() {
    const pageTransition = document.querySelector('.page-transition');
    const overlay = document.querySelector('.overlay');
    const backButton = document.querySelector('.back-button');
    
    // 移除了自动保存阅读器进度的功能
    
    // 从右侧滑出页面
    pageTransition.classList.remove('slide-in-left');
    pageTransition.classList.add('slide-out-right');
    
    // 移除历史记录
    if (history.state && history.state.page) {
        history.back();
    }
    
    setTimeout(() => {
        // 隐藏过渡元素
        pageTransition.classList.remove('active', 'slide-out-right');
        overlay.classList.remove('active');
        backButton.style.display = 'none';
    }, 500);
}