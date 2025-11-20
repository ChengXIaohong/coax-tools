// 贵州IP地址段
const GUZHOU_IP_CIDRS = [
    "1.204.0.0/14", "111.120.0.0/14", "1.48.0.0/15", "119.0.0.0/15", 
    "114.138.0.0/15", "222.86.0.0/15", "106.2.0.0/15", "111.124.0.0/16", 
    "120.30.0.0/16", "42.186.0.0/16", "58.16.0.0/16", "114.135.0.0/16", 
    "58.42.0.0/16", "111.85.0.0/16", "59.51.128.0/17", "222.85.128.0/17", 
    "61.189.128.0/17", "61.159.128.0/17", "122.152.192.0/18", "221.13.0.0/22", 
    "202.101.64.0/19", "219.151.0.0/19", "202.98.192.0/19", "103.22.24.0/22", 
    "103.3.152.0/22"
];

// 贵阳手机号前缀
const GUIYANG_PREFIXES = ["138", "139", "158", "159"];
// 其他省份手机号前缀
const OTHER_PREFIXES = ["133", "135", "150", "151"];

// 存储所有贵州IP地址的列表
let guizhouIpPool = [];

// 初始化贵州IP池
function initGuizhouIpPool() {
    guizhouIpPool = [];
    GUZHOU_IP_CIDRS.forEach(cidr => {
        try {
            const ipRange = cidr.split('/');
            const baseIp = ipRange[0];
            const prefix = parseInt(ipRange[1]);
            
            const baseParts = baseIp.split('.').map(Number);
            
            // 生成部分IP地址，避免生成过多数据
            const ipCount = Math.min(256, Math.pow(2, 32 - prefix));
            
            for (let i = 0; i < ipCount; i++) {
                const ip = [
                    baseParts[0],
                    baseParts[1],
                    (baseParts[2] + Math.floor(i / 256)) % 256,
                    i % 256
                ].join('.');
                guizhouIpPool.push(ip);
            }
        } catch (e) {
            console.error("处理CIDR时出错:", cidr, e);
        }
    });
    
    // 如果IP池为空，则添加一些默认IP
    if (guizhouIpPool.length === 0) {
        guizhouIpPool = [
            "1.204.0.1", "1.204.0.2", "1.204.0.3", 
            "111.120.0.1", "111.120.0.2", "111.120.0.3"
        ];
    }
}

// 生成贵州IP地址
function generateGuizhouIp() {
    const randomIndex = Math.floor(Math.random() * guizhouIpPool.length);
    return guizhouIpPool[randomIndex];
}

// 生成手机号
function generatePhoneNumber() {
    // 85%概率使用贵阳前缀
    const isGuiyang = Math.random() < 0.85;
    const prefixes = isGuiyang ? GUIYANG_PREFIXES : OTHER_PREFIXES;
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    
    // 生成后四位数字
    const last = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // 返回格式：前3位 + ***** + 后2位
    return `${prefix}****${last.substring(0, 2)}`;
}

// 生成客户姓名
function generateRandomName() {
    const surname = IdData.surnames[Math.floor(Math.random() * IdData.surnames.length)];
    let name = '';

    // 调整名字长度比例，限制最大长度为3个字
    const nameLength = (() => {
        const rand = Math.random();
        if (rand < 0.7) return 2; // 70%概率生成两个字的名字
        if (rand < 0.9) return 3; // 20%概率生成三个字的名字
        return 3; // 10%概率生成三个字的名字（限制最大长度）
    })();

    for (let i = 0; i < nameLength; i++) {
        name += IdData.givenNames[Math.floor(Math.random() * IdData.givenNames.length)];
    }

    // 限制名字的最大长度为3个字，避免脱敏后显示过长
    if (name.length > 3) {
        name = name.substring(0, 3);
    }

    // 根据选择的脱敏方式处理姓名
    const maskMiddle = document.getElementById('maskMiddle').checked;
    if (maskMiddle) {
        // 脱敏中间一位
        if (name.length === 1) {
            return surname + '*';
        } else if (name.length === 2) {
            return surname + '*';
        } else if (name.length === 3) {
            return surname + '*' + name.charAt(2);
        } else if (name.length === 4) {
            return surname + '*' + name.charAt(2);
        } else {
            // 对于其他长度的名字，只脱敏第二个字
            return surname + '*' + name.substring(3);
        }
    } else {
        // 第一位之后全部脱敏
        // 限制脱敏后的总长度，避免显示过长
        const maskedLength = Math.min(name.length, 3);
        return surname + '*'.repeat(maskedLength);
    }
}

// 生成贵州车牌号
function generatePlateNumber() {
    // 贵州车牌字母范围：A-J
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 10)); // A-J
    // 生成5位数字
    const digits = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    // 替换第2位和第3位为*
    return `贵${letter}${digits[0]}**${digits.substring(3)}`;
}

// 生成访问时间
function generateAccessTime() {
    // 生成最近30天内的随机时间
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30天前
    const timeRangeMs = now.getTime() - startDate.getTime();
    const randomMs = Math.random() * timeRangeMs;
    const accessDate = new Date(startDate.getTime() + randomMs);
    
    return accessDate.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).replace(/\//g, '/');
}

// 获取用户选择的生成选项
function getGenerationOptions() {
    return {
        index: document.getElementById('generateIndex').checked,
        ip: document.getElementById('generateIp').checked,
        phone: document.getElementById('generatePhone').checked,
        plate: document.getElementById('generatePlate').checked,
        time: document.getElementById('generateTime').checked,
        name: document.getElementById('generateName').checked
    };
}

// 预览生成
document.getElementById('previewBtn').addEventListener('click', previewGeneration);

// 开始生成数据
document.getElementById('startBtn').addEventListener('click', startGeneration);

// 预览生成函数
function previewGeneration() {
    // 显示进度条
    document.getElementById('progressContainer').style.display = 'block';
    
    // 在后台开始处理数据
    setTimeout(() => processPreviewData(), 100);
}

// 处理预览数据
async function processPreviewData() {
    try {
        initGuizhouIpPool();
        
        // 获取用户输入的行数
        const rowCount = parseInt(document.getElementById('rowCount').value) || 100;
        
        // 获取用户选择的生成选项
        const options = getGenerationOptions();
        
        // 创建新的工作簿用于预览
        const previewWorkbook = XLSX.utils.book_new();
        
        // 根据用户选择构建表头
        const detailHeader = [];
        if (options.index) detailHeader.push("序号");
        if (options.ip) detailHeader.push("IP地址");
        if (options.phone) detailHeader.push("客户电话");
        if (options.plate) detailHeader.push("车牌号");
        if (options.time) detailHeader.push("访问时间");
        if (options.name) detailHeader.push("客户姓名");
        
        // 生成少量数据（最多10条）用于预览
        const previewCount = Math.min(10, rowCount);
        const detailData = [detailHeader];
        
        for (let j = 0; j < previewCount; j++) {
            const dataRow = [];
            
            // 根据用户选择生成数据
            if (options.index) dataRow.push(j + 1);                    // 序号
            if (options.ip) dataRow.push(generateGuizhouIp());         // IP地址
            if (options.phone) dataRow.push(generatePhoneNumber());    // 手机号
            if (options.plate) dataRow.push(generatePlateNumber());    // 车牌号
            if (options.time) dataRow.push(generateAccessTime());      // 访问时间
            if (options.name) dataRow.push(generateRandomName());      // 客户姓名
            
            detailData.push(dataRow);
        }
        
        // 创建新的工作表
        const detailWorksheet = XLSX.utils.aoa_to_sheet(detailData);
        
        // 为新工作表设置样式
        applyStylesToSheet(detailWorksheet, detailData.length, true);
        
        // 为新工作表设置列宽
        const colWidths = [];
        if (options.index) colWidths.push({ wch: 8 });    // 序号
        if (options.ip) colWidths.push({ wch: 15 });      // IP地址
        if (options.phone) colWidths.push({ wch: 15 });   // 客户电话
        if (options.plate) colWidths.push({ wch: 12 });   // 车牌号
        if (options.time) colWidths.push({ wch: 20 });    // 访问时间
        if (options.name) colWidths.push({ wch: 12 });    // 客户姓名
        
        setColumnWidths(detailWorksheet, colWidths);
        
        XLSX.utils.book_append_sheet(previewWorkbook, detailWorksheet, "数据预览");
        
        // 完成预览数据生成，显示模态窗口
        document.getElementById('progressText').textContent = '预览数据生成完成';
        
        // 显示模态窗口
        showPreviewModal(previewWorkbook);
        
    } catch (error) {
        console.error('处理数据时出错:', error);
        alert(`处理数据时出错: ${error.message}`);
    }
}

// 显示预览模态窗口
function showPreviewModal(workbook) {
    const modal = document.getElementById('previewModal');
    const modalContent = document.getElementById('modalPreviewContent');
    
    // 构建预览表格
    let html = '<h3>预览数据示例</h3>';
    
    // 显示详情表数据
    for (let i = 0; i < workbook.SheetNames.length; i++) {
        const sheetName = workbook.SheetNames[i];
        html += `<h4 style="margin-top: 20px;">${sheetName} (示例数据)</h4>`;
        
        const detailWorksheet = workbook.Sheets[sheetName];
        const detailData = XLSX.utils.sheet_to_json(detailWorksheet, { header: 1, defval: '' });
        
        // 只显示前几行作为预览
        const detailPreview = detailData.slice(0, 11);
        
        if (detailPreview.length > 0) {
            html += '<table class="modal-table"><thead><tr>';
            
            // 表头
            detailPreview[0].forEach((header) => {
                html += `<th>${header}</th>`;
            });
            html += '</tr></thead><tbody>';
            
            // 数据行
            detailPreview.slice(1).forEach((row) => {
                html += '<tr>';
                row.forEach(cell => {
                    html += `<td>${cell || ''}</td>`;
                });
                html += '</tr>';
            });
            
            html += '</tbody></table>';
        }
    }
    
    modalContent.innerHTML = html;
    modal.style.display = 'block';
}

// 关闭模态窗口
function closePreviewModal() {
    document.getElementById('previewModal').style.display = 'none';
}

// 确认生成
function confirmGeneration() {
    closePreviewModal();
    // 开始完整生成
    startGeneration();
}

// 开始完整生成
function startGeneration() {
    // 显示进度条
    document.getElementById('progressContainer').style.display = 'block';
    document.getElementById('progressText').textContent = '准备中...';
    
    // 在后台开始处理数据
    setTimeout(() => processFullData(), 100);
}

// 处理完整数据
async function processFullData() {
    try {
        initGuizhouIpPool();
        
        // 获取用户输入的行数
        const rowCount = parseInt(document.getElementById('rowCount').value) || 100;
        
        // 获取用户选择的生成选项
        const options = getGenerationOptions();
        
        // 创建新的工作簿
        const newWorkbook = XLSX.utils.book_new();
        
        // 根据用户选择构建表头
        const detailHeader = [];
        if (options.index) detailHeader.push("序号");
        if (options.ip) detailHeader.push("IP地址");
        if (options.phone) detailHeader.push("客户电话");
        if (options.plate) detailHeader.push("车牌号");
        if (options.time) detailHeader.push("访问时间");
        if (options.name) detailHeader.push("客户姓名");
        
        // 生成数据
        const detailData = [detailHeader];
        
        for (let j = 0; j < rowCount; j++) {
            const dataRow = [];
            
            // 根据用户选择生成数据
            if (options.index) dataRow.push(j + 1);                    // 序号
            if (options.ip) dataRow.push(generateGuizhouIp());         // IP地址
            if (options.phone) dataRow.push(generatePhoneNumber());    // 手机号
            if (options.plate) dataRow.push(generatePlateNumber());    // 车牌号
            if (options.time) dataRow.push(generateAccessTime());      // 访问时间
            if (options.name) dataRow.push(generateRandomName());      // 客户姓名
            
            detailData.push(dataRow);
            
            // 更新进度
            if (j % 100 === 0) {
                const progressPercent = Math.round((j / rowCount) * 100);
                document.getElementById('progressFill').style.width = `${progressPercent}%`;
                document.getElementById('progressText').textContent = `正在生成数据: ${j}/${rowCount}`;
                
                // 添加小延迟以避免阻塞UI
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }
        
        // 更新最终进度
        document.getElementById('progressFill').style.width = '100%';
        document.getElementById('progressText').textContent = '生成完成，正在下载...';
        
        // 创建新的工作表
        const detailWorksheet = XLSX.utils.aoa_to_sheet(detailData);
        
        // 为新工作表设置样式
        applyStylesToSheet(detailWorksheet, detailData.length, true);
        
        // 为新工作表设置列宽
        const colWidths = [];
        if (options.index) colWidths.push({ wch: 8 });    // 序号
        if (options.ip) colWidths.push({ wch: 15 });      // IP地址
        if (options.phone) colWidths.push({ wch: 15 });   // 客户电话
        if (options.plate) colWidths.push({ wch: 12 });   // 车牌号
        if (options.time) colWidths.push({ wch: 20 });    // 访问时间
        if (options.name) colWidths.push({ wch: 12 });    // 客户姓名
        
        setColumnWidths(detailWorksheet, colWidths);
        
        XLSX.utils.book_append_sheet(newWorkbook, detailWorksheet, "数据");
        
        // 导出文件
        const outputFile = `数据_${rowCount}条.xlsx`;
        XLSX.writeFile(newWorkbook, outputFile);
        
        // 完成提示
        document.getElementById('progressText').textContent = '已完成!';
        alert('数据生成完成，文件已下载！');
        
    } catch (error) {
        console.error('处理数据时出错:', error);
        alert(`处理数据时出错: ${error.message}`);
    }
}

// 为工作表应用样式
function applyStylesToSheet(worksheet, rowCount, isDetailSheet) {
    // 设置表头样式（如果可能）
    try {
        // 获取工作表范围
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        
        // 为表头行设置样式
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_cell({ r: 0, c: C });
            if (!worksheet[address]) continue;
            
            // 尝试添加样式（注意：这些样式可能不会在所有环境中生效）
            if (!worksheet[address].s) worksheet[address].s = {};
            worksheet[address].s.font = { bold: true, sz: 16 };
            worksheet[address].s.alignment = { horizontal: "center" };
        }
        
        // 为数据行添加边框
        for (let R = 0; R < rowCount; R++) {
            for (let C = 0; C <= range.e.c; C++) {
                const address = XLSX.utils.encode_cell({ r: R, c: C });
                if (!worksheet[address]) continue;
                
                // 为所有单元格添加边框
                if (!worksheet[address].s) worksheet[address].s = {};
                worksheet[address].s.border = {
                    top: { style: "thin" },
                    bottom: { style: "thin" },
                    left: { style: "thin" },
                    right: { style: "thin" }
                };
            }
        }
    } catch (e) {
        console.warn("应用样式时出错:", e);
    }
}

// 设置工作表列宽
function setColumnWidths(worksheet, colWidths) {
    worksheet['!cols'] = colWidths;
}

// 模态窗口事件处理
document.addEventListener('DOMContentLoaded', function() {
    // 关闭按钮
    document.querySelector('.close').addEventListener('click', closePreviewModal);
    
    // 放弃按钮
    document.getElementById('cancelPreviewBtn').addEventListener('click', closePreviewModal);
    
    // 确认按钮
    document.getElementById('confirmPreviewBtn').addEventListener('click', confirmGeneration);
    
    // 点击模态窗口外部关闭
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('previewModal');
        if (event.target === modal) {
            closePreviewModal();
        }
    });
});