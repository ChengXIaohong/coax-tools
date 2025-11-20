// text-slicer-worker.js
self.onmessage = function(e) {
    const { content, method, param, fileName } = e.data;
    
    try {
        let slicedFiles = [];
        
        // 分割内容为行数组
        const lines = content.split('\n');
        
        // 根据方法进行切片
        if (method === 'lines') {
            slicedFiles = sliceByLinesMethod(lines, param, fileName);
        } else {
            slicedFiles = sliceBySizeMethod(lines, param, fileName);
        }
        
        // 发送结果回主线程
        self.postMessage({
            success: true,
            slicedFiles: slicedFiles
        });
    } catch (error) {
        self.postMessage({
            success: false,
            error: error.message
        });
    }
};

// 按行数切片
function sliceByLinesMethod(lines, linesPerFile, originalFileName) {
    const slicedFiles = [];
    const totalLines = lines.length;
    const totalFiles = Math.ceil(totalLines / linesPerFile);
    const baseFileName = originalFileName.replace(/\.[^/.]+$/, "");
    
    for (let i = 0; i < totalFiles; i++) {
        // 计算进度
        const progress = ((i + 1) / totalFiles) * 100;
        
        // 发送进度更新
        self.postMessage({
            progress: progress
        });
        
        // 获取当前文件的行
        const start = i * linesPerFile;
        const end = Math.min(start + linesPerFile, totalLines);
        const fileLines = lines.slice(start, end);
        
        // 创建文件内容
        const fileContent = fileLines.join('\n');
        
        // 创建文件对象信息（注意：Worker中不能直接创建Blob）
        const fileName = `${baseFileName}_part${i + 1}.txt`;
        
        slicedFiles.push({
            name: fileName,
            content: fileContent,
            size: new Blob([fileContent]).size
        });
    }
    
    return slicedFiles;
}

// 按大小切片
function sliceBySizeMethod(lines, maxSize, originalFileName) {
    const slicedFiles = [];
    let currentFileLines = [];
    let currentFileSize = 0;
    let fileIndex = 1;
    const baseFileName = originalFileName.replace(/\.[^/.]+$/, "");
    
    for (let i = 0; i < lines.length; i++) {
        // 计算当前行的大小（近似）
        const lineSize = new Blob([lines[i] + '\n']).size;
        
        // 如果加上当前行会超过最大大小，或者这是最后一行
        if (currentFileSize + lineSize > maxSize && currentFileLines.length > 0) {
            // 保存当前文件
            const fileContent = currentFileLines.join('\n');
            const fileName = `${baseFileName}_part${fileIndex}.txt`;
            
            slicedFiles.push({
                name: fileName,
                content: fileContent,
                size: new Blob([fileContent]).size
            });
            
            // 重置当前文件
            currentFileLines = [];
            currentFileSize = 0;
            fileIndex++;
        }
        
        // 添加当前行到当前文件
        currentFileLines.push(lines[i]);
        currentFileSize += lineSize;
        
        // 每处理1000行发送一次进度更新，避免消息过多
        if (i % 1000 === 0) {
            const progress = ((i + 1) / lines.length) * 100;
            self.postMessage({
                progress: progress
            });
        }
    }
    
    // 保存最后一个文件（如果有内容）
    if (currentFileLines.length > 0) {
        const fileContent = currentFileLines.join('\n');
        const fileName = `${baseFileName}_part${fileIndex}.txt`;
        
        slicedFiles.push({
            name: fileName,
            content: fileContent,
            size: new Blob([fileContent]).size
        });
    }
    
    return slicedFiles;
}