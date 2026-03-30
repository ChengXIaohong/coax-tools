/*
 * 单位换算器 - Apple Design Style
 * 
 * 遵循 Apple Human Interface Guidelines 设计规范
 */

// 获取DOM元素
const categorySelect = document.getElementById('category');
const categoryMobileSelect = document.getElementById('categoryMobile');
const fromUnitSelect = document.getElementById('fromUnit');
const toUnitSelect = document.getElementById('toUnit');
const fromValueInput = document.getElementById('fromValue');
const toValueInput = document.getElementById('toValue');
const converterForm = document.getElementById('converterForm');
const swapBtn = document.getElementById('swapBtn');
const resultDiv = document.getElementById('result');
const currentYearSpan = document.getElementById('currentYear');
const convertBtn = document.getElementById('convertBtn');
const copyBtn = document.getElementById('copyBtn');
const resultArea = document.getElementById('resultArea');
const clearErrorBtn = document.getElementById('clearError');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');

// 分类标签与面板
const categoryTabs = document.getElementById('categoryTabs');
const categoryDetail = document.getElementById('categoryDetail');


// 单位下拉相关元素
const fromUnitWrapper = document.getElementById('fromUnitWrapper');
const toUnitWrapper = document.getElementById('toUnitWrapper');
const fromUnitDropdown = document.getElementById('fromUnitDropdown');
const toUnitDropdown = document.getElementById('toUnitDropdown');
const fromUnitList = document.getElementById('fromUnitList');
const toUnitList = document.getElementById('toUnitList');

// 常用单位映射（每类别的常用单位）
const commonUnits = {
    length: ['millimeter', 'centimeter', 'meter', 'kilometer', 'inch', 'foot'],
    weight: ['milligram', 'gram', 'kilogram', 'ton', 'ounce', 'pound'],
    temperature: ['celsius', 'fahrenheit', 'kelvin'],
    area: ['square_centimeter', 'square_meter', 'hectare', 'square_inch', 'square_foot', 'acre'],
    volume: ['milliliter', 'liter', 'cubic_centimeter', 'cubic_meter', 'teaspoon', 'tablespoon', 'fluid_ounce', 'gallon_us'],
    speed: ['meter_per_second', 'kilometer_per_hour', 'mile_per_hour', 'foot_per_second', 'knot'],
    force: ['newton', 'kilonewton', 'pound_force', 'kilogram_force'],
    pressure: ['pascal', 'kilopascal', 'megapascal', 'bar', 'atmosphere', 'psi', 'mmhg'],
    power: ['watt', 'kilowatt', 'megawatt', 'horsepower_metric'],
    energy: ['joule', 'kilojoule', 'calorie', 'kilocalorie', 'watt_hour', 'kilowatt_hour', 'btu'],
    angle: ['degree', 'radian', 'gradian'],
    flow_rate: ['cubic_meter_per_second', 'cubic_meter_per_hour', 'liter_per_second', 'liter_per_minute', 'gallon_per_minute_us']
};

// 初始化年份
if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    populateCategories();
    populateUnits();
    initTabs();

    initUnitDropdowns();
    initFullscreenToggle();
    initKeyboardShortcuts();
    initMobileCategorySelect();
    initThemeToggle();
    
    // 绑定事件监听器
    categorySelect.addEventListener('change', function() {
        populateUnits();
        switchTab(this.value);
    });
    
    swapBtn.addEventListener('click', swapUnits);
    converterForm.addEventListener('submit', convertUnits);
    
    // 复制按钮事件
    copyBtn.addEventListener('click', copyResult);
    
    // 交换结果按钮事件
    const swapResultBtn = document.getElementById('swapResultBtn');
    if (swapResultBtn) {
        swapResultBtn.addEventListener('click', swapUnits);
    }
    
    // 点击结果文字交换两侧
    resultDiv.addEventListener('click', function() {
        if (fromValueInput.value && toValueInput.value) {
            swapUnits();
        }
    });
    
    // 清除错误按钮
    clearErrorBtn.addEventListener('click', clearInputError);
    
    // 输入框事件
    fromValueInput.addEventListener('input', function() {
        if (this.value) {
            clearInputError();
        }
    });
    
    fromValueInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            convertUnits(e);
        }
    });
    
    // 点击外部关闭更多分类下拉
    document.addEventListener('click', function(e) {
        if (!moreTabsDropdown.contains(e.target)) {
            moreTabsDropdown.classList.remove('open');
        }
    });
    
    // 点击外部关闭单位下拉
    document.addEventListener('click', function(e) {
        if (!fromUnitWrapper.contains(e.target)) {
            fromUnitDropdown.classList.remove('open');
        }
        if (!toUnitWrapper.contains(e.target)) {
            toUnitDropdown.classList.remove('open');
        }
    });
});

// 初始化移动端分类选择
function initMobileCategorySelect() {
    if (!categoryMobileSelect) return;
    
    categoryMobileSelect.addEventListener('change', function() {
        switchTab(this.value);
    });
}

// 初始化主题切换
function initThemeToggle() {
    if (!themeToggleBtn) return;
    
    // 根据当前状态设置图标
    updateThemeIcon();
    
    themeToggleBtn.addEventListener('click', function() {
        if (document.body.hasAttribute('data-mode') && document.body.getAttribute('data-mode') === 'light') {
            document.body.removeAttribute('data-mode');
        } else {
            document.body.setAttribute('data-mode', 'light');
        }
        updateThemeIcon();
    });
}

function updateThemeIcon() {
    if (!themeToggleBtn) return;
    const icon = themeToggleBtn.querySelector('.material-icons');
    if (document.body.hasAttribute('data-mode') && document.body.getAttribute('data-mode') === 'light') {
        icon.textContent = 'light_mode';
        themeToggleBtn.title = '切换到深色模式';
    } else {
        icon.textContent = 'dark_mode';
        themeToggleBtn.title = '切换到浅色模式';
    }
}

// 初始化全屏切换
function initFullscreenToggle() {
    if (!fullscreenBtn) return;
    
    fullscreenBtn.addEventListener('click', function() {
        toggleFullscreen();
    });
    
    // ESC 退出全屏
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.body.classList.contains('fullscreen-mode')) {
            toggleFullscreen();
        }
    });
}

function toggleFullscreen() {
    document.body.classList.toggle('fullscreen-mode');
    const icon = fullscreenBtn.querySelector('.material-icons');
    if (document.body.classList.contains('fullscreen-mode')) {
        icon.textContent = 'fullscreen_exit';
        fullscreenBtn.title = '退出全屏';
    } else {
        icon.textContent = 'fullscreen';
        fullscreenBtn.title = '全屏模式';
    }
}

// 初始化键盘快捷键
function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // 全局 Enter 触发转换（不在按钮或链接上时）
        if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A' && e.target.tagName !== 'SELECT') {
            e.preventDefault();
            convertUnits(e);
        }
        
        // 方向键支持单位快速切换（当焦点在输入框或单位选择器上时）
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && 
            (document.activeElement === fromUnitSelect || document.activeElement === toUnitSelect)) {
            e.preventDefault();
            navigateUnits(e.key === 'ArrowLeft' ? -1 : 1, document.activeElement);
        }
    });
}

// 方向键切换单位
function navigateUnits(direction, selectEl) {
    const options = selectEl.options;
    const currentIndex = selectEl.selectedIndex;
    let newIndex = currentIndex + direction;
    
    // 循环切换
    if (newIndex < 0) newIndex = options.length - 1;
    if (newIndex >= options.length) newIndex = 0;
    
    selectEl.selectedIndex = newIndex;
    selectEl.dispatchEvent(new Event('change'));
    
    // 更新下拉列表显示
    if (selectEl === fromUnitSelect) {
        updateUnitDropdown(fromUnitList, fromUnitSelect.value);
    } else {
        updateUnitDropdown(toUnitList, toUnitSelect.value);
    }
}

// 初始化标签切换
function initTabs() {
    const tabBtns = categoryTabs.querySelectorAll('.tab-btn[data-tab]');
    const overviewTags = categoryDetail.querySelectorAll('.overview-tag[data-goto]');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            switchTab(tab);
        });
    });
    
    overviewTags.forEach(tag => {
        tag.addEventListener('click', function() {
            const tab = this.dataset.goto;
            switchTab(tab);
        });
    });
}

// 切换标签
function switchTab(tab) {
    const tabBtns = categoryTabs.querySelectorAll('.tab-btn[data-tab]');
    const panels = categoryDetail.querySelectorAll('.detail-panel');
    
    tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
        // 添加切换动画
        if (btn.dataset.tab === tab) {
            btn.classList.add('switching');
            setTimeout(() => btn.classList.remove('switching'), 200);
        }
    });
    
    panels.forEach(panel => {
        panel.classList.toggle('active', panel.dataset.panel === tab);
    });
    
    // 同步更新 hidden select（categorySelect）并刷新单位列表
    if (tab !== 'overview') {
        categorySelect.value = tab;
        if (categoryMobileSelect) {
            categoryMobileSelect.value = tab;
        }
        populateUnits();
    } else {
        if (categoryMobileSelect) {
            categoryMobileSelect.value = 'overview';
        }
    }
}

// 填充类别选项
function populateCategories() {
    categorySelect.innerHTML = '';
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
    
    // 更新下拉列表
    updateUnitDropdown(fromUnitList, fromUnitSelect.value);
    updateUnitDropdown(toUnitList, toUnitSelect.value);
}

// 初始化单位下拉
function initUnitDropdowns() {
    // 源单位下拉
    fromUnitSelect.addEventListener('focus', function() {
        updateUnitDropdown(fromUnitList, this.value);
        fromUnitDropdown.classList.add('open');
        toUnitDropdown.classList.remove('open');
    });
    
    fromUnitSelect.addEventListener('change', function() {
        updateUnitDropdown(fromUnitList, this.value);
    });
    
    // 目标单位下拉
    toUnitSelect.addEventListener('focus', function() {
        updateUnitDropdown(toUnitList, this.value);
        toUnitDropdown.classList.add('open');
        fromUnitDropdown.classList.remove('open');
    });
    
    toUnitSelect.addEventListener('change', function() {
        updateUnitDropdown(toUnitList, this.value);
    });
    
    // 下拉标签切换
    setupDropdownTabs(fromUnitWrapper, fromUnitDropdown, fromUnitSelect);
    setupDropdownTabs(toUnitWrapper, toUnitDropdown, toUnitSelect);
}

function setupDropdownTabs(wrapper, dropdown, select) {
    const tabs = dropdown.querySelectorAll('.dropdown-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.stopPropagation();
            const view = this.dataset.view;
            
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            renderUnitList(dropdown.querySelector('.dropdown-unit-list'), select.value, view);
        });
    });
}

function updateUnitDropdown(listEl, selectedValue) {
    renderUnitList(listEl, selectedValue, 'common');
}

function renderUnitList(listEl, selectedValue, view) {
    const category = categorySelect.value;
    const unitData = UnitData[category].units;
    const commonList = commonUnits[category] || [];
    
    listEl.innerHTML = '';
    
    const units = view === 'common' 
        ? Object.keys(unitData).filter(key => commonList.includes(key))
        : Object.keys(unitData);
    
    units.forEach(key => {
        const unit = unitData[key];
        const div = document.createElement('div');
        div.className = 'dropdown-unit' + (key === selectedValue ? ' selected' : '');
        div.innerHTML = `
            <span>${unit.name}</span>
            ${view === 'common' && commonList.includes(key) ? '<span class="unit-common-tag">常用</span>' : ''}
        `;
        
        div.addEventListener('click', function(e) {
            e.stopPropagation();
            const wrapper = listEl.closest('.unit-select-wrapper');
            const select = wrapper.querySelector('select');
            select.value = key;
            
            // 触发 change 事件
            select.dispatchEvent(new Event('change'));
            
            // 关闭下拉
            wrapper.querySelector('.unit-dropdown-panel').classList.remove('open');
            
            // 更新其他下拉
            if (listEl === fromUnitList) {
                updateUnitDropdown(toUnitList, toUnitSelect.value);
            } else {
                updateUnitDropdown(fromUnitList, fromUnitSelect.value);
            }
        });
        
        listEl.appendChild(div);
    });
    
    // 如果常用列表为空，显示全部
    if (view === 'common' && units.length === 0) {
        listEl.innerHTML = '<div class="dropdown-unit" style="color: var(--apple-text-tertiary); justify-content: center;">暂无常用单位</div>';
    }
}

// 清除输入错误状态
function clearInputError() {
    fromValueInput.classList.remove('error');
}

// 设置输入错误状态
function setInputError() {
    fromValueInput.classList.add('error');
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
    
    // 更新下拉列表
    updateUnitDropdown(fromUnitList, fromUnitSelect.value);
    updateUnitDropdown(toUnitList, toUnitSelect.value);
    
    // 如果有结果则重新转换
    if (fromValueInput.value) {
        convertUnits(new Event('swap'));
    }
}

// 设置加载状态
function setLoading(isLoading) {
    if (isLoading) {
        convertBtn.classList.add('loading');
        convertBtn.disabled = true;
    } else {
        convertBtn.classList.remove('loading');
        convertBtn.disabled = false;
    }
}

// 设置完成状态
function setDone(isDone) {
    if (isDone) {
        convertBtn.classList.add('done');
    } else {
        convertBtn.classList.remove('done');
    }
}

// 复制结果
function copyResult() {
    const resultText = resultDiv.textContent;
    const originalHTML = copyBtn.innerHTML;
    
    navigator.clipboard.writeText(resultText).then(() => {
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = '<span class="material-icons">check</span>已复制';
        
        setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = originalHTML;
        }, 2000);
    }).catch(err => {
        console.error('复制失败:', err);
    });
}

// 转换单位
function convertUnits(event) {
    event.preventDefault();

    const category = categorySelect.value;
    const fromValue = parseFloat(fromValueInput.value);
    const fromUnit = fromUnitSelect.value;
    const toUnit = toUnitSelect.value;

    // 验证输入
    if (isNaN(fromValue) || fromValueInput.value.trim() === '') {
        setInputError();
        resultDiv.textContent = '请输入有效的数值';
        resultArea.classList.add('show');
        toValueInput.value = '';
        return;
    }

    // 设置加载状态
    setLoading(true);
    
    // 模拟异步处理（视觉效果）
    setTimeout(() => {
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
        resultArea.classList.add('show');
        
        // 取消加载状态
        setLoading(false);
        
        // 设置完成状态，2秒后恢复
        setDone(true);
        setTimeout(() => {
            setDone(false);
        }, 2000);
    }, 300);
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
