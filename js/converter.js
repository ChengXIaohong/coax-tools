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

// 获取DOM元素
const categorySelect = document.getElementById('category');
const fromUnitSelect = document.getElementById('fromUnit');
const toUnitSelect = document.getElementById('toUnit');
const fromValueInput = document.getElementById('fromValue');
const toValueInput = document.getElementById('toValue');
const converterForm = document.getElementById('converterForm');
const swapBtn = document.getElementById('swapBtn');
const resultDiv = document.getElementById('result');
const currentYearSpan = document.getElementById('currentYear');
// 帮助相关元素
const helpIcon = document.getElementById('helpIcon');
const helpModal = document.getElementById('helpModal');
const closeHelp = document.getElementById('closeHelp');

// 初始化年份
currentYearSpan.textContent = new Date().getFullYear();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    populateCategories();
    populateUnits();
    
    // 绑定事件监听器
    categorySelect.addEventListener('change', populateUnits);
    swapBtn.addEventListener('click', swapUnits);
    converterForm.addEventListener('submit', convertUnits);
    
    // 帮助功能事件监听
    helpIcon.addEventListener('click', function() {
        helpModal.classList.add('show');
    });
    
    closeHelp.addEventListener('click', function() {
        helpModal.classList.remove('show');
    });
    
    // 点击模态框外部关闭
    helpModal.addEventListener('click', function(event) {
        if (event.target === helpModal) {
            helpModal.classList.remove('show');
        }
    });
    
    // 添加输入框回车事件
    fromValueInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            convertUnits(event);
        }
    });
});

// 填充类别选项
function populateCategories() {
    Object.keys(UnitData).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = UnitData[key].name;
        categorySelect.appendChild(option);
    });
}

// 填充单位选项
function populateUnits() {
    // 清空现有选项
    fromUnitSelect.innerHTML = '';
    toUnitSelect.innerHTML = '';
    
    const category = categorySelect.value;
    const unitData = UnitData[category].units;
    
    Object.keys(unitData).forEach((key, index) => {
        // 添加到起始单位选择框
        const fromOption = document.createElement('option');
        fromOption.value = key;
        fromOption.textContent = unitData[key].name;
        fromUnitSelect.appendChild(fromOption);
        
        // 添加到目标单位选择框
        const toOption = document.createElement('option');
        toOption.value = key;
        toOption.textContent = unitData[key].name;
        toUnitSelect.appendChild(toOption);
        
        // 默认选中第一个作为起始单位，第二个作为目标单位
        if (index === 0) {
            fromOption.selected = true;
        } else if (index === 1) {
            toOption.selected = true;
        }
    });
}

// 交换单位
function swapUnits() {
    const tempUnit = fromUnitSelect.value;
    fromUnitSelect.value = toUnitSelect.value;
    toUnitSelect.value = tempUnit;
    
    // 交换数值
    const tempValue = fromValueInput.value;
    fromValueInput.value = toValueInput.value;
    toValueInput.value = tempValue;
    
    convertUnits(new Event('swap'));
}

// 转换单位
function convertUnits(event) {
    event.preventDefault();

    const category = categorySelect.value;
    const fromValue = parseFloat(fromValueInput.value);
    const fromUnit = fromUnitSelect.value;
    const toUnit = toUnitSelect.value;

    // 验证输入
    if (isNaN(fromValue)) {
        resultDiv.textContent = '请输入有效的数值';
        resultDiv.style.display = 'block';
        toValueInput.value = '';
        return;
    }

    let result;

    // 特殊处理温度转换
    if (category === 'temperature') {
        result = convertTemperature(fromValue, fromUnit, toUnit);
    } else {
        // 标准单位转换（基于因子）
        const fromFactor = UnitData[category].units[fromUnit].factor;
        const toFactor = UnitData[category].units[toUnit].factor;
        result = fromValue * fromFactor / toFactor;
    }

    // 显示结果
    toValueInput.value = result.toFixed(6).replace(/\.?0+$/, '');
    resultDiv.textContent = `${fromValue} ${UnitData[category].units[fromUnit].name} = ${toValueInput.value} ${UnitData[category].units[toUnit].name}`;
    resultDiv.style.display = 'block';
}

// 温度转换函数
function convertTemperature(value, fromUnit, toUnit) {
    // 先转换为摄氏度作为中间单位
    let celsius;
    switch (fromUnit) {
        case 'celsius':
            celsius = value;
            break;
        case 'fahrenheit':
            celsius = (value - 32) * 5/9;
            break;
        case 'kelvin':
            celsius = value - 273.15;
            break;
    }
    
    // 从摄氏度转换为目标单位
    switch (toUnit) {
        case 'celsius':
            return celsius;
        case 'fahrenheit':
            return celsius * 9/5 + 32;
        case 'kelvin':
            return celsius + 273.15;
    }
}
