/*
 * coax的小工具 - 一套实用的前端工具集合
 * 
 * MIT License
 * 
 * Copyright (c) 2025 coax
 * 
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 * 
 *  The above copyright notice and this permission notice shall be included in all
 *  copies or substantial portions of the Software.
 * 
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *  SOFTWARE.
 * 
 *  一套实用的前端工具集合，包括文本处理、数据转换、文件操作等多种实用工具。
 *  源码可得，快乐加倍！记得给个Star哦~ 🌟
 */

// 公共脚本文件，包含所有页面共享的功能
document.addEventListener('DOMContentLoaded', function() {
    const footer = document.getElementById('pageFooter');
    let lastScrollTop = 0;
    
    // 监听滚动事件控制footer显示/隐藏
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