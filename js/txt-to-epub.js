/**
 * TXT 转 EPUB 工具
 * 将 TXT 文本文件转换为 EPUB 电子书
 */

(function() {
    'use strict';

    // 状态管理
    const state = {
        files: [],           // { name, content, size }
        chapters: [],       // { title, content, sourceText }
        coverImage: null,    // base64 string
        currentPreviewFile: 0,
        selectedPattern: 'chinese'
    };

    // 章节识别模板（一次转换任务只取一个模板）
    const CHAPTER_PATTERNS = [
        {
            id: 'chinese',
            label: '第X章 (中文)',
            regex: /^第([零一二三四五六七八九十百千万0-9]+)章(?:\s+([^\n]+))?\s*$/gm,
            numGroup: 1, titleGroup: 2, hasTitle: true,
            formatTitle: (num, title) => title ? '第' + num + '章 ' + title : '第' + num + '章'
        },
        {
            id: 'numbered',
            label: '数字+标点 (1、 / 1.)',
            regex: /^(\d+)([、.])[ \t]*([^\n]+?)[ \t]*$/gm,
            numGroup: 1, titleGroup: 3, hasTitle: false,
            formatTitle: (num, title, m) => num + m[2] + ' ' + title
        },
        {
            id: 'chapter',
            label: 'Chapter X (英文)',
            regex: /^Chapter\s+(\d+)(?:[\s:：]+([^\n]+?))?\s*$/gmi,
            numGroup: 1, titleGroup: 2, hasTitle: true,
            formatTitle: (num, title) => title ? 'Chapter ' + num + ': ' + title : 'Chapter ' + num
        },
        {
            id: 'juanhuiji',
            label: '卷/回/集',
            regex: /^(?:Episode\s+(\d+)|卷([零一二三四五六七八九十百千万0-9]+)|第([零一二三四五六七八九十百千万0-9]+)(卷|回|集))(?:[\s:：]+([^\n]+?))?[ \t]*$/gmi,
            numGroup: [1, 2, 3], titleGroup: 5, hasTitle: true,
            formatTitle: (num, title, m) => {
                if (m[1] !== undefined) return title ? 'Episode ' + num + ': ' + title : 'Episode ' + num;
                if (m[2] !== undefined) return title ? '卷' + num + ' ' + title : '卷' + num;
                return title ? '第' + num + m[4] + ' ' + title : '第' + num + m[4];
            }
        }
    ];

    const PATTERN_HINTS = {
        chinese:   '匹配：第1章、第十二章、第一百零三章 标题（标题可选）',
        numbered:  '匹配：1、标题、2、标题、10. 标题、1.标题（标题必填）',
        chapter:   '匹配：Chapter 1、CHAPTER 12、Chapter 3: Title（不区分大小写）',
        juanhuiji: '匹配：卷一、卷123、Episode 5、第一回、第一集（第X+回/集/卷 需带后缀）'
    };

    const PATTERN_STORAGE_KEY = 'coax-tools-chapter-pattern';

    function loadSavedPattern() {
        try {
            const saved = localStorage.getItem(PATTERN_STORAGE_KEY);
            if (saved && CHAPTER_PATTERNS.some(p => p.id === saved)) return saved;
        } catch (e) {}
        return 'chinese';
    }

    function savePattern(id) {
        try { localStorage.setItem(PATTERN_STORAGE_KEY, id); } catch (e) {}
    }

    function getCurrentPattern() {
        return CHAPTER_PATTERNS.find(p => p.id === state.selectedPattern) || CHAPTER_PATTERNS[0];
    }

    state.selectedPattern = loadSavedPattern();

    // DOM 元素
    const elements = {};

    // 初始化
    function init() {
        // 屏蔽 Chrome 扩展抛出的误报 error（不影响我们代码）
        window.addEventListener('unhandledrejection', function(e) {
            if (e.reason && e.reason.message && e.reason.message.indexOf('message channel closed') >= 0) {
                e.preventDefault();
            }
        });
        cacheElements();
        bindEvents();
        initPatternUI();
    }

    function cacheElements() {
        elements.message = document.getElementById('message');
        elements.uploadArea = document.getElementById('uploadArea');
        elements.fileInput = document.getElementById('fileInput');
        elements.fileList = document.getElementById('fileList');
        elements.previewCard = document.getElementById('previewCard');
        elements.previewFileSelect = document.getElementById('previewFileSelect');
        elements.previewContent = document.getElementById('previewContent');
        elements.chapterCard = document.getElementById('chapterCard');
        elements.chapterList = document.getElementById('chapterList');
        elements.chapterPatternSelect = document.getElementById('chapterPatternSelect');
        elements.patternHint = document.getElementById('patternHint');
        elements.bookTitle = document.getElementById('bookTitle');
        elements.bookAuthor = document.getElementById('bookAuthor');
        elements.bookLanguage = document.getElementById('bookLanguage');
        elements.coverUpload = document.getElementById('coverUpload');
        elements.coverInput = document.getElementById('coverInput');
        elements.coverPreview = document.getElementById('coverPreview');
        elements.removeCoverBtn = document.getElementById('removeCoverBtn');
        elements.resetBtn = document.getElementById('resetBtn');
        elements.generateBtn = document.getElementById('generateBtn');
    }

    function bindEvents() {
        // 文件上传
        elements.uploadArea.addEventListener('click', (e) => {
            if (e.target === elements.fileInput) return;
        });
        elements.fileInput.addEventListener('change', handleFileSelect);
        elements.uploadArea.addEventListener('dragover', handleDragOver);
        elements.uploadArea.addEventListener('dragleave', handleDragLeave);
        elements.uploadArea.addEventListener('drop', handleDrop);

        // 预览切换
        elements.previewFileSelect.addEventListener('change', handlePreviewChange);

        // 章节模板切换
        elements.chapterPatternSelect.addEventListener('change', handlePatternChange);

        // 封面上传
        elements.coverInput.addEventListener('change', handleCoverSelect);
        elements.removeCoverBtn.addEventListener('click', removeCover);

        // 操作按钮
        elements.resetBtn.addEventListener('click', resetAll);
        elements.generateBtn.addEventListener('click', generateEpub);
    }

    function initPatternUI() {
        elements.chapterPatternSelect.value = state.selectedPattern;
        updatePatternHint();
    }

    function updatePatternHint() {
        elements.patternHint.textContent = PATTERN_HINTS[state.selectedPattern] || '';
    }

    function handlePatternChange() {
        const newId = elements.chapterPatternSelect.value;
        if (!CHAPTER_PATTERNS.some(p => p.id === newId)) return;
        state.selectedPattern = newId;
        savePattern(newId);
        updatePatternHint();
        if (state.files.length > 0) parseChapters();
    }

    // ========== 文件处理 ==========

    function handleFileSelect(e) {
        const files = Array.from(e.target.files);
        addFiles(files);
    }

    function handleDragOver(e) {
        e.preventDefault();
        elements.uploadArea.classList.add('dragover');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        elements.uploadArea.classList.remove('dragover');
    }

    function handleDrop(e) {
        e.preventDefault();
        elements.uploadArea.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.txt'));
        if (files.length === 0) {
            showMessage('请上传 .txt 格式的文件', 'error');
            return;
        }
        addFiles(files);
    }

    function addFiles(newFiles) {
        if (state.files.length + newFiles.length > 10) {
            showMessage('最多只能上传10个文件', 'error');
            return;
        }

        let loadedCount = 0;
        const toLoad = [];

        newFiles.forEach(file => {
            if (file.size > 50 * 1024 * 1024) {
                showMessage(`文件 ${file.name} 超过50MB限制`, 'error');
                return;
            }
            toLoad.push(file);
        });

        if (toLoad.length === 0) return;

        toLoad.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                state.files.push({
                    name: file.name,
                    content: e.target.result,
                    size: file.size
                });
                loadedCount++;
                if (loadedCount === toLoad.length) {
                    onFilesLoaded();
                }
            };
            reader.onerror = () => {
                showMessage(`文件 ${file.name} 读取失败`, 'error');
                loadedCount++;
            };
            reader.readAsText(file);
        });
    }

    function onFilesLoaded() {
        renderFileList();
        updatePreview();

        // 如果没有设置书名，用第一个文件名
        if (!elements.bookTitle.value) {
            const firstName = state.files[0].name.replace(/\.txt$/i, '');
            elements.bookTitle.value = firstName;
        }
    }

    function renderFileList() {
        elements.fileList.innerHTML = '';
        state.files.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.draggable = true;
            item.dataset.index = index;
            item.innerHTML = `
                <span class="file-icon">📄</span>
                <div class="file-info">
                    <div class="file-name">${escapeHtml(file.name)}</div>
                    <div class="file-size">${formatFileSize(file.size)}</div>
                </div>
                <div class="file-actions">
                    <button class="file-remove" title="移除">×</button>
                </div>
            `;

            item.querySelector('.file-remove').addEventListener('click', () => removeFile(index));
            item.querySelector('.file-name').addEventListener('click', () => selectPreviewFile(index));

            // 拖拽排序
            item.addEventListener('dragstart', handleFileDragStart);
            item.addEventListener('dragover', handleFileDragOver);
            item.addEventListener('drop', handleFileDrop);
            item.addEventListener('dragend', handleFileDragEnd);

            elements.fileList.appendChild(item);
        });

        // 显示预览和章节卡片
        if (state.files.length > 0) {
            elements.previewCard.style.display = 'block';
            elements.chapterCard.style.display = 'block';
            parseChapters();
        } else {
            elements.previewCard.style.display = 'none';
            elements.chapterCard.style.display = 'none';
        }
    }

    let draggedFileIndex = null;

    function handleFileDragStart(e) {
        draggedFileIndex = parseInt(e.currentTarget.dataset.index);
        e.currentTarget.classList.add('dragging');
    }

    function handleFileDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    function handleFileDrop(e) {
        e.preventDefault();
        const targetIndex = parseInt(e.currentTarget.dataset.index);
        if (draggedFileIndex !== null && draggedFileIndex !== targetIndex) {
            const draggedFile = state.files.splice(draggedFileIndex, 1)[0];
            state.files.splice(targetIndex, 0, draggedFile);
            renderFileList();
            updatePreview();
        }
        e.currentTarget.classList.remove('dragover');
    }

    function handleFileDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        draggedFileIndex = null;
    }

    function removeFile(index) {
        state.files.splice(index, 1);
        renderFileList();
        updatePreview();
        if (state.files.length === 0) {
            elements.bookTitle.value = '';
        }
    }

    function selectPreviewFile(index) {
        state.currentPreviewFile = index;
        updatePreview();
    }

    // ========== 预览 ==========

    function updatePreview() {
        if (state.files.length === 0) {
            elements.previewFileSelect.innerHTML = '';
            elements.previewContent.textContent = '';
            return;
        }

        // 更新下拉框
        elements.previewFileSelect.innerHTML = '';
        state.files.forEach((file, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = file.name;
            elements.previewFileSelect.appendChild(option);
        });
        elements.previewFileSelect.value = state.currentPreviewFile;

        // 显示预览内容（限制5000字符）
        const content = state.files[state.currentPreviewFile].content;
        const preview = content.length > 5000 ? content.substring(0, 5000) + '\n\n...(内容已截断)...' : content;
        elements.previewContent.textContent = preview;
    }

    function handlePreviewChange() {
        state.currentPreviewFile = parseInt(elements.previewFileSelect.value);
        updatePreview();
    }

    // ========== 章节解析 ==========

    // ========== 章节解析 ==========

    function parseChapters() {
        state.chapters = [];

        if (state.files.length === 0) {
            showMessage('请先上传文件', 'error');
            return;
        }

        try {
            const fullContent = state.files.map(f => f.content).join('\n\n');
            const pattern = getCurrentPattern();

            const matches = [];
            for (const m of fullContent.matchAll(pattern.regex)) {
                const num = Array.isArray(pattern.numGroup)
                    ? pattern.numGroup.map(g => m[g]).find(v => v !== undefined)
                    : m[pattern.numGroup];
                const title = pattern.titleGroup !== null ? (m[pattern.titleGroup] || null) : null;
                matches.push({
                    start: m.index,
                    end: m.index + m[0].length,
                    num: num,
                    title: title,
                    raw: m
                });
            }

            if (matches.length === 0) {
                state.chapters.push({
                    title: elements.bookTitle.value || '目录',
                    content: fullContent,
                    sourceText: fullContent.substring(0, 50)
                });
            } else {
                for (let i = 0; i < matches.length; i++) {
                    const cm = matches[i];
                    const contentStart = cm.end;
                    const contentEnd = i + 1 < matches.length ? matches[i + 1].start : fullContent.length;
                    const content = fullContent.substring(contentStart, contentEnd).trim();

                    let chapterTitle = cm.title ? cm.title.trim() : null;
                    if (!chapterTitle && pattern.hasTitle) {
                        const after = fullContent.substring(cm.end);
                        const nl = after.match(/^[ \t]*([^\n\r]+)/m);
                        chapterTitle = nl ? nl[1].trim().substring(0, 50) : null;
                    }

                    state.chapters.push({
                        title: pattern.formatTitle(cm.num, chapterTitle, cm.raw),
                        content: content,
                        sourceText: content.substring(0, 30)
                    });
                }
            }

            renderChapterList();
            showMessage(`成功解析出 ${state.chapters.length} 个章节`, 'success');

        } catch (err) {
            showMessage('章节解析失败：' + err.message, 'error');
        }
    }

    function renderChapterList() {
        elements.chapterList.innerHTML = '';
        state.chapters.forEach((chapter, index) => {
            const item = document.createElement('div');
            item.className = 'chapter-item';
            item.innerHTML = `
                <span class="chapter-index">#${index + 1}</span>
                <input type="text" value="${escapeHtml(chapter.title)}" placeholder="章节标题">
                <span class="source-text" title="${escapeHtml(chapter.sourceText)}">${escapeHtml(chapter.sourceText)}...</span>
                <button class="chapter-remove" title="删除">×</button>
            `;

            // 标题编辑
            item.querySelector('input').addEventListener('change', (e) => {
                state.chapters[index].title = e.target.value;
            });

            // 删除章节
            item.querySelector('.chapter-remove').addEventListener('click', () => {
                state.chapters.splice(index, 1);
                renderChapterList();
                showMessage('已删除第 ' + (index + 1) + ' 章', 'info');
            });

            elements.chapterList.appendChild(item);
        });
    }

    // ========== 封面上传 ==========

    function handleCoverSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.match(/^image\/(jpeg|png|jpg)$/)) {
            showMessage('请上传 JPG 或 PNG 格式的图片', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            state.coverImage = e.target.result;
            elements.coverPreview.src = state.coverImage;
            elements.coverPreview.style.display = 'block';
            elements.coverUpload.querySelector('.cover-placeholder').style.display = 'none';
            elements.removeCoverBtn.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    function removeCover() {
        state.coverImage = null;
        elements.coverPreview.src = '';
        elements.coverPreview.style.display = 'none';
        elements.coverUpload.querySelector('.cover-placeholder').style.display = 'flex';
        elements.removeCoverBtn.style.display = 'none';
        elements.coverInput.value = '';
    }

    // ========== 生成 EPUB ==========

    window.onerror = function(msg, url, line) {
        console.error('[GLOBAL ERROR]', msg, url, 'line:', line);
        showMessage('页面错误: ' + msg, 'error');
        return true;
    };

    // 防抖计时器
    let generateDebounceTimer = null;

    // ========== ZIP/EPUB 流式生成工具 ==========

    // CRC32 查找表
    const crc32Table = new Uint32Array(256);
    for (let i = 256; i--;) {
        let c = i;
        for (let j = 8; j--;) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        crc32Table[i] = c;
    }

    function crc32(data) {
        let c = 0xFFFFFFFF;
        for (let i = 0; i < data.length; i++) c = crc32Table[(c ^ data[i]) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    }

    async function deflateRaw(data, name) {
        console.time('deflate-' + name);
        const cs = new CompressionStream('deflate-raw');
        const writer = cs.writable.getWriter();
        await writer.write(data);
        await writer.close();
        const reader = cs.readable.getReader();
        const chunks = [];
        let total = 0;
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            total += value.length;
        }
        const r = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) { r.set(c, off); off += c.length; }
        console.timeEnd('deflate-' + name);
        return r;
    }

    function timeoutRace(promise, ms, label) {
        let timer;
        return Promise.race([
            promise,
            new Promise(function(_, reject) {
                timer = setTimeout(function() { reject(new Error(label + ' timeout ' + ms + 'ms')); }, ms);
            })
        ]).finally(function() { clearTimeout(timer); });
    }

    function msDosTime(d) {
        d = d || new Date();
        return {
            time: (d.getSeconds() >>> 1) | (d.getMinutes() << 5) | (d.getHours() << 11),
            date: d.getDate() | ((d.getMonth() + 1) << 5) | ((d.getFullYear() - 1980) << 9)
        };
    }

    function encodeStr(s) {
        return new TextEncoder().encode(s);
    }

    function zipLocalHeader(name, crc, compSize, rawSize, compressed) {
        const nb = encodeStr(name);
        const { time, date } = msDosTime();
        const b = new ArrayBuffer(30 + nb.length);
        const v = new DataView(b);
        v.setUint32(0, 0x04034b50, true);
        v.setUint16(4, 20, true);
        v.setUint16(6, 0, true);
        v.setUint16(8, compressed ? 8 : 0, true);
        v.setUint16(10, time, true);
        v.setUint16(12, date, true);
        v.setUint32(14, crc, true);
        v.setUint32(18, compSize, true);
        v.setUint32(22, rawSize, true);
        v.setUint16(26, nb.length, true);
        v.setUint16(28, 0, true);
        new Uint8Array(b, 30).set(nb);
        return new Uint8Array(b);
    }

    function zipCentralDir(name, crc, compSize, rawSize, offset, compressed) {
        const nb = encodeStr(name);
        const { time, date } = msDosTime();
        const b = new ArrayBuffer(46 + nb.length);
        const v = new DataView(b);
        v.setUint32(0, 0x02014b50, true);
        v.setUint16(4, 20, true);
        v.setUint16(6, 20, true);
        v.setUint16(8, 0, true);
        v.setUint16(10, compressed ? 8 : 0, true);
        v.setUint16(12, time, true);
        v.setUint16(14, date, true);
        v.setUint32(16, crc, true);
        v.setUint32(20, compSize, true);
        v.setUint32(24, rawSize, true);
        v.setUint16(28, nb.length, true);
        v.setUint16(30, 0, true);
        v.setUint16(32, 0, true);
        v.setUint16(34, 0, true);
        v.setUint16(36, 0, true);
        v.setUint32(38, 0, true);
        v.setUint32(42, offset, true);
        new Uint8Array(b, 46).set(nb);
        return new Uint8Array(b);
    }

    function zipEOCD(count, dirSize, dirOffset) {
        const b = new ArrayBuffer(22);
        const v = new DataView(b);
        v.setUint32(0, 0x06054b50, true);
        v.setUint16(4, 0, true);
        v.setUint16(6, 0, true);
        v.setUint16(8, count, true);
        v.setUint16(10, count, true);
        v.setUint32(12, dirSize, true);
        v.setUint32(16, dirOffset, true);
        v.setUint16(20, 0, true);
        return new Uint8Array(b);
    }

    function uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 3 | 8)).toString(16);
        });
    }

    function escXml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

    function makeXhtml(title, body) {
        return '<?xml version="1.0" encoding="utf-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml">\n<head><title>' + escXml(title) + '</title>\n<link rel="stylesheet" type="text/css" href="styles.css"/></head>\n<body>' + body + '\n</body>\n</html>';
    }

    function makeCoverXhtml(imgFile) {
        return '<?xml version="1.0" encoding="utf-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml">\n<head><title>封面</title></head>\n<body style="text-align:center;padding:0;margin:0">\n<img src="Images/' + imgFile + '" alt="封面" style="max-width:100%;height:100%"/>\n</body>\n</html>';
    }

    function makeOpf(title, author, lang, count, uid, coverInfo) {
        let items = '', spine = '';
        let metaCover = '';
        if (coverInfo) {
            items += '    <item id="cover-img" href="Images/cover.' + coverInfo.ext + '" media-type="' + coverInfo.mime + '"/>\n';
            items += '    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>\n';
            spine += '    <itemref idref="cover"/>\n';
            metaCover = '    <meta name="cover" content="cover-img"/>\n  ';
        }
        for (let i = 1; i <= count; i++) {
            items += '    <item id="ch' + i + '" href="ch' + i + '.xhtml" media-type="application/xhtml+xml"/>\n';
            spine += '    <itemref idref="ch' + i + '"/>\n';
        }
        return '<?xml version="1.0" encoding="utf-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/" version="2.0" unique-identifier="BookId">\n  <metadata>\n' + metaCover + '    <dc:title>' + escXml(title) + '</dc:title>\n    <dc:creator>' + escXml(author) + '</dc:creator>\n    <dc:language>' + lang + '</dc:language>\n    <dc:identifier id="BookId">urn:uuid:' + uid + '</dc:identifier>\n  </metadata>\n  <manifest>\n    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>\n    <item id="css" href="styles.css" media-type="text/css"/>\n' + items + '  </manifest>\n  <spine toc="ncx">\n' + spine + '  </spine>\n</package>';
    }

    function makeNcx(title, author, chunks, uid, hasCover) {
        let nav = '';
        var playOrder = 0;
        if (hasCover) {
            playOrder++;
            nav += '    <navPoint id="np' + playOrder + '" playOrder="' + playOrder + '"><navLabel><text>封面</text></navLabel><content src="cover.xhtml"/></navPoint>\n';
        }
        var seen = {};
        for (let i = 0; i < chunks.length; i++) {
            var ci = chunks[i].chapterIndex;
            if (!seen[ci]) {
                seen[ci] = true;
                playOrder++;
                var ct = chunks[i].title || title;
                nav += '    <navPoint id="np' + playOrder + '" playOrder="' + playOrder + '"><navLabel><text>' + escXml(ct) + '</text></navLabel><content src="ch' + (i + 1) + '.xhtml"/></navPoint>\n';
            }
        }
        return '<?xml version="1.0" encoding="utf-8"?>\n<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">\n  <head>\n    <meta name="dtb:uid" content="urn:uuid:' + uid + '"/>\n    <meta name="dtb:depth" content="1"/>\n    <meta name="dtb:totalPageCount" content="0"/>\n    <meta name="dtb:maxPageNumber" content="0"/>\n  </head>\n  <docTitle><text>' + escXml(title) + '</text></docTitle>\n  <docAuthor><text>' + escXml(author) + '</text></docAuthor>\n  <navMap>\n' + nav + '  </navMap>\n</ncx>';
    }

    async function generateEpub() {
        if (generateDebounceTimer !== null) {
            showMessage('请稍候，正在生成中...', 'info');
            return;
        }
        const title = elements.bookTitle.value.trim();
        if (!title) { showMessage('请输入书名', 'error'); elements.bookTitle.focus(); return; }
        if (state.chapters.length === 0) { showMessage('请先上传并解析章节', 'error'); return; }

        generateDebounceTimer = setTimeout(function() { generateDebounceTimer = null; }, 2000);

        console.log('[EPUB] === v2-blob === chapters:', state.chapters.length);
        console.time('[EPUB] total');

        // 立刻显示遮罩（让用户看到反馈）
        showOverlay('正在生成 EPUB');
        await sleep(50);

        var _writable = null;
        try {
            // 先弹出保存对话框（必须在用户手势内）
            const safeName = title.replace(/[<>:"/\\|?*]/g, '_');
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: safeName + '.epub',
                    types: [{ description: 'EPUB 电子书', accept: { 'application/epub+zip': ['.epub'] } }]
                });
                _writable = await handle.createWritable();
            } catch (e) {
                if (e.name === 'AbortError') { hideOverlay(); showMessage('已取消', 'info'); return; }
                throw new Error('浏览器不支持保存，请使用 Chrome/Edge: ' + e.message);
            }

            // 释放原始文件
            state.files = [];
            await sleep(0);

            // 切分超大章节（防止单个 xhtml 文件过大，影响阅读器性能）
            updateProgress(0, '切分大章节...');
            console.time('split');
            const MAX_CHUNK = 10000000;
            const chunks = [];
            var _ci = 0;
            for (const ch of state.chapters) {
                if (ch.content && ch.content.length > MAX_CHUNK) {
                    var start = 0;
                    while (start < ch.content.length) {
                        var end = Math.min(start + MAX_CHUNK, ch.content.length);
                        if (end < ch.content.length) {
                            var nl = ch.content.lastIndexOf('\n', end);
                            if (nl > start + MAX_CHUNK * 0.5) end = nl + 1;
                        }
                        chunks.push({ title: ch.title, content: ch.content.substring(start, end), chapterIndex: _ci });
                        start = end;
                    }
                } else {
                    chunks.push({ title: ch.title, content: ch.content, chapterIndex: _ci });
                }
                _ci++;
            }
            state.chapters = null;
            console.timeEnd('split');
            console.log('[EPUB] total chunks after split:', chunks.length, 'distinct chapters:', _ci);
            await sleep(0);

            const total = chunks.length;
            var totalTextLen = 0;
            for (var ti = 0; ti < chunks.length; ti++) totalTextLen += chunks[ti].content.length;
            console.log('[EPUB] total text length:', totalTextLen, 'chars, chunks:', chunks.length);
            const author = elements.bookAuthor.value.trim() || '未知作者';
            const lang = elements.bookLanguage.value;
            const uid = uuid();
            const entries = [];     // { name, crc, compSize, rawSize, offset, compressed }
            var zipOff = 0;
            var parts = [];         // Uint8Array[], 最终一次性合成 Blob

            async function writeZipEntry(name, strOrBuf, doCompress) {
                var raw = typeof strOrBuf === 'string' ? encodeStr(strOrBuf) : strOrBuf;
                var rawLen = raw.length;
                console.time('crc-' + name.substring(0, 20));
                var crcVal = crc32(raw);
                console.timeEnd('crc-' + name.substring(0, 20));
                var compData;
                var actuallyCompressed = doCompress;
                if (doCompress) {
                    try {
                        compData = await timeoutRace(deflateRaw(raw, name), 30000, 'deflate-' + name);
                    } catch (e) {
                        console.warn('[EPUB] deflate failed for', name, 'fallback STORE:', e.message);
                        compData = raw;
                        actuallyCompressed = false;
                    }
                } else {
                    compData = raw;
                }
                var compLen = compData.length;
                var hdr = zipLocalHeader(name, crcVal, compLen, rawLen, actuallyCompressed);
                entries.push({ name: name, crc: crcVal, compSize: compLen, rawSize: rawLen, offset: zipOff, compressed: actuallyCompressed });
                parts.push(hdr, compData);
                zipOff += hdr.length + compLen;
            }

            // 1. mimetype（必须第一个条目，不压缩）
            console.log('[EPUB] writing mimetype...');
            await writeZipEntry('mimetype', 'application/epub+zip', false);

            // 2. 封面图片
            var hasCover = false;
            var coverInfo = null;
            if (state.coverImage) {
                const m = state.coverImage.match(/^data:image\/(\w+);base64,(.+)$/);
                if (m) {
                    console.log('[EPUB] writing cover image...');
                    hasCover = true;
                    var coverExt = m[1] === 'jpeg' ? 'jpg' : m[1];
                    var coverMime = m[1] === 'jpeg' ? 'image/jpeg' : 'image/' + m[1];
                    var bin = atob(m[2]);
                    var buf = new Uint8Array(bin.length);
                    for (var _j = 0; _j < bin.length; _j++) buf[_j] = bin.charCodeAt(_j);
                    await writeZipEntry('OEBPS/Images/cover.' + coverExt, buf, false);
                    var coverHtml = makeCoverXhtml('cover.' + coverExt);
                    await writeZipEntry('OEBPS/cover.xhtml', coverHtml, false);
                    coverInfo = { ext: coverExt, mime: coverMime };
                }
            }

            // 3. 逐章转换 + 写入
            for (var i = 0; i < total; i++) {
                var ch = chunks[i];
                var pct = 0.5 + (i / total) * 91;
                updateProgress(pct, '写入章节 ' + (i + 1) + '/' + total);

                console.log('[EPUB] ch', (i + 1) + '/' + total, 'len:', ch.content.length);
                console.time('  html');
                var html = await textToHtmlAsync(ch.content);
                console.timeEnd('  html');
                ch.content = null;  // 释放

                console.time('  xhtml');
                var xhtml = makeXhtml(ch.title, html);
                console.timeEnd('  xhtml');

                await writeZipEntry('OEBPS/ch' + (i + 1) + '.xhtml', xhtml, false);

                if ((i + 1) % 100 === 0) {
                    await sleep(0);
                }
            }

            // 3. 写入元数据文件
            console.log('[EPUB] writing metadata...');
            updateProgress(92, '写入元数据...');

            var css = 'body{font-family:serif;line-height:1.8;padding:1em;margin:0}p{text-indent:2em;margin:0}';
            await writeZipEntry('OEBPS/styles.css', css, false);

            var opf = makeOpf(title, author, lang, total, uid, coverInfo);
            await writeZipEntry('OEBPS/content.opf', opf, false);

            var ncx = makeNcx(title, author, chunks, uid, hasCover);
            await writeZipEntry('OEBPS/toc.ncx', ncx, false);

            var container = '<?xml version="1.0" encoding="utf-8"?>\n<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">\n  <rootfiles>\n    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n  </rootfiles>\n</container>';
            await writeZipEntry('META-INF/container.xml', container, false);

            // 4. 写入中央目录 + EOCD
            console.log('[EPUB] writing central directory, entries:', entries.length);
            updateProgress(97, '写入目录索引...');
            var dirStart = zipOff;
            for (var j = 0; j < entries.length; j++) {
                var e = entries[j];
                var cd = zipCentralDir(e.name, e.crc, e.compSize, e.rawSize, e.offset, e.compressed);
                parts.push(cd);
                zipOff += cd.length;
            }
            var dirSize = zipOff - dirStart;
            var eocd = zipEOCD(entries.length, dirSize, dirStart);
            parts.push(eocd);
            await sleep(0);

            // 5. 一次性写入磁盘
            updateProgress(99, '保存文件...');
            console.log('[EPUB] creating Blob, parts:', parts.length, 'entries:', entries.length);
            const epubBlob = new Blob(parts, { type: 'application/epub+zip' });
            parts = null;
            console.log('[EPUB] Blob size:', epubBlob.size);

            await _writable.write(epubBlob);
            await _writable.close();
            _writable = null;

            updateProgress(100, '完成');
            console.timeEnd('[EPUB] total');
            console.log('[EPUB] done');
            hideOverlay();
            showMessage('EPUB 生成成功！', 'success');

        } catch (err) {
            hideOverlay();
            console.error('[EPUB FAIL]', err);
            showMessage('生成失败：' + err.message, 'error');
        } finally {
            if (_writable) { try { _writable.close(); } catch (e) {} }
        }
    }

    /**
     * 将纯文本转换为 HTML 格式
     * - 空行分段，换行符转 <br>
     * - 分块处理，每 500KB yield 一次避免阻塞主线程
     */
    async function textToHtmlAsync(text) {
        if (!text) return '<p></p>';

        const map = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
        const result = [];
        let inParagraph = false;
        let lineBuffer = '';
        const CHUNK_SIZE = 100000;
        const YIELD_INTERVAL = 500000;
        let yieldCounter = 0;

        function flushLine() {
            const line = lineBuffer.trim();
            lineBuffer = '';
            if (line === '') {
                if (inParagraph) {
                    result.push('</p>');
                    inParagraph = false;
                }
                return;
            }
            if (inParagraph) {
                result.push('<br/>');
            } else {
                result.push('<p>');
                inParagraph = true;
            }
            result.push(line.replace(/[&<>"']/g, function(m) { return map[m]; }));
        }

        for (let offset = 0; offset < text.length; offset += CHUNK_SIZE) {
            const end = Math.min(offset + CHUNK_SIZE, text.length);
            const chunk = text.substring(offset, end);

            let chunkPos = 0;
            while (chunkPos < chunk.length) {
                const nlIdx = chunk.indexOf('\n', chunkPos);
                if (nlIdx === -1) {
                    lineBuffer += chunk.substring(chunkPos);
                    chunkPos = chunk.length;
                } else {
                    lineBuffer += chunk.substring(chunkPos, nlIdx);
                    flushLine();
                    chunkPos = nlIdx + 1;
                }
            }

            yieldCounter += chunk.length;
            if (yieldCounter >= YIELD_INTERVAL) {
                await sleep(0);
                yieldCounter = 0;
            }
        }

        if (lineBuffer) flushLine();

        if (inParagraph) {
            result.push('</p>');
        }

        return result.join('') || '<p></p>';
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ========== 进度遮罩 ==========

    const progressEls = {};

    function cacheProgressEls() {
        progressEls.overlay = document.getElementById('progressOverlay');
        progressEls.title = document.getElementById('progressTitle');
        progressEls.fill = document.getElementById('progressFill');
        progressEls.percent = document.getElementById('progressPercent');
        progressEls.detail = document.getElementById('progressDetail');
    }

    function showOverlay(title) {
        cacheProgressEls();
        progressEls.title.textContent = title || '正在生成 EPUB';
        progressEls.fill.style.width = '0%';
        progressEls.percent.textContent = '0%';
        progressEls.detail.textContent = '准备中...';
        progressEls.overlay.style.display = 'flex';
    }

    function updateProgress(pct, detail) {
        if (!progressEls.fill) cacheProgressEls();
        progressEls.fill.style.width = Math.min(pct, 100) + '%';
        progressEls.percent.textContent = Math.round(pct) + '%';
        if (detail) progressEls.detail.textContent = detail;
    }

    function hideOverlay() {
        if (!progressEls.fill) cacheProgressEls();
        progressEls.overlay.style.display = 'none';
    }

    // ========== 重置 ==========

    function resetAll() {
        state.files = [];
        state.chapters = [];
        state.coverImage = null;
        state.currentPreviewFile = 0;

        elements.fileList.innerHTML = '';
        elements.previewCard.style.display = 'none';
        elements.chapterCard.style.display = 'none';
        elements.bookTitle.value = '';
        elements.bookAuthor.value = '未知作者';
        elements.bookLanguage.value = 'zh-CN';
        removeCover();
        elements.message.style.display = 'none';
        elements.fileInput.value = '';
    }

    // ========== 工具函数 ==========

    function showMessage(text, type = 'info') {
        elements.message.textContent = text;
        elements.message.className = 'message ' + type;
        elements.message.style.display = 'block';
        // 5秒后自动隐藏
        setTimeout(() => {
            if (elements.message.textContent === text) {
                elements.message.style.display = 'none';
            }
        }, 5000);
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    function escapeHtml(text) {
        if (!text) return '';
        const map = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    // 启动
    document.addEventListener('DOMContentLoaded', init);
})();