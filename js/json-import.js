/**
 * JSON File Import Modal
 * Supports .json, .txt, .csv file drag & drop and file picker
 */
(function() {
    'use strict';

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const PREVIEW_LINES = 20;

    let importModal = null;
    let importedData = null;

    function createImportModal() {
        if (importModal) return importModal;

        importModal = document.createElement('div');
        importModal.id = 'json-import-modal';
        importModal.innerHTML = `
            <style>
                #json-import-modal {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    z-index: 10000;
                    display: none;
                    align-items: center;
                    justify-content: center;
                }
                #json-import-modal.active { display: flex; }
                .import-overlay {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(4px);
                }
                .import-window {
                    position: relative;
                    width: 720px;
                    max-width: 90vw;
                    max-height: 85vh;
                    background: #1a1f26;
                    border: 1px solid #30363d;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                }
                .import-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 20px;
                    border-bottom: 1px solid #30363d;
                    background: #161b22;
                }
                .import-header h2 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                    color: #c9d1d9;
                }
                .import-header button.close-btn {
                    background: none;
                    border: none;
                    color: #8b949e;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 4px;
                    line-height: 1;
                }
                .import-header button.close-btn:hover { color: #c9d1d9; }
                .import-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .drop-zone {
                    border: 2px dashed #30363d;
                    border-radius: 8px;
                    padding: 40px 20px;
                    text-align: center;
                    cursor: pointer;
                    transition: border-color 0.2s, background 0.2s;
                }
                .drop-zone:hover, .drop-zone.dragover {
                    border-color: #58a6ff;
                    background: rgba(88,166,255,0.05);
                }
                .drop-zone-icon { font-size: 32px; margin-bottom: 8px; }
                .drop-zone-text { color: #8b949e; font-size: 14px; margin-bottom: 4px; }
                .drop-zone-hint { color: #6e7681; font-size: 12px; }
                .file-input { display: none; }
                .file-info {
                    background: #161b22;
                    border: 1px solid #30363d;
                    border-radius: 6px;
                    padding: 12px 16px;
                    display: none;
                }
                .file-info.visible { display: block; }
                .file-info-row {
                    display: flex;
                    gap: 24px;
                    flex-wrap: wrap;
                }
                .file-info-item {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .file-info-label { color: #6e7681; font-size: 11px; text-transform: uppercase; }
                .file-info-value { color: #c9d1d9; font-size: 13px; font-family: monospace; }
                .preview-box {
                    background: #0d1117;
                    border: 1px solid #30363d;
                    border-radius: 6px;
                    overflow: hidden;
                    display: none;
                }
                .preview-box.visible { display: block; }
                .preview-header {
                    padding: 8px 12px;
                    background: #161b22;
                    border-bottom: 1px solid #30363d;
                    color: #8b949e;
                    font-size: 12px;
                }
                .preview-content {
                    padding: 12px;
                    max-height: 200px;
                    overflow-y: auto;
                    font-family: monospace;
                    font-size: 12px;
                    color: #c9d1d9;
                    white-space: pre-wrap;
                    word-break: break-all;
                }
                .error-msg {
                    background: rgba(248,81,73,0.1);
                    border: 1px solid #f85149;
                    border-radius: 6px;
                    padding: 12px;
                    color: #f85149;
                    font-size: 13px;
                    display: none;
                }
                .error-msg.visible { display: block; }
                .import-footer {
                    padding: 16px 20px;
                    border-top: 1px solid #30363d;
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }
                .import-footer button {
                    padding: 8px 20px;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .import-footer button.cancel-btn {
                    background: transparent;
                    border: 1px solid #30363d;
                    color: #c9d1d9;
                }
                .import-footer button.cancel-btn:hover {
                    border-color: #8b949e;
                }
                .import-footer button.confirm-btn {
                    background: #238636;
                    border: 1px solid #238636;
                    color: #fff;
                }
                .import-footer button.confirm-btn:hover {
                    background: #2ea043;
                }
                .import-footer button.confirm-btn:disabled {
                    background: #21262d;
                    border-color: #30363d;
                    color: #484f58;
                    cursor: not-allowed;
                }
                .import-loading-overlay {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    z-index: 10;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(4px);
                    display: none;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    gap: 12px;
                    border-radius: 12px;
                }
                .import-loading-overlay.active { display: flex; }
                .import-loading-spinner {
                    width: 36px;
                    height: 36px;
                    border: 3px solid #30363d;
                    border-top-color: #58a6ff;
                    border-radius: 50%;
                    animation: import-spin 0.8s linear infinite;
                }
                @keyframes import-spin {
                    to { transform: rotate(360deg); }
                }
                .import-loading-text {
                    color: #c9d1d9;
                    font-size: 14px;
                }
            </style>
            <div class="import-overlay"></div>
            <div class="import-loading-overlay" id="importLoadingOverlay">
                <div class="import-loading-spinner"></div>
                <div class="import-loading-text">正在导入数据...</div>
            </div>
            <div class="import-window">
                <div class="import-header">
                    <h2>📂 导入 JSON 数据</h2>
                    <button class="close-btn" id="importCloseBtn">✕</button>
                </div>
                <div class="import-body">
                    <div class="drop-zone" id="dropZone">
                        <div class="drop-zone-icon">📁</div>
                        <div class="drop-zone-text">拖拽文件到此处 或 点击选择文件</div>
                        <div class="drop-zone-hint">支持 .json .txt .csv 格式，最大 10MB</div>
                        <input type="file" class="file-input" id="fileInput" accept=".json,.txt,.csv,application/json,text/plain,text/csv">
                    </div>
                    <div class="file-info" id="fileInfo">
                        <div class="file-info-row">
                            <div class="file-info-item">
                                <span class="file-info-label">文件名</span>
                                <span class="file-info-value" id="infoName">-</span>
                            </div>
                            <div class="file-info-item">
                                <span class="file-info-label">格式</span>
                                <span class="file-info-value" id="infoFormat">-</span>
                            </div>
                            <div class="file-info-item">
                                <span class="file-info-label">大小</span>
                                <span class="file-info-value" id="infoSize">-</span>
                            </div>
                            <div class="file-info-item">
                                <span class="file-info-label">节点数</span>
                                <span class="file-info-value" id="infoNodes">-</span>
                            </div>
                        </div>
                    </div>
                    <div class="error-msg" id="errorMsg"></div>
                    <div class="preview-box" id="previewBox">
                        <div class="preview-header">数据预览（前 ${PREVIEW_LINES} 行）</div>
                        <div class="preview-content" id="previewContent"></div>
                    </div>
                </div>
                <div class="import-footer">
                    <button class="cancel-btn" id="importCancelBtn">取消</button>
                    <button class="confirm-btn" id="importConfirmBtn" disabled>确认导入</button>
                </div>
            </div>
        `;

        document.body.appendChild(importModal);
        setupImportEvents();
        return importModal;
    }

    function setupImportEvents() {
        const dropZone = importModal.querySelector('#dropZone');
        const fileInput = importModal.querySelector('#fileInput');
        const closeBtn = importModal.querySelector('#importCloseBtn');
        const cancelBtn = importModal.querySelector('#importCancelBtn');
        const confirmBtn = importModal.querySelector('#importConfirmBtn');
        const overlay = importModal.querySelector('.import-overlay');

        // Drop zone click → file input
        dropZone.addEventListener('click', () => fileInput.click());

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });

        // Drag & drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                handleFile(e.dataTransfer.files[0]);
            }
        });

        // Close buttons
        closeBtn.addEventListener('click', closeImportModal);
        cancelBtn.addEventListener('click', closeImportModal);
        overlay.addEventListener('click', closeImportModal);

        // Confirm import — 写入编辑器，autoFormat 同步更新 outputJsonData
        confirmBtn.addEventListener('click', () => {
            if (importedData) {
                const loadingOverlay = importModal.querySelector('#importLoadingOverlay');
                loadingOverlay.classList.add('active');
                setTimeout(function() {
                    var formatted = JSON.stringify(importedData, null, 2);
                    var inputEl = document.getElementById('inputJson');
                    if (inputEl) {
                        inputEl.value = formatted;
                        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    loadingOverlay.classList.remove('active');
                    closeImportModal();
                }, 50);
            }
        });
    }

    function handleFile(file) {
        const errorMsg = importModal.querySelector('#errorMsg');
        const fileInfo = importModal.querySelector('#fileInfo');
        const previewBox = importModal.querySelector('#previewBox');
        const confirmBtn = importModal.querySelector('#importConfirmBtn');

        errorMsg.classList.remove('visible');
        errorMsg.textContent = '';
        importedData = null;
        confirmBtn.disabled = true;

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            showError('文件过大（最大 10MB），当前: ' + formatSize(file.size));
            return;
        }

        // Check extension
        const ext = file.name.split('.').pop().toLowerCase();
        const allowedExts = ['json', 'txt', 'csv'];
        if (!allowedExts.includes(ext)) {
            showError('不支持的格式，仅支持 .json .txt .csv');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            let parsed;

            // Try to parse based on extension
            try {
                if (ext === 'json') {
                    parsed = JSON.parse(content);
                } else {
                    // For txt/csv, try JSON.parse first
                    parsed = JSON.parse(content);
                }
            } catch (err) {
                showError('JSON 解析失败：' + err.message);
                return;
            }

            // Validate structure
            if (typeof parsed !== 'object' || parsed === null) {
                showError('JSON 结构无效，必须为对象或数组');
                return;
            }

            // Success
            importedData = parsed;
            confirmBtn.disabled = false;

            // Show file info
            document.getElementById('infoName').textContent = file.name;
            document.getElementById('infoFormat').textContent = ext.toUpperCase();
            document.getElementById('infoSize').textContent = formatSize(file.size);
            document.getElementById('infoNodes').textContent = countNodes(parsed).toLocaleString();
            fileInfo.classList.add('visible');

            // Show preview
            const previewContent = importModal.querySelector('#previewContent');
            const previewText = JSON.stringify(parsed, null, 2).split('\n').slice(0, PREVIEW_LINES).join('\n');
            const truncated = previewText.length < JSON.stringify(parsed, null, 2).length;
            previewContent.textContent = previewText + (truncated ? '\n\n... (截断预览)' : '');
            previewBox.classList.add('visible');
        };
        reader.onerror = () => {
            showError('文件读取失败');
        };
        reader.readAsText(file, 'UTF-8');
    }

    function showError(msg) {
        const errorMsg = importModal.querySelector('#errorMsg');
        errorMsg.textContent = msg;
        errorMsg.classList.add('visible');
        importModal.querySelector('#fileInfo').classList.remove('visible');
        importModal.querySelector('#previewBox').classList.remove('visible');
    }

    function countNodes(obj, depth = 0) {
        let count = 1;
        if (obj === null) return count;
        if (Array.isArray(obj)) {
            for (const item of obj) {
                count += countNodes(item, depth + 1);
            }
        } else if (typeof obj === 'object') {
            for (const v of Object.values(obj)) {
                count += countNodes(v, depth + 1);
            }
        }
        return count;
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    function openImportModal() {
        if (!importModal) createImportModal();
        importedData = null;
        importModal.querySelector('#importLoadingOverlay').classList.remove('active');
        importModal.querySelector('#fileInfo').classList.remove('visible');
        importModal.querySelector('#previewBox').classList.remove('visible');
        importModal.querySelector('#errorMsg').classList.remove('visible');
        importModal.querySelector('#importConfirmBtn').disabled = true;
        importModal.querySelector('#fileInput').value = '';
        importModal.classList.add('active');
    }

    function closeImportModal() {
        if (importModal) {
            importModal.classList.remove('active');
        }
    }

    // Expose global
    window.JsonImportModal = {
        open: openImportModal,
        close: closeImportModal
    };
})();