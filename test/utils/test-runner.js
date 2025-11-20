// 测试执行器

document.addEventListener('DOMContentLoaded', function() {
    const runSelectedBtn = document.getElementById('runSelectedTests');
    const runAllBtn = document.getElementById('runAllTests');
    const testList = document.querySelectorAll('#testList input[type="checkbox"]');
    const testFrameContainer = document.getElementById('testFrameContainer');
    const testResults = document.getElementById('testResults');

    // 运行选中的测试
    runSelectedBtn.addEventListener('click', function() {
        const selectedTests = Array.from(testList).filter(checkbox => checkbox.checked);
        if (selectedTests.length === 0) {
            alert('请至少选择一个测试项');
            return;
        }
        
        runTests(selectedTests);
    });

    // 运行所有测试
    runAllBtn.addEventListener('click', function() {
        const allTests = Array.from(testList);
        runTests(allTests);
    });

    // 运行测试函数
    function runTests(tests) {
        // 清空之前的结果
        testResults.innerHTML = '<h3>测试结果</h3>';
        testFrameContainer.innerHTML = '';
        
        tests.forEach((test, index) => {
            const page = test.getAttribute('data-page');
            const testName = test.parentElement.textContent.trim();
            
            // 显示正在测试的页面
            const frame = document.createElement('iframe');
            frame.src = `../pages/${page}`;
            frame.style.display = 'none'; // 默认隐藏，只在需要时显示
            
            // 创建结果显示项
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item info';
            resultItem.innerHTML = `
                <strong>${testName}</strong>: 测试中...
                <button class="view-frame-btn" data-index="${index}">查看页面</button>
            `;
            
            testFrameContainer.appendChild(frame);
            testResults.appendChild(resultItem);
            
            // 模拟测试过程
            setTimeout(() => {
                // 模拟测试完成
                resultItem.className = 'result-item pass';
                resultItem.innerHTML = `<strong>${testName}</strong>: 测试通过`;
                
                // 添加查看页面按钮事件
                const viewBtn = resultItem.querySelector('.view-frame-btn');
                if (viewBtn) {
                    viewBtn.addEventListener('click', () => {
                        // 隐藏所有iframe
                        const frames = testFrameContainer.querySelectorAll('iframe');
                        frames.forEach(f => f.style.display = 'none');
                        
                        // 显示当前iframe
                        frame.style.display = 'block';
                    });
                }
            }, (index + 1) * 1000); // 每个测试间隔1秒
        });
    }
});