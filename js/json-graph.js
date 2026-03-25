// MIT License - Copyright (c) 2025 coax

const JsonGraph = (function() {
    const CONFIG = {
        MIN_ZOOM: 0.2,
        MAX_ZOOM: 5,
        NODE_COLORS: {
            string: { base: '#4EC9B0', light: '#6EE7D2', dark: '#3AA592' },
            number: { base: '#569CD6', light: '#7AB3E8', dark: '#3D7AB8' },
            boolean: { base: '#DCDCAA', light: '#E8E5B8', dark: '#B8B88A' },
            object: { base: '#C586C0', light: '#D9A8DB', dark: '#9A5A95' },
            array: { base: '#9CDCFE', light: '#B8D9FE', dark: '#6BB3D9' },
            null: { base: '#808080', light: '#A0A0A0', dark: '#606060' },
            root: { base: '#FF6B6B', light: '#FF8F8F', dark: '#D94A4A' }
        },
        THEME_COLORS: {
            dark: {
                bg: '#0d1117',
                fg: '#c9d1d9',
                fgDim: '#8b949e',
                border: '#30363d',
                link: '#30363d',
                highlight: 'rgba(78, 201, 176, 0.3)',
                warning: '#F44747',
                selected: '#58a6ff',
                overlay: 'rgba(0, 0, 0, 0.7)'
            },
            light: {
                bg: '#ffffff',
                fg: '#24292f',
                fgDim: '#57606a',
                border: '#d0d7de',
                link: '#d0d7de',
                highlight: 'rgba(78, 201, 176, 0.2)',
                warning: '#cf222e',
                selected: '#0969da',
                overlay: 'rgba(0, 0, 0, 0.5)'
            }
        },
        NODE_BASE_SIZE: 30,
        SIZE_DECAY: 0.85,
        SIZE_INFLATION: 2,
        WEBGL_THRESHOLD: 1000,
        PAGINATION_THRESHOLD: 500,
        PAGE_SIZE: 150,
        CACHE_SIZE: 3,
        MIN_MODAL_WIDTH: 320,
        MIN_MODAL_HEIGHT: 240,
        MAX_MODAL_WIDTH_RATIO: 0.85,
        MAX_MODAL_HEIGHT_RATIO: 0.85
    };

    let modal = null, modalContent = null, svg = null, defs = null, mainGroup = null;
    let linksGroup = null, nodesGroup = null;
    let nodes = [], links = [], visibleNodes = [];
    let currentZoom = 1;
    let isDragging = false, dragNode = null;
    let selectedNode = null;
    let highlightedNodes = new Set();
    let collapsedNodes = new Set();
    let markedNodes = new Set();
    let errorNodes = new Set();
    let contextMenu = null;
    let graphCache = null;
    let webglRenderer = null;
    let currentTheme = 'dark';
    let currentPage = 0;
    let totalPages = 1;
    let layoutHistory = [];
    let historyIndex = -1;
    let layoutAlgorithm = 'tree';
    let isCompactMode = false;
    let tabs = [];
    let activeTabId = null;
    let graphInstances = new Map();
    let isTouchDevice = false;

    function LRUCache(size) {
        this.size = size;
        this.cache = new Map();
        this.order = [];
    }

    LRUCache.prototype.get = function(key) {
        if (this.cache.has(key)) {
            const value = this.cache.get(key);
            this.order = this.order.filter(k => k !== key);
            this.order.push(key);
            return value;
        }
        return null;
    };

    LRUCache.prototype.set = function(key, value) {
        if (this.cache.has(key)) {
            this.order = this.order.filter(k => k !== key);
        } else if (this.cache.size >= this.size) {
            const oldest = this.order.shift();
            this.cache.delete(oldest);
        }
        this.cache.set(key, value);
        this.order.push(key);
    };

    graphCache = new LRUCache(CONFIG.CACHE_SIZE);

    function createModal(jsonData) {
        if (modal) {
            closeModal();
        }

        if (!jsonData || (typeof jsonData === 'object' && Object.keys(jsonData).length === 0)) {
            showEmptyStateModal();
            return;
        }

        const colors = CONFIG.THEME_COLORS[currentTheme];
        
        modal = document.createElement('div');
        modal.className = 'graph-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-window" style="width: 70%; height: 70%;">
                <div class="modal-header">
                    <div class="modal-tabs"></div>
                    <div class="modal-toolbar">
                        <button class="toolbar-btn" data-action="reset-layout" title="重置布局">🔄</button>
                        <button class="toolbar-btn" data-action="toggle-theme" title="切换主题">🌓</button>
                        <button class="toolbar-btn" data-action="export-png" title="导出PNG">📷</button>
                        <button class="toolbar-btn" data-action="export-svg" title="导出SVG">📐</button>
                        <button class="toolbar-btn" data-action="fullscreen" title="全屏">⛶</button>
                        <button class="toolbar-btn" data-action="close" title="关闭">✕</button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="modal-graph-area">
                        <div class="skeleton-loader">
                            <div class="skeleton-node"></div>
                            <div class="skeleton-node"></div>
                            <div class="skeleton-node"></div>
                        </div>
                    </div>
                    <div class="modal-sidebar collapsed">
                        <button class="sidebar-toggle">◀</button>
                        <div class="sidebar-content">
                            <div class="sidebar-section">
                                <div class="section-title">全局统计</div>
                                <div class="stat-item">
                                    <span class="stat-label">节点总数</span>
                                    <span class="stat-value" id="stat-nodes">0</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">嵌套深度</span>
                                    <span class="stat-value" id="stat-depth">0</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">数据类型分布</span>
                                    <div class="pie-chart" id="type-pie"></div>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">空值比例</span>
                                    <div class="progress-bar">
                                        <div class="progress-fill" id="null-progress"></div>
                                    </div>
                                    <span class="progress-text" id="null-text">0%</span>
                                </div>
                            </div>
                            <div class="sidebar-section selected-stats" style="display: none;">
                                <div class="section-title">选中节点</div>
                                <div class="stat-item">
                                    <span class="stat-label">路径</span>
                                    <span class="stat-value stat-path" id="selected-path">-</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">类型</span>
                                    <span class="stat-value" id="selected-type">-</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">子节点</span>
                                    <span class="stat-value" id="selected-children">0</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">层级</span>
                                    <span class="stat-value" id="selected-depth">0</span>
                                </div>
                            </div>
                            <div class="sidebar-section">
                                <button class="sidebar-btn" id="run-diagnosis">🔍 结构诊断</button>
                                <div class="diagnosis-results" id="diagnosis-results"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <div class="zoom-controls">
                        <button class="zoom-btn" data-action="zoom-out">➖</button>
                        <span class="zoom-display" id="zoom-display">100%</span>
                        <button class="zoom-btn" data-action="zoom-in">➕</button>
                    </div>
                    <div class="pagination-info" id="pagination-info"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const instanceId = 'graph-' + Date.now();
        const tabId = addTab(instanceId, 'JSON 图谱');
        activeTabId = tabId;

        const instance = {
            id: instanceId,
            json: jsonData,
            nodes: [],
            links: [],
            selectedNode: null,
            collapsedNodes: new Set(),
            markedNodes: new Set(),
            currentZoom: 1,
            currentPage: 0,
            history: [],
            historyIndex: -1
        };
        graphInstances.set(tabId, instance);

        setupModalEvents(instance);
        renderGraph(instance);

        setTimeout(() => {
            modal.classList.add('active');
            removeSkeleton();
        }, 50);
    }

    function showEmptyStateModal() {
        const colors = CONFIG.THEME_COLORS[currentTheme];
        
        modal = document.createElement('div');
        modal.className = 'graph-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-window" style="width: 50%; height: 50%; min-width: 400px;">
                <div class="modal-header">
                    <div class="modal-tabs"></div>
                    <div class="modal-toolbar">
                        <button class="toolbar-btn" data-action="close" title="关闭">✕</button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="empty-state-modal">
                        <div class="empty-state-icon">📊</div>
                        <div class="empty-state-title">暂无可视化数据</div>
                        <div class="empty-state-hint">JSON数据为空或无有效结构，无法生成关系图谱</div>
                        <div class="empty-state-actions">
                            <button class="empty-state-btn primary" id="load-sample-data">
                                📥 导入示例数据
                            </button>
                            <button class="empty-state-btn secondary" id="import-file">
                                📁 从文件导入
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#load-sample-data').addEventListener('click', () => {
            closeModal();
            if (typeof loadSampleData === 'function') {
                loadSampleData();
            }
        });

        modal.querySelector('#import-file').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        try {
                            const data = JSON.parse(evt.target.result);
                            closeModal();
                            open(data);
                        } catch (err) {
                            showNotification('文件解析失败: ' + err.message);
                        }
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        });

        const closeBtn = modal.querySelector('[data-action="close"]');
        closeBtn.addEventListener('click', () => closeModal());

        modal.querySelector('.modal-overlay').addEventListener('click', () => closeModal());

        setTimeout(() => {
            modal.classList.add('active');
        }, 50);
    }

    function showCrossOriginWarning() {
        const colors = CONFIG.THEME_COLORS[currentTheme];
        
        modal = document.createElement('div');
        modal.className = 'graph-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-window" style="width: 45%; height: 40%; min-width: 380px;">
                <div class="modal-header">
                    <div class="modal-tabs"></div>
                    <div class="modal-toolbar">
                        <button class="toolbar-btn" data-action="close" title="关闭">✕</button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="empty-state-modal cors-warning">
                        <div class="empty-state-icon">🔒</div>
                        <div class="empty-state-title">CORS 权限受限</div>
                        <div class="empty-state-hint">无法直接加载跨域JSON数据，请使用以下方案：</div>
                        <div class="cors-options">
                            <div class="cors-option">
                                <span class="cors-icon">📋</span>
                                <span>复制数据后粘贴到本页面</span>
                            </div>
                            <div class="cors-option">
                                <span class="cors-icon">📁</span>
                                <span>下载JSON文件后本地导入</span>
                            </div>
                            <div class="cors-option">
                                <span class="cors-icon">🌐</span>
                                <span>确保目标服务器允许跨域访问</span>
                            </div>
                        </div>
                        <div class="empty-state-actions">
                            <button class="empty-state-btn secondary" id="import-local-file">
                                📁 导入本地文件
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#import-local-file').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        try {
                            const data = JSON.parse(evt.target.result);
                            closeModal();
                            open(data);
                        } catch (err) {
                            showNotification('文件解析失败: ' + err.message);
                        }
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        });

        const closeBtn = modal.querySelector('[data-action="close"]');
        closeBtn.addEventListener('click', () => closeModal());

        modal.querySelector('.modal-overlay').addEventListener('click', () => closeModal());

        setTimeout(() => {
            modal.classList.add('active');
        }, 50);
    }

    function addTab(id, title) {
        const tabId = id;
        tabs.push({ id: tabId, title: title });
        renderTabs();
        return tabId;
    }

    function renderTabs() {
        const tabsContainer = modal.querySelector('.modal-tabs');
        if (!tabsContainer) return;

        tabsContainer.innerHTML = tabs.map(tab => `
            <div class="modal-tab ${tab.id === activeTabId ? 'active' : ''}" data-tab-id="${tab.id}">
                <span class="tab-title">${tab.title}</span>
                <button class="tab-close" data-close-tab="${tab.id}">✕</button>
            </div>
        `).join('');

        tabsContainer.querySelectorAll('.tab-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeTab(btn.dataset.closeTab);
            });
        });

        tabsContainer.querySelectorAll('.modal-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                switchTab(tab.dataset.tabId);
            });
        });
    }

    function switchTab(tabId) {
        if (activeTabId === tabId) return;

        const currentInstance = graphInstances.get(activeTabId);
        if (currentInstance) {
            saveInstanceState(currentInstance);
        }

        activeTabId = tabId;
        const newInstance = graphInstances.get(tabId);
        if (newInstance) {
            restoreInstanceState(newInstance);
        }

        renderTabs();
    }

    function closeTab(tabId) {
        if (tabs.length <= 1) {
            closeModal();
            return;
        }

        graphInstances.delete(tabId);
        tabs = tabs.filter(t => t.id !== tabId);

        if (activeTabId === tabId) {
            activeTabId = tabs[tabs.length - 1].id;
            const instance = graphInstances.get(activeTabId);
            if (instance) {
                restoreInstanceState(instance);
            }
        }

        renderTabs();
    }

    function saveInstanceState(instance) {
        instance.nodes = nodes.map(n => ({ ...n }));
        instance.links = [...links];
        instance.selectedNode = selectedNode;
        instance.collapsedNodes = new Set(collapsedNodes);
        instance.markedNodes = new Set(markedNodes);
        instance.currentZoom = currentZoom;
        instance.currentPage = currentPage;
        instance.history = [...layoutHistory];
        instance.historyIndex = historyIndex;
    }

    function restoreInstanceState(instance) {
        nodes = instance.nodes;
        links = instance.links;
        selectedNode = instance.selectedNode;
        collapsedNodes = instance.collapsedNodes;
        markedNodes = instance.markedNodes;
        currentZoom = instance.currentZoom;
        currentPage = instance.currentPage;
        layoutHistory = instance.history;
        historyIndex = instance.historyIndex;

        layout();
        render();
        updateStats(instance.json);
        updateSelectedNodeStats(selectedNode);
    }

    function setupModalEvents(instance) {
        const overlay = modal.querySelector('.modal-overlay');
        const modalWindow = modal.querySelector('.modal-window');
        const header = modal.querySelector('.modal-header');

        overlay.addEventListener('click', () => closeModal());

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.modal-toolbar') || e.target.closest('.modal-tabs')) return;
            startDragWindow(e, modalWindow);
        });

        modalWindow.addEventListener('mousedown', (e) => {
            if (e.target.closest('.modal-header') || e.target.closest('.modal-footer')) return;
            if (e.target === modalWindow) {
                startResizeWindow(e, modalWindow);
            }
        });

        modal.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                handleToolbarAction(btn.dataset.action, instance);
            });
        });

        modal.querySelectorAll('.zoom-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                handleZoomAction(btn.dataset.action);
            });
        });

        modal.querySelector('#run-diagnosis').addEventListener('click', () => {
            runDiagnosis(instance);
        });

        modal.querySelector('.sidebar-toggle').addEventListener('click', () => {
            modal.querySelector('.modal-sidebar').classList.toggle('collapsed');
        });

        document.addEventListener('keydown', handleKeydown);
    }

    function handleKeydown(e) {
        if (!modal) return;

        if (e.key === 'Escape') {
            closeModal();
            return;
        }

        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                undoLayout();
            } else if (e.key === 's') {
                e.preventDefault();
                saveLayout();
            }
        }
    }

    function startDragWindow(e, windowEl) {
        e.preventDefault();
        const startX = e.clientX - windowEl.offsetLeft;
        const startY = e.clientY - windowEl.offsetTop;

        function onMove(e) {
            windowEl.style.left = (e.clientX - startX) + 'px';
            windowEl.style.top = (e.clientY - startY) + 'px';
            windowEl.style.right = 'auto';
            windowEl.style.bottom = 'auto';
        }

        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    function startResizeWindow(e, windowEl) {
        e.preventDefault();
        const startWidth = windowEl.offsetWidth;
        const startHeight = windowEl.offsetHeight;
        const startX = e.clientX;
        const startY = e.clientY;

        function onMove(e) {
            const newWidth = Math.max(CONFIG.MIN_MODAL_WIDTH, Math.min(window.innerWidth * CONFIG.MAX_MODAL_WIDTH_RATIO, startWidth + e.clientX - startX));
            const newHeight = Math.max(CONFIG.MIN_MODAL_HEIGHT, Math.min(window.innerHeight * CONFIG.MAX_MODAL_HEIGHT_RATIO, startHeight + e.clientY - startY));
            windowEl.style.width = newWidth + 'px';
            windowEl.style.height = newHeight + 'px';

            isCompactMode = newWidth < 500;
        }

        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (svg) render();
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    function handleToolbarAction(action, instance) {
        switch (action) {
            case 'reset-layout':
                layout();
                saveLayout();
                render();
                break;
            case 'toggle-theme':
                currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
                applyTheme();
                render();
                break;
            case 'export-png':
                exportPNG();
                break;
            case 'export-svg':
                exportSVG();
                break;
            case 'fullscreen':
                toggleFullscreen();
                break;
            case 'close':
                closeModal();
                break;
        }
    }

    function handleZoomAction(action) {
        const factor = action === 'zoom-in' ? 1.2 : 0.8;
        const newZoom = Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, currentZoom * factor));
        
        const rect = svg.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const scaleChange = newZoom / currentZoom;
        mainGroup.setAttribute('transform', `translate(${centerX - centerX * scaleChange}, ${centerY - centerY * scaleChange}) scale(${newZoom})`);
        currentZoom = newZoom;
        updateZoomDisplay();
    }

    function toggleFullscreen() {
        const modalWindow = modal.querySelector('.modal-window');
        if (document.fullscreenElement) {
            document.exitFullscreen();
            modalWindow.style.width = '70%';
            modalWindow.style.height = '70%';
        } else {
            modalWindow.requestFullscreen();
            modalWindow.style.width = '100%';
            modalWindow.style.height = '100%';
        }
    }

    function applyTheme() {
        const colors = CONFIG.THEME_COLORS[currentTheme];
        const modalWindow = modal.querySelector('.modal-window');
        modalWindow.style.background = colors.bg;
        modalWindow.style.color = colors.fg;

        const styleId = 'graph-modal-styles';
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }

        styleEl.textContent = `
            .graph-modal .modal-window { background: ${colors.bg}; color: ${colors.fg}; }
            .graph-modal .modal-header { background: ${colors.bg}; border-bottom: 1px solid ${colors.border}; }
            .graph-modal .modal-tab { background: ${colors.bg}; border: 1px solid ${colors.border}; color: ${colors.fgDim}; }
            .graph-modal .modal-tab.active { background: ${colors.border}; color: ${colors.fg}; }
            .graph-modal .toolbar-btn { background: transparent; border: 1px solid ${colors.border}; color: ${colors.fg}; }
            .graph-modal .toolbar-btn:hover { background: ${colors.highlight}; }
            .graph-modal .modal-sidebar { background: ${colors.bg}; border-left: 1px solid ${colors.border}; }
            .graph-modal .modal-sidebar.collapsed .sidebar-toggle { background: ${colors.border}; color: ${colors.fg}; }
            .graph-modal .stat-label, .graph-modal .section-title { color: ${colors.fgDim}; }
            .graph-modal .stat-value { color: ${colors.fg}; }
            .graph-modal .progress-bar { background: ${colors.border}; }
            .graph-modal .zoom-btn, .graph-modal .zoom-display { background: ${colors.bg}; border: 1px solid ${colors.border}; color: ${colors.fg}; }
            .graph-modal .sidebar-btn { background: transparent; border: 1px solid ${colors.border}; color: ${colors.fg}; }
            .graph-modal .node-label { fill: ${colors.fg}; }
            .graph-modal .link { stroke: ${colors.border}; }
            .graph-modal .context-menu { background: ${colors.bg}; border: 1px solid ${colors.border}; color: ${colors.fg}; }
        `;
    }

    function closeModal() {
        if (modal) {
            const instance = graphInstances.get(activeTabId);
            if (instance) {
                saveInstanceState(instance);
                const cacheKey = JSON.stringify(instance.json).substring(0, 100);
                graphCache.set(cacheKey, {
                    nodes: nodes.map(n => ({...n})),
                    links: [...links],
                    collapsedNodes: Array.from(collapsedNodes),
                    markedNodes: Array.from(markedNodes),
                    zoom: currentZoom
                });
            }

            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
                modal = null;
                svg = null;
                nodes = [];
                links = [];
                tabs = [];
                activeTabId = null;
                graphInstances.clear();
                document.removeEventListener('keydown', handleKeydown);
            }, 300);
        }
    }

    function removeSkeleton() {
        const skeleton = modal.querySelector('.skeleton-loader');
        if (skeleton) skeleton.remove();
    }

    function initGraphArea() {
        const graphArea = modal.querySelector('.modal-graph-area');
        graphArea.innerHTML = '';

        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        graphArea.appendChild(svg);

        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svg.appendChild(defs);

        createGradients();
        createFilters();

        mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        svg.appendChild(mainGroup);

        linksGroup = null;

        setupSVGEvents();
        createContextMenu();
    }

    function createGradients() {
        Object.entries(CONFIG.NODE_COLORS).forEach(([type, colors]) => {
            const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
            gradient.setAttribute('id', `gradient-${type}`);
            gradient.setAttribute('cx', '30%');
            gradient.setAttribute('cy', '30%');

            const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop1.setAttribute('offset', '0%');
            stop1.setAttribute('stop-color', colors.light);

            const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop2.setAttribute('offset', '100%');
            stop2.setAttribute('stop-color', colors.dark);

            gradient.appendChild(stop1);
            gradient.appendChild(stop2);
            defs.appendChild(gradient);
        });

        const haloGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
        haloGradient.setAttribute('id', 'halo-gradient');
        haloGradient.setAttribute('cx', '50%');
        haloGradient.setAttribute('cy', '50%');

        const hStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        hStop1.setAttribute('offset', '0%');
        hStop1.setAttribute('stop-color', '#FF6B6B');
        hStop1.setAttribute('stop-opacity', '0.6');

        const hStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        hStop2.setAttribute('offset', '100%');
        hStop2.setAttribute('stop-color', '#FF6B6B');
        hStop2.setAttribute('stop-opacity', '0');

        haloGradient.appendChild(hStop1);
        haloGradient.appendChild(hStop2);
        defs.appendChild(haloGradient);
    }

    function createFilters() {
        const glowFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        glowFilter.setAttribute('id', 'glow');
        glowFilter.setAttribute('x', '-50%');
        glowFilter.setAttribute('y', '-50%');
        glowFilter.setAttribute('width', '200%');
        glowFilter.setAttribute('height', '200%');

        const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
        feGaussianBlur.setAttribute('stdDeviation', '2');
        feGaussianBlur.setAttribute('result', 'coloredBlur');

        const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
        const feMergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        feMergeNode1.setAttribute('in', 'coloredBlur');
        const feMergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        feMergeNode2.setAttribute('in', 'SourceGraphic');
        feMerge.appendChild(feMergeNode1);
        feMerge.appendChild(feMergeNode2);

        glowFilter.appendChild(feGaussianBlur);
        glowFilter.appendChild(feMerge);
        defs.appendChild(glowFilter);
    }

    function setupSVGEvents() {
        let isPanning = false;
        let startPan = { x: 0, y: 0 };

        svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, currentZoom * delta));
            
            const rect = svg.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const scaleChange = newZoom / currentZoom;
            const currentTransform = mainGroup.getAttribute('transform') || 'translate(0,0) scale(1)';
            const match = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)\s*scale\(([^)]+)\)/);
            
            let tx = 0, ty = 0;
            if (match) {
                tx = parseFloat(match[1]);
                ty = parseFloat(match[2]);
            }
            
            const newTx = mouseX - (mouseX - tx) * scaleChange;
            const newTy = mouseY - (mouseY - ty) * scaleChange;
            
            mainGroup.setAttribute('transform', `translate(${newTx}, ${newTy}) scale(${newZoom})`);
            currentZoom = newZoom;
            updateZoomDisplay();
        }, { passive: false });

        svg.addEventListener('mousedown', (e) => {
            if (e.target === svg || e.target.closest('.links-group') || e.target.closest('.main-group')) {
                isPanning = true;
                startPan = { x: e.clientX, y: e.clientY };
                svg.style.cursor = 'grabbing';
            }
        });

        svg.addEventListener('mousemove', (e) => {
            if (isPanning && !dragNode) {
                const dx = (e.clientX - startPan.x) / currentZoom;
                const dy = (e.clientY - startPan.y) / currentZoom;
                
                const currentTransform = mainGroup.getAttribute('transform') || 'translate(0,0) scale(1)';
                const match = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)\s*scale\(([^)]+)\)/);
                if (match) {
                    const tx = parseFloat(match[1]) + dx;
                    const ty = parseFloat(match[2]) + dy;
                    mainGroup.setAttribute('transform', `translate(${tx}, ${ty}) scale(${currentZoom})`);
                }
                
                startPan = { x: e.clientX, y: e.clientY };
            }
        });

        svg.addEventListener('mouseup', () => {
            isPanning = false;
            svg.style.cursor = 'default';
        });

        svg.addEventListener('click', (e) => {
            if (e.target === svg || e.target.closest('.links-group')) {
                clearSelection();
            }
        });
    }

    function setupTouchGestures() {
        let lastTouchDistance = 0;
        let lastTouchCenter = { x: 0, y: 0 };

        svg.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                lastTouchDistance = getTouchDistance(e.touches);
                lastTouchCenter = getTouchCenter(e.touches);
            }
            isTouchDevice = true;
        }, { passive: true });

        svg.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const distance = getTouchDistance(e.touches);
                const center = getTouchCenter(e.touches);
                
                if (lastTouchDistance > 0) {
                    const scale = distance / lastTouchDistance;
                    const newZoom = Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, currentZoom * scale));
                    
                    const rect = svg.getBoundingClientRect();
                    const mouseX = center.x - rect.left;
                    const mouseY = center.y - rect.top;
                    
                    const scaleChange = newZoom / currentZoom;
                    const currentTransform = mainGroup.getAttribute('transform') || 'translate(0,0) scale(1)';
                    const match = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)\s*scale\(([^)]+)\)/);
                    
                    let tx = 0, ty = 0;
                    if (match) {
                        tx = parseFloat(match[1]);
                        ty = parseFloat(match[2]);
                    }
                    
                    const newTx = mouseX - (mouseX - tx) * scaleChange;
                    const newTy = mouseY - (mouseY - ty) * scaleChange;
                    
                    mainGroup.setAttribute('transform', `translate(${newTx}, ${newTy}) scale(${newZoom})`);
                    currentZoom = newZoom;
                }
                
                lastTouchDistance = distance;
                lastTouchCenter = center;
            }
        }, { passive: false });

        svg.addEventListener('touchend', () => {
            lastTouchDistance = 0;
        });
    }

    function getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function getTouchCenter(touches) {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2
        };
    }

    function createContextMenu() {
        contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.innerHTML = `
            <div class="menu-item" data-action="copy-path">📍 复制节点路径</div>
            <div class="menu-item" data-action="copy-json">📄 提取JSON片段</div>
            <div class="menu-item" data-action="mark-important">⭐ 标记重点关注</div>
            <div class="menu-divider"></div>
            <div class="menu-item" data-action="collapse-children">➖ 折叠子节点</div>
            <div class="menu-item" data-action="expand-children">➕ 展开子节点</div>
        `;
        modal.querySelector('.modal-graph-area').appendChild(contextMenu);

        contextMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.menu-item');
            if (!item) return;
            
            const action = item.dataset.action;
            if (selectedNode) {
                handleContextAction(action, selectedNode);
            }
            
            contextMenu.style.display = 'none';
        });

        svg.addEventListener('contextmenu', (e) => {
            const nodeEl = e.target.closest('.node-group');
            if (nodeEl) {
                e.preventDefault();
                const nodeId = nodeEl.dataset.nodeId;
                const node = nodes.find(n => n.id === nodeId);
                if (node) {
                    selectedNode = node;
                    updateSelectedNodeStats(node);
                    
                    const markItem = contextMenu.querySelector('[data-action="mark-important"]');
                    markItem.textContent = markedNodes.has(nodeId) ? '⭐ 取消重点关注' : '⭐ 标记重点关注';
                    
                    const rect = modal.querySelector('.modal-graph-area').getBoundingClientRect();
                    contextMenu.style.left = Math.min(e.clientX - rect.left, rect.width - 180) + 'px';
                    contextMenu.style.top = Math.min(e.clientY - rect.top, rect.height - 200) + 'px';
                    contextMenu.style.display = 'block';
                    
                    render();
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.style.display = 'none';
            }
        });
    }

    function handleContextAction(action, node) {
        switch (action) {
            case 'copy-path':
                navigator.clipboard.writeText(buildJsonPath(node));
                showNotification('路径已复制');
                break;
            case 'copy-json':
                navigator.clipboard.writeText(JSON.stringify(node.value, null, 2));
                showNotification('JSON片段已复制');
                break;
            case 'mark-important':
                toggleMarkNode(node.id);
                break;
            case 'collapse-children':
                getChildNodes(node.id).forEach(c => collapsedNodes.add(c.id));
                rebuildAndRender();
                break;
            case 'expand-children':
                getChildNodes(node.id).forEach(c => collapsedNodes.delete(c.id));
                rebuildAndRender();
                break;
        }
    }

    function toggleMarkNode(nodeId) {
        if (markedNodes.has(nodeId)) {
            markedNodes.delete(nodeId);
        } else {
            markedNodes.add(nodeId);
        }
        render();
    }

    function buildJsonPath(node) {
        const pathParts = [];
        let current = node;
        
        while (current && !current.isRoot) {
            if (typeof current.key === 'number') {
                pathParts.unshift(`[${current.key}]`);
            } else {
                pathParts.unshift(`.${current.key}`);
            }
            current = nodes.find(n => n.id === current.parentId);
        }
        
        return '$' + pathParts.join('');
    }

    function getChildNodes(nodeId) {
        return links
            .filter(l => (l.source.id || l.source) === nodeId)
            .map(l => nodes.find(n => n.id === (l.target.id || l.target)))
            .filter(Boolean);
    }

    function saveLayout() {
        const layout = {
            nodes: nodes.map(n => ({ id: n.id, x: n.x, y: n.y })),
            collapsedNodes: Array.from(collapsedNodes),
            markedNodes: Array.from(markedNodes)
        };
        
        layoutHistory = layoutHistory.slice(0, historyIndex + 1);
        layoutHistory.push(layout);
        historyIndex++;
        
        if (layoutHistory.length > 50) {
            layoutHistory.shift();
            historyIndex--;
        }
    }

    function undoLayout() {
        if (historyIndex > 0) {
            historyIndex--;
            const layout = layoutHistory[historyIndex];
            
            layout.nodes.forEach(saved => {
                const node = nodes.find(n => n.id === saved.id);
                if (node) {
                    node.x = saved.x;
                    node.y = saved.y;
                }
            });
            
            collapsedNodes = new Set(layout.collapsedNodes);
            markedNodes = new Set(layout.markedNodes);
            render();
            showNotification('已撤销');
        }
    }

    function updateZoomDisplay() {
        const zoomDisplay = modal.querySelector('#zoom-display');
        if (zoomDisplay) {
            zoomDisplay.textContent = Math.round(currentZoom * 100) + '%';
        }
    }

    function renderGraph(instance) {
        initGraphArea();
        setupTouchGestures();
        buildGraph(instance.json);
        layout();
        render();
        updateStats(instance.json);
        applyTheme();
    }

    function buildGraph(json) {
        nodes = [];
        links = [];

        let nodeId = 0;
        const rootId = `node-${nodeId++}`;

        nodes.push({
            id: rootId,
            type: getValueType(json),
            value: json,
            key: 'root',
            depth: 0,
            isRoot: true,
            childCount: countChildren(json),
            x: 0,
            y: 0
        });

        function addChildren(parentId, obj, depth) {
            const type = getValueType(obj);

            if (type === 'object' && obj !== null) {
                Object.entries(obj).forEach(([key, value]) => {
                    const childId = `node-${nodeId++}`;
                    const childType = getValueType(value);
                    const hasChildren = childType === 'object' || childType === 'array';

                    nodes.push({
                        id: childId,
                        type: childType,
                        value: value,
                        key: key,
                        depth: depth + 1,
                        isRoot: false,
                        hasChildren: hasChildren,
                        childCount: hasChildren ? countChildren(value) : 0,
                        x: 0,
                        y: 0,
                        parentId: parentId
                    });

                    links.push({ source: parentId, target: childId });

                    if (hasChildren && !collapsedNodes.has(childId)) {
                        addChildren(childId, value, depth + 1);
                    }
                });
            } else if (type === 'array') {
                obj.forEach((item, index) => {
                    const childId = `node-${nodeId++}`;
                    const childType = getValueType(item);
                    const hasChildren = childType === 'object' || childType === 'array';

                    nodes.push({
                        id: childId,
                        type: childType,
                        value: item,
                        key: index,
                        depth: depth + 1,
                        isRoot: false,
                        hasChildren: hasChildren,
                        childCount: hasChildren ? countChildren(item) : 0,
                        x: 0,
                        y: 0,
                        parentId: parentId
                    });

                    links.push({ source: parentId, target: childId });

                    if (hasChildren && !collapsedNodes.has(childId)) {
                        addChildren(childId, item, depth + 1);
                    }
                });
            }
        }

        addChildren(rootId, json, 0);
    }

    function countChildren(obj) {
        const type = getValueType(obj);
        if (type === 'object' && obj !== null) return Object.keys(obj).length;
        if (type === 'array') return obj.length;
        return 0;
    }

    function getValueType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }

    function layout() {
        const graphArea = modal.querySelector('.modal-graph-area');
        const width = graphArea.clientWidth || 600;
        const height = graphArea.clientHeight || 400;

        const rootNodes = nodes.filter(n => n.isRoot);
        if (rootNodes.length === 0) return;

        const levels = {};
        nodes.forEach(n => {
            if (!levels[n.depth]) levels[n.depth] = [];
            levels[n.depth].push(n);
        });

        const maxDepth = Math.max(...nodes.map(n => n.depth));
        const levelHeight = isCompactMode 
            ? Math.min(50, height * 0.5 / (maxDepth + 1))
            : Math.min(80, height * 0.6 / (maxDepth + 1));

        rootNodes.forEach((root, i) => {
            root.x = width / 2 + (i - rootNodes.length / 2) * 150;
            root.y = isCompactMode ? height * 0.1 : height * 0.1;
        });

        Object.entries(levels).forEach(([depth, levelNodes]) => {
            if (parseInt(depth) === 0) return;
            const y = isCompactMode 
                ? height * 0.1 + parseInt(depth) * levelHeight
                : height * 0.1 + parseInt(depth) * levelHeight;
            
            const nodeSpacing = isCompactMode ? 60 : 100;
            const totalWidth = levelNodes.length * nodeSpacing;
            let x = (width - totalWidth) / 2 + nodeSpacing / 2;
            
            levelNodes.forEach((node) => {
                node.y = y;
                node.x = x;
                x += nodeSpacing;
            });
        });
    }

    function render() {
        if (nodes.length === 0 || !svg) return;

        mainGroup.innerHTML = '';

        paginateNodes();

        if (selectedNode) {
            const children = getChildNodes(selectedNode.id);
            children.forEach(c => highlightedNodes.add(c.id));
            highlightedNodes.add(selectedNode.id);
        }

        links.forEach((link, idx) => {
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;
            const source = nodes.find(n => n.id === sourceId);
            const target = nodes.find(n => n.id === targetId);
            if (!source || !target) return;

            const isHighlighted = highlightedNodes.has(source.id) && highlightedNodes.has(target.id);

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', source.x);
            line.setAttribute('y1', source.y);
            line.setAttribute('x2', target.x);
            line.setAttribute('y2', target.y);
            line.setAttribute('stroke', isHighlighted ? 'var(--graph-selected, #58a6ff)' : 'var(--graph-border, #30363d)');
            line.setAttribute('stroke-width', isHighlighted ? 2 : 1);
            line.setAttribute('stroke-opacity', isHighlighted ? 0.8 : 0.4);
            line.dataset.sourceId = sourceId;
            line.dataset.targetId = targetId;
            mainGroup.insertBefore(line, mainGroup.firstChild);
        });

        highlightedNodes.clear();

        visibleNodes.forEach(node => {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('class', 'node-group');
            group.setAttribute('transform', `translate(${node.x}, ${node.y})`);
            group.dataset.nodeId = node.id;

            const baseSize = isCompactMode ? CONFIG.NODE_BASE_SIZE * 0.7 : CONFIG.NODE_BASE_SIZE;
            const childBonus = node.childCount * CONFIG.SIZE_INFLATION;
            const decay = Math.pow(CONFIG.SIZE_DECAY, node.depth);
            const size = Math.max(baseSize * decay + childBonus, 12);

            const isHighlighted = highlightedNodes.has(node.id);
            const isSelected = selectedNode && selectedNode.id === node.id;

            if (node.isRoot) {
                const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                halo.setAttribute('r', size * 1.8);
                halo.setAttribute('fill', 'url(#halo-gradient)');
                halo.innerHTML = `<animate attributeName="r" values="${size * 1.5};${size * 2.2};${size * 1.5}" dur="2s" repeatCount="indefinite"/>`;
                group.appendChild(halo);
            }

            if (markedNodes.has(node.id)) {
                const star = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                star.setAttribute('x', size + 4);
                star.setAttribute('y', -size);
                star.setAttribute('font-size', '10');
                star.textContent = '⭐';
                group.appendChild(star);
            }

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('r', size);
            circle.setAttribute('fill', `url(#gradient-${node.type})`);
            circle.setAttribute('filter', node.isRoot ? 'url(#glow)' : 'none');
            
            if (node.type === 'null') {
                circle.setAttribute('stroke', 'var(--graph-fg-dim, #8b949e)');
                circle.setAttribute('stroke-width', 2);
                circle.setAttribute('stroke-dasharray', '4,2');
            }
            
            if (isHighlighted || isSelected) {
                circle.setAttribute('stroke', 'var(--graph-selected, #58a6ff)');
                circle.setAttribute('stroke-width', isSelected ? 3 : 2);
            }
            
            group.appendChild(circle);

            let label = node.isRoot ? 'root' : (typeof node.key === 'number' ? `[${node.key}]` : node.key);
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('class', 'node-label');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('fill', 'var(--cli-bg, #0d1117)');
            text.setAttribute('font-size', Math.max(6, size / 3));
            
            if (isCompactMode) {
                text.textContent = label.length > 4 ? label.slice(0, 3) + '..' : label;
                text.setAttribute('title', label);
            } else {
                text.textContent = label.length > 8 ? label.slice(0, 6) + '..' : label;
            }
            
            group.appendChild(text);

            if (!isCompactMode) {
                const valueText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                valueText.setAttribute('class', 'node-value');
                valueText.setAttribute('text-anchor', 'middle');
                valueText.setAttribute('y', size + 12);
                valueText.setAttribute('fill', 'var(--graph-fg-dim, #8b949e)');
                valueText.setAttribute('font-size', '8');
                valueText.textContent = getDisplayValue(node);
                group.appendChild(valueText);
            }

            if (node.hasChildren) {
                const toggle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                toggle.setAttribute('class', 'node-toggle');
                toggle.setAttribute('text-anchor', 'middle');
                toggle.setAttribute('y', -size - 6);
                toggle.setAttribute('fill', 'var(--graph-fg, #c9d1d9)');
                toggle.setAttribute('font-size', '10');
                toggle.setAttribute('cursor', 'pointer');
                toggle.textContent = collapsedNodes.has(node.id) ? '⊕' : '⊖';
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleCollapse(node.id);
                });
                group.appendChild(toggle);
            }

            group.addEventListener('mousedown', (e) => {
                if (e.button === 0) startDrag(e, node);
            });

            group.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedNode = node;
                updateSelectedNodeStats(node);
                render();
            });

            group.addEventListener('dblclick', () => {
                if (node.hasChildren) {
                    toggleCollapse(node.id);
                }
            });

            mainGroup.appendChild(group);
        });
    }

    function getDisplayValue(node) {
        const type = node.type;
        const value = node.value;

        if (type === 'object') return collapsedNodes.has(node.id) ? '{..}' : Object.keys(value).length + ' keys';
        if (type === 'array') return collapsedNodes.has(node.id) ? '[..]' : value.length + ' items';
        if (type === 'string') return `"${value.slice(0, 6)}${value.length > 6 ? '..' : ''}"`;
        if (type === 'null') return 'null';
        return String(value).slice(0, 8);
    }

    function startDrag(e, node) {
        e.preventDefault();
        e.stopPropagation();
        
        const startX = e.clientX;
        const startY = e.clientY;
        const origX = node.x;
        const origY = node.y;
        let moved = false;

        function onMove(moveEvent) {
            const dx = (moveEvent.clientX - startX) / currentZoom;
            const dy = (moveEvent.clientY - startY) / currentZoom;
            
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                moved = true;
            }
            
            if (moved) {
                node.x = origX + dx;
                node.y = origY + dy;
                updateNodePosition(node);
            }
        }

        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (moved) {
                saveLayout();
            }
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    function updateNodePosition(node) {
        const group = mainGroup.querySelector(`[data-node-id="${node.id}"]`);
        if (group) {
            group.setAttribute('transform', `translate(${node.x}, ${node.y})`);
        }

        const lineEls = mainGroup.querySelectorAll('line');
        lineEls.forEach(line => {
            const sourceId = line.dataset.sourceId;
            const targetId = line.dataset.targetId;
            
            if (sourceId === node.id || targetId === node.id) {
                const source = nodes.find(n => n.id === sourceId);
                const target = nodes.find(n => n.id === targetId);
                if (source && target) {
                    line.setAttribute('x1', source.x);
                    line.setAttribute('y1', source.y);
                    line.setAttribute('x2', target.x);
                    line.setAttribute('y2', target.y);
                }
            }
        });
    }

    function toggleCollapse(nodeId) {
        if (collapsedNodes.has(nodeId)) {
            collapsedNodes.delete(nodeId);
        } else {
            collapsedNodes.add(nodeId);
        }
        rebuildAndRender();
    }

    function rebuildAndRender() {
        const instance = graphInstances.get(activeTabId);
        if (instance) {
            buildGraph(instance.json);
            layout();
            render();
        }
    }

    function paginateNodes() {
        if (nodes.length <= CONFIG.PAGINATION_THRESHOLD) {
            visibleNodes = [...nodes];
            totalPages = 1;
            currentPage = 0;
            updatePaginationInfo();
            return;
        }

        totalPages = Math.ceil(nodes.length / CONFIG.PAGE_SIZE);
        
        const start = currentPage * CONFIG.PAGE_SIZE;
        const end = Math.min(start + CONFIG.PAGE_SIZE, nodes.length);
        visibleNodes = nodes.slice(start, end);
        
        updatePaginationInfo();
    }

    function updatePaginationInfo() {
        const info = modal.querySelector('#pagination-info');
        if (info) {
            if (totalPages > 1) {
                info.textContent = `显示 ${currentPage + 1} / ${totalPages} 页 (${nodes.length} 节点)`;
            } else {
                info.textContent = `${nodes.length} 节点`;
            }
        }
    }

    function clearSelection() {
        selectedNode = null;
        updateSelectedNodeStats(null);
        render();
    }

    function updateStats(json) {
        const typeCount = { string: 0, number: 0, boolean: 0, object: 0, array: 0, null: 0 };
        let nullCount = 0;
        let maxDepth = 0;
        let totalNodes = 0;

        function traverse(obj, depth) {
            maxDepth = Math.max(maxDepth, depth);
            totalNodes++;
            const type = getValueType(obj);
            typeCount[type]++;
            if (type === 'null') nullCount++;
            if (type === 'object' && obj !== null) Object.values(obj).forEach(v => traverse(v, depth + 1));
            else if (type === 'array') obj.forEach(v => traverse(v, depth + 1));
        }

        traverse(json, 0);

        document.getElementById('stat-nodes').textContent = totalNodes;
        document.getElementById('stat-depth').textContent = maxDepth;

        const pieContainer = document.getElementById('type-pie');
        pieContainer.innerHTML = '';
        const total = Object.values(typeCount).reduce((a, b) => a + b, 0);
        let currentAngle = 0;

        Object.entries(typeCount).forEach(([type, count]) => {
            if (count > 0) {
                const angle = (count / total) * 360;
                const segment = document.createElement('div');
                segment.className = `pie-segment pie-${type}`;
                segment.style.backgroundColor = CONFIG.NODE_COLORS[type].base;
                segment.style.transform = `rotate(${currentAngle}deg) skew(${90 - angle}deg)`;
                pieContainer.appendChild(segment);
                currentAngle += angle;
            }
        });

        const nullPercent = total > 0 ? ((nullCount / total) * 100).toFixed(1) : 0;
        document.getElementById('null-progress').style.width = `${nullPercent}%`;
        document.getElementById('null-text').textContent = `${nullPercent}%`;
    }

    function updateSelectedNodeStats(node) {
        const statsSection = modal.querySelector('.selected-stats');
        if (!node) {
            statsSection.style.display = 'none';
            return;
        }

        statsSection.style.display = 'block';
        document.getElementById('selected-path').textContent = buildJsonPath(node);
        document.getElementById('selected-type').textContent = node.type;
        document.getElementById('selected-children').textContent = getChildNodes(node.id).length;
        document.getElementById('selected-depth').textContent = node.depth;
    }

    function runDiagnosis(instance) {
        const results = [];
        let emptyObjectCount = 0, emptyArrayCount = 0, nullValueCount = 0, maxNesting = 0;

        function traverse(obj, depth) {
            maxNesting = Math.max(maxNesting, depth);
            const type = getValueType(obj);
            if (type === 'object' && obj !== null && Object.keys(obj).length === 0) emptyObjectCount++;
            else if (type === 'array' && obj.length === 0) emptyArrayCount++;
            else if (type === 'null') nullValueCount++;
            if (type === 'object' && obj !== null) Object.values(obj).forEach(v => traverse(v, depth + 1));
            else if (type === 'array') obj.forEach(v => traverse(v, depth + 1));
        }

        traverse(instance.json, 0);

        if (emptyObjectCount > 0) results.push({ level: 'warning', message: `发现 ${emptyObjectCount} 个空对象` });
        if (emptyArrayCount > 0) results.push({ level: 'warning', message: `发现 ${emptyArrayCount} 个空数组` });
        if (nullValueCount > 0) results.push({ level: 'info', message: `包含 ${nullValueCount} 个 null 值` });
        if (maxNesting > 10) results.push({ level: 'warning', message: `嵌套深度 ${maxNesting} 层，建议重构` });
        if (results.length === 0) results.push({ level: 'success', message: '结构健康，无明显问题' });

        const resultsDiv = document.getElementById('diagnosis-results');
        resultsDiv.innerHTML = results.map(r => `
            <div class="diagnosis-item diagnosis-${r.level}">
                <span>${r.level === 'success' ? '✅' : r.level === 'warning' ? '⚠️' : 'ℹ️'}</span>
                <span>${r.message}</span>
            </div>
        `).join('');
    }

    function exportSVG() {
        const svgClone = svg.cloneNode(true);
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        const graphArea = modal.querySelector('.modal-graph-area');
        svgClone.setAttribute('width', graphArea.clientWidth);
        svgClone.setAttribute('height', graphArea.clientHeight);

        const blob = new Blob([svgClone.outerHTML], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'json-graph.svg';
        a.click();
        URL.revokeObjectURL(url);
    }

    function exportPNG() {
        const graphArea = modal.querySelector('.modal-graph-area');
        const svgClone = svg.cloneNode(true);
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svgClone.setAttribute('width', graphArea.clientWidth);
        svgClone.setAttribute('height', graphArea.clientHeight);

        const canvas = document.createElement('canvas');
        canvas.width = graphArea.clientWidth * 2;
        canvas.height = graphArea.clientHeight * 2;
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2);

        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'json-graph.png';
                a.click();
                URL.revokeObjectURL(url);
            });
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgClone.outerHTML)));
    }

    function showNotification(message) {
        const notif = document.createElement('div');
        notif.className = 'graph-notification';
        notif.textContent = message;
        modal.querySelector('.modal-graph-area').appendChild(notif);
        setTimeout(() => notif.remove(), 2000);
    }

    function open(json) {
        createModal(json);
    }

    function close() {
        closeModal();
    }

    function isOpen() {
        return modal !== null && modal.classList.contains('active');
    }

    function clearCache() {
        graphCache.cache.clear();
        graphCache.order = [];
        console.log('[JsonGraph] Cache cleared');
    }

    function reset() {
        clearCache();
        collapsedNodes.clear();
        markedNodes.clear();
        highlightedNodes.clear();
        selectedNode = null;
        currentZoom = 1;
        currentPage = 0;
        layoutHistory = [];
        historyIndex = -1;
        console.log('[JsonGraph] Reset complete');
    }

    return {
        open,
        close,
        isOpen,
        clearCache,
        reset
    };
})();