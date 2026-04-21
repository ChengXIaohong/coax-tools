/**
 * JSON Graph 3D - Three.js based 3D visualization
 * MIT License - Copyright (c) 2025 coax
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const JsonGraph3D = (function() {
    const CONFIG = {
        SPHERE_LAYER_SPACING: 120,
        NODE_RADIUS: 18,
        SIZE_DECAY: 0.85,
        SIZE_INFLATION: 1.5,
        MIN_ZOOM: 0.3,
        MAX_ZOOM: 5,
        FAMILY_COMPACT_CHILDREN_THRESHOLD: 10,
        FAMILY_COMPACT_CHILD_SPACING: 40,
        WEBGL_THRESHOLD: 1000,
        NODE_COLORS: {
            string: 0x4EC9B0,
            number: 0x569CD6,
            boolean: 0xDCDCAA,
            object: 0xC586C0,
            array: 0x9CDCFE,
            null: 0x808080,
            root: 0xFF6B6B
        },
        THEME_COLORS: {
            dark: {
                bg: 0x0d1117,
                fg: 0xc9d1d9,
                fgDim: 0x8b949e,
                border: 0x30363d,
                highlight: 0x58a6ff,
                selected: 0x58a6ff
            },
            light: {
                bg: 0xffffff,
                fg: 0x24292f,
                fgDim: 0x57606a,
                border: 0xd0d7de,
                highlight: 0x0969da,
                selected: 0x0969da
            }
        }
    };

    // State
    let modal = null, modalContent = null;
    let scene = null, camera = null, renderer = null, composer = null;
    let labelRenderer = null;
    let controls = null;
    let nodes = [], links = [], nodeMeshes = [], linkLines = [];
    let selectedNode = null;
    let highlightedNodes = new Set();
    let collapsedNodes = new Set();
    let markedNodes = new Set();
    let contextMenu = null;
    let currentTheme = 'dark';
    let isFamilyCompactMode = false;
    let tabs = [];
    let activeTabId = null;
    let graphInstances = new Map();
    let animationMixers = [];

    // Three.js objects
    let raycaster = null;
    let mouse = null;

    function getValueType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }

    function countChildren(obj) {
        const type = getValueType(obj);
        if (type === 'object' && obj !== null) return Object.keys(obj).length;
        if (type === 'array') return obj.length;
        return 0;
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
            x: 0, y: 0, z: 0
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
                        x: 0, y: 0, z: 0,
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
                        x: 0, y: 0, z: 0,
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

    function applySphericalLayout() {
        const rootNodes = nodes.filter(n => n.isRoot);
        if (rootNodes.length === 0) return;

        const depthGroups = {};
        nodes.forEach(n => {
            if (!depthGroups[n.depth]) depthGroups[n.depth] = [];
            depthGroups[n.depth].push(n);
        });

        const maxDepth = Math.max(...nodes.map(n => n.depth));
        const maxRadius = maxDepth * CONFIG.SPHERE_LAYER_SPACING;

        rootNodes.forEach(root => {
            root.x = 0;
            root.y = 0;
            root.z = 0;
        });

        Object.entries(depthGroups).forEach(([depth, levelNodes]) => {
            if (parseInt(depth) === 0) return;

            const radius = parseInt(depth) * CONFIG.SPHERE_LAYER_SPACING;
            const count = levelNodes.length;

            if (isFamilyCompactMode && count >= CONFIG.FAMILY_COMPACT_CHILDREN_THRESHOLD) {
                applyFamilyCompactLayout(levelNodes, radius);
            } else {
                levelNodes.forEach((node, idx) => {
                    const angle = (2 * Math.PI * idx) / count - Math.PI / 2;
                    node.x = radius * Math.cos(angle);
                    node.y = radius * Math.sin(angle) * 0.5;
                    node.z = radius * Math.sin(angle);
                });
            }
        });
    }

    function applyFamilyCompactLayout(levelNodes, baseRadius) {
        const rows = Math.ceil(Math.sqrt(levelNodes.length));
        const cols = Math.ceil(levelNodes.length / rows);
        const spacing = CONFIG.FAMILY_COMPACT_CHILD_SPACING;

        levelNodes.forEach((node, idx) => {
            const row = Math.floor(idx / cols);
            const col = idx % cols;
            const xOffset = (col - (cols - 1) / 2) * spacing;
            const yOffset = (row - (rows - 1) / 2) * spacing * 0.6;
            node.x = baseRadius + xOffset;
            node.y = yOffset;
            node.z = xOffset * 0.3;
        });
    }

    function createScene() {
        scene = new THREE.Scene();
        const colors = CONFIG.THEME_COLORS[currentTheme];
        scene.background = new THREE.Color(colors.bg);
        scene.fog = new THREE.Fog(colors.bg, 500, 1500);
    }

    function createCamera() {
        const graphArea = modal.querySelector('.modal-graph-area');
        const width = graphArea.clientWidth || 800;
        const height = graphArea.clientHeight || 600;

        camera = new THREE.PerspectiveCamera(60, width / height, 1, 5000);
        camera.position.set(0, 200, 800);
        camera.lookAt(0, 0, 0);
    }

    function createRenderer() {
        const graphArea = modal.querySelector('.modal-graph-area');
        const width = graphArea.clientWidth;
        const height = graphArea.clientHeight;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        graphArea.appendChild(renderer.domElement);
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';

        labelRenderer = new CSS2DRenderer();
        labelRenderer.setSize(width, height);
        labelRenderer.domElement.style.position = 'absolute';
        labelRenderer.domElement.style.top = '0';
        labelRenderer.domElement.style.left = '0';
        labelRenderer.domElement.style.pointerEvents = 'none';
        graphArea.appendChild(labelRenderer.domElement);
    }

    function createLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 1.0, 2000);
        pointLight.position.set(200, 400, 600);
        scene.add(pointLight);

        const backLight = new THREE.PointLight(0x4EC9B0, 0.5, 1500);
        backLight.position.set(-300, -200, -400);
        scene.add(backLight);
    }

    function createControls() {
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = CONFIG.MIN_ZOOM * 100;
        controls.maxDistance = CONFIG.MAX_ZOOM * 1000;
        controls.target.set(0, 0, 0);
    }

    function createNodeMesh(node) {
        const baseRadius = CONFIG.NODE_RADIUS;
        const childBonus = node.childCount * CONFIG.SIZE_INFLATION;
        const decay = Math.pow(CONFIG.SIZE_DECAY, node.depth);
        const radius = Math.max(baseRadius * decay + childBonus, 8);

        const color = node.isRoot ? CONFIG.NODE_COLORS.root : CONFIG.NODE_COLORS[node.type] || 0x808080;

        const geometry = new THREE.SphereGeometry(radius, 24, 24);
        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: node.isRoot ? color : 0x000000,
            emissiveIntensity: node.isRoot ? 0.3 : 0,
            shininess: 80,
            transparent: node.type === 'null',
            opacity: node.type === 'null' ? 0.5 : 1.0
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(node.x, node.y, node.z);
        mesh.userData = { nodeId: node.id, node: node };

        if (node.isRoot) {
            const glowGeometry = new THREE.SphereGeometry(radius * 1.8, 24, 24);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.15
            });
            const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
            mesh.add(glowMesh);
        }

        const label = createNodeLabel(node, radius);
        mesh.add(label);

        scene.add(mesh);
        nodeMeshes.push(mesh);
        return mesh;
    }

    function createNodeLabel(node, radius) {
        const labelText = node.isRoot ? 'root' : (typeof node.key === 'number' ? `[${node.key}]` : String(node.key));
        const displayText = labelText.length > 8 ? labelText.slice(0, 6) + '..' : labelText;

        const labelDiv = document.createElement('div');
        labelDiv.className = 'graph3d-node-label';
        labelDiv.textContent = displayText;
        labelDiv.style.color = '#' + CONFIG.THEME_COLORS[currentTheme].fg.toString(16).padStart(6, '0');

        const label = new CSS2DObject(labelDiv);
        label.position.set(0, radius + 12, 0);
        label.userData = { isLabel: true };
        return label;
    }

    function createLinkLine(sourceNode, targetNode) {
        const points = [
            new THREE.Vector3(sourceNode.x, sourceNode.y, sourceNode.z),
            new THREE.Vector3(targetNode.x, targetNode.y, targetNode.z)
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: CONFIG.THEME_COLORS[currentTheme].border,
            transparent: true,
            opacity: 0.4
        });

        const line = new THREE.Line(geometry, material);
        line.userData = {
            sourceId: sourceNode.id,
            targetId: targetNode.id
        };

        scene.add(line);
        linkLines.push(line);
        return line;
    }

    function rebuildScene() {
        nodeMeshes.forEach(mesh => scene.remove(mesh));
        linkLines.forEach(line => scene.remove(line));
        nodeMeshes = [];
        linkLines = [];

        buildGraph(graphInstances.get(activeTabId)?.json || {});
        applySphericalLayout();

        links.forEach(link => {
            const source = nodes.find(n => n.id === (link.source.id || link.source));
            const target = nodes.find(n => n.id === (link.target.id || link.target));
            if (source && target) {
                createLinkLine(source, target);
            }
        });

        nodes.forEach(node => {
            createNodeMesh(node);
        });
    }

    function createModal(jsonData) {
        if (modal) closeModal();

        const colors = CONFIG.THEME_COLORS[currentTheme];

        modal = document.createElement('div');
        modal.className = 'graph-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-window" style="width: 80%; height: 80%;">
                <div class="modal-header">
                    <div class="modal-tabs"></div>
                    <div class="modal-toolbar">
                        <button class="toolbar-btn" data-action="reset-camera" title="重置视角">🔄</button>
                        <button class="toolbar-btn" data-action="toggle-theme" title="切换主题">🌓</button>
                        <button class="toolbar-btn" data-action="toggle-family-compact" title="族压缩模式">🔲</button>
                        <button class="toolbar-btn" data-action="fullscreen" title="全屏">⛶</button>
                        <button class="toolbar-btn" data-action="close" title="关闭">✕</button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="modal-graph-area" id="graph3d-area"></div>
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
                    <div class="pagination-info" id="pagination-info">3D 图谱模式</div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const instanceId = 'graph3d-' + Date.now();
        const tabId = addTab(instanceId, 'JSON 3D');
        activeTabId = tabId;

        const instance = {
            id: instanceId,
            json: jsonData,
            selectedNode: null,
            collapsedNodes: new Set(collapsedNodes),
            markedNodes: new Set(markedNodes),
            isFamilyCompactMode: false
        };
        graphInstances.set(tabId, instance);

        setupModalEvents();
        initThreeJS();
        rebuildScene();
        updateStats(jsonData);
        applyTheme();

        setTimeout(() => modal.classList.add('active'), 50);
    }

    function initThreeJS() {
        createScene();
        createCamera();
        createRenderer();
        createLights();
        createControls();
        setupRaycaster();
        animate();
    }

    function setupRaycaster() {
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();
    }

    function animate() {
        if (!modal || !renderer) return;
        requestAnimationFrame(animate);

        if (controls) controls.update();

        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
        if (labelRenderer && scene && camera) {
            labelRenderer.render(scene, camera);
        }
    }

    function setupModalEvents() {
        const overlay = modal.querySelector('.modal-overlay');
        overlay.addEventListener('click', () => closeModal());

        modal.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', () => handleToolbarAction(btn.dataset.action));
        });

        modal.querySelectorAll('.zoom-btn').forEach(btn => {
            btn.addEventListener('click', () => handleZoomAction(btn.dataset.action));
        });

        modal.querySelector('.sidebar-toggle').addEventListener('click', () => {
            modal.querySelector('.modal-sidebar').classList.toggle('collapsed');
        });

        const graphArea = modal.querySelector('.modal-graph-area');
        graphArea.addEventListener('click', onGraphClick);
        graphArea.addEventListener('dblclick', onGraphDblClick);
        graphArea.addEventListener('contextmenu', onGraphContextMenu);

        window.addEventListener('resize', onWindowResize);
        document.addEventListener('keydown', handleKeydown);
    }

    function handleKeydown(e) {
        if (!modal) return;
        if (e.key === 'Escape') closeModal();
    }

    function handleToolbarAction(action) {
        switch (action) {
            case 'reset-camera':
                resetCamera();
                break;
            case 'toggle-theme':
                currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
                applyTheme();
                rebuildScene();
                break;
            case 'toggle-family-compact':
                isFamilyCompactMode = !isFamilyCompactMode;
                const btn = modal.querySelector('[data-action="toggle-family-compact"]');
                if (btn) btn.classList.toggle('active', isFamilyCompactMode);
                rebuildScene();
                break;
            case 'fullscreen':
                modal.querySelector('.modal-window').requestFullscreen?.();
                break;
            case 'close':
                closeModal();
                break;
        }
    }

    function handleZoomAction(action) {
        const factor = action === 'zoom-in' ? 1.2 : 0.8;
        const newZoom = Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, camera.userData.zoom || 1 * factor));
        camera.userData.zoom = newZoom;

        const distance = 800 / newZoom;
        camera.position.set(
            camera.position.x * factor,
            camera.position.y * factor,
            camera.position.z * factor
        );
        controls.update();

        modal.querySelector('#zoom-display').textContent = Math.round(newZoom * 100) + '%';
    }

    function resetCamera() {
        camera.position.set(0, 200, 800);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();
        camera.userData.zoom = 1;
        modal.querySelector('#zoom-display').textContent = '100%';
    }

    function onGraphClick(e) {
        const graphArea = modal.querySelector('.modal-graph-area');
        const rect = graphArea.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(nodeMeshes);

        if (intersects.length > 0) {
            const mesh = intersects[0].object;
            const nodeId = mesh.userData.nodeId;
            const node = nodes.find(n => n.id === nodeId);

            if (node) {
                selectedNode = node;
                updateSelectedNodeStats(node);
                highlightNode(node);
            }
        } else {
            clearSelection();
        }
    }

    function onGraphDblClick(e) {
        const graphArea = modal.querySelector('.modal-graph-area');
        const rect = graphArea.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(nodeMeshes);

        if (intersects.length > 0) {
            const mesh = intersects[0].object;
            const node = mesh.userData.node;
            if (node && node.hasChildren) {
                toggleCollapse(node.id);
            }
        }
    }

    function onGraphContextMenu(e) {
        e.preventDefault();

        const graphArea = modal.querySelector('.modal-graph-area');
        const rect = graphArea.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(nodeMeshes);

        if (intersects.length > 0) {
            const mesh = intersects[0].object;
            const node = mesh.userData.node;
            selectedNode = node;
            showContextMenu(e.clientX, e.clientY, node);
        }
    }

    function showContextMenu(x, y, node) {
        if (!contextMenu) {
            contextMenu = document.createElement('div');
            contextMenu.className = 'context-menu';
            modal.querySelector('.modal-graph-area').appendChild(contextMenu);
        }

        contextMenu.innerHTML = `
            <div class="menu-item" data-action="copy-path">📍 复制节点路径</div>
            <div class="menu-item" data-action="copy-json">📄 提取JSON片段</div>
            <div class="menu-item" data-action="mark-important">⭐ 标记重点关注</div>
            <div class="menu-divider"></div>
            <div class="menu-item" data-action="collapse-children">➖ 折叠子节点</div>
            <div class="menu-item" data-action="expand-children">➕ 展开子节点</div>
        `;

        const markItem = contextMenu.querySelector('[data-action="mark-important"]');
        if (markedNodes.has(node.id)) {
            markItem.textContent = '⭐ 取消重点关注';
        }

        contextMenu.style.display = 'block';
        const menuRect = contextMenu.getBoundingClientRect();
        contextMenu.style.left = Math.min(x - modal.getBoundingClientRect().left, rect.width - menuRect.width - 10) + 'px';
        contextMenu.style.top = Math.min(y - modal.getBoundingClientRect().top, rect.height - menuRect.height - 10) + 'px';

        contextMenu.querySelectorAll('.menu-item').forEach(item => {
            item.onclick = () => {
                handleContextAction(item.dataset.action, node);
                contextMenu.style.display = 'none';
            };
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
                if (markedNodes.has(node.id)) {
                    markedNodes.delete(node.id);
                } else {
                    markedNodes.add(node.id);
                }
                rebuildScene();
                break;
            case 'collapse-children':
                collapsedNodes.add(node.id);
                rebuildScene();
                break;
            case 'expand-children':
                collapsedNodes.delete(node.id);
                rebuildScene();
                break;
        }
    }

    function highlightNode(node) {
        nodeMeshes.forEach(mesh => {
            const meshNode = mesh.userData.node;
            if (meshNode && meshNode.id === node.id) {
                mesh.material.emissive.setHex(0x58a6ff);
                mesh.material.emissiveIntensity = 0.4;
            }
        });
    }

    function clearSelection() {
        selectedNode = null;
        nodeMeshes.forEach(mesh => {
            const node = mesh.userData.node;
            if (node) {
                const color = node.isRoot ? CONFIG.NODE_COLORS.root : CONFIG.NODE_COLORS[node.type] || 0x808080;
                mesh.material.emissive.setHex(node.isRoot ? color : 0x000000);
                mesh.material.emissiveIntensity = node.isRoot ? 0.3 : 0;
            }
        });
        modal.querySelector('.selected-stats').style.display = 'none';
    }

    function toggleCollapse(nodeId) {
        if (collapsedNodes.has(nodeId)) {
            collapsedNodes.delete(nodeId);
        } else {
            collapsedNodes.add(nodeId);
        }
        rebuildScene();
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

    function updateSelectedNodeStats(node) {
        if (!node) return;
        modal.querySelector('.selected-stats').style.display = 'block';
        document.getElementById('selected-path').textContent = buildJsonPath(node);
        document.getElementById('selected-type').textContent = node.type;
        document.getElementById('selected-children').textContent = node.hasChildren ? node.childCount : 0;
    }

    function updateStats(json) {
        let maxDepth = 0;
        let totalNodes = 0;

        function traverse(obj, depth) {
            maxDepth = Math.max(maxDepth, depth);
            totalNodes++;
            const type = getValueType(obj);
            if (type === 'object' && obj !== null) Object.values(obj).forEach(v => traverse(v, depth + 1));
            else if (type === 'array') obj.forEach(v => traverse(v, depth + 1));
        }

        traverse(json, 0);
        document.getElementById('stat-nodes').textContent = totalNodes;
        document.getElementById('stat-depth').textContent = maxDepth;
        document.getElementById('pagination-info').textContent = `${totalNodes} 节点 · 3D 图谱模式`;
    }

    function applyTheme() {
        const colors = CONFIG.THEME_COLORS[currentTheme];
        if (scene) scene.background.setHex(colors.bg);

        const styleId = 'graph3d-modal-styles';
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }

        const fgHex = '#' + colors.fg.toString(16).padStart(6, '0');
        const fgDimHex = '#' + colors.fgDim.toString(16).padStart(6, '0');

        styleEl.textContent = `
            .graph-modal .modal-window { background: #${colors.bg.toString(16).padStart(6, '0')}; color: ${fgHex}; }
            .graph-modal .modal-header { background: #${(colors.bg === 0x0d1117 ? 0x161b22 : 0xf6f8fa).toString(16).padStart(6, '0')}; border-bottom: 1px solid #${colors.border.toString(16).padStart(6, '0')}; }
            .graph-modal .toolbar-btn { background: transparent; border: 1px solid #${colors.border.toString(16).padStart(6, '0')}; color: ${fgHex}; }
            .graph-modal .toolbar-btn:hover { background: rgba(78,201,176,0.15); border-color: #58a6ff; }
            .graph-modal .toolbar-btn.active { background: #${colors.selected.toString(16).padStart(6, '0')}; color: #${(colors.bg === 0x0d1117 ? '0d1117' : 'ffffff')}; }
            .graph-modal .modal-sidebar { background: #${(colors.bg === 0x0d1117 ? 0x161b22 : 0xf6f8fa).toString(16).padStart(6, '0')}; border-left: 1px solid #${colors.border.toString(16).padStart(6, '0')}; }
            .graph-modal .stat-label, .graph-modal .section-title { color: ${fgDimHex}; }
            .graph-modal .stat-value { color: ${fgHex}; }
            .graph-modal .zoom-btn, .graph-modal .zoom-display { background: transparent; border: 1px solid #${colors.border.toString(16).padStart(6, '0')}; color: ${fgHex}; }
            .graph3d-node-label { color: ${fgHex}; font-size: 11px; font-family: monospace; pointer-events: none; text-shadow: 0 1px 3px rgba(0,0,0,0.8); }
        `;
    }

    function showNotification(message) {
        const notif = document.createElement('div');
        notif.className = 'graph-notification';
        notif.textContent = message;
        modal.querySelector('.modal-graph-area').appendChild(notif);
        setTimeout(() => notif.remove(), 2000);
    }

    function addTab(id, title) {
        tabs.push({ id, title });
        renderTabs();
        return id;
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
            btn.addEventListener('click', e => {
                e.stopPropagation();
                closeTab(btn.dataset.closeTab);
            });
        });

        tabsContainer.querySelectorAll('.modal-tab').forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tabId));
        });
    }

    function switchTab(tabId) {
        if (activeTabId === tabId) return;
        const currentInstance = graphInstances.get(activeTabId);
        if (currentInstance) {
            currentInstance.collapsedNodes = new Set(collapsedNodes);
            currentInstance.markedNodes = new Set(markedNodes);
            currentInstance.selectedNode = selectedNode;
        }
        activeTabId = tabId;
        const newInstance = graphInstances.get(tabId);
        if (newInstance) {
            collapsedNodes = new Set(newInstance.collapsedNodes || []);
            markedNodes = new Set(newInstance.markedNodes || []);
            selectedNode = newInstance.selectedNode;
        }
        rebuildScene();
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
        }
        renderTabs();
    }

    function onWindowResize() {
        if (!camera || !renderer || !labelRenderer) return;
        const graphArea = modal.querySelector('.modal-graph-area');
        const width = graphArea.clientWidth;
        const height = graphArea.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        labelRenderer.setSize(width, height);
    }

    function closeModal() {
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                if (renderer) {
                    renderer.dispose();
                    modal.querySelector('.modal-graph-area').removeChild(renderer.domElement);
                }
                if (labelRenderer) {
                    modal.querySelector('.modal-graph-area').removeChild(labelRenderer.domElement);
                }
                modal.remove();
                modal = null;
                scene = null;
                camera = null;
                renderer = null;
                controls = null;
                nodeMeshes = [];
                linkLines = [];
                nodes = [];
                links = [];
                tabs = [];
                activeTabId = null;
                graphInstances.clear();
                document.removeEventListener('keydown', handleKeydown);
                window.removeEventListener('resize', onWindowResize);
            }, 300);
        }
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
        graphInstances.forEach(instance => {
            if (instance.collapsedNodes) instance.collapsedNodes.clear();
            if (instance.markedNodes) instance.markedNodes.clear();
        });
        collapsedNodes.clear();
        markedNodes.clear();
        console.log('[JsonGraph3D] Cache cleared');
    }

    function reset() {
        clearCache();
        selectedNode = null;
        if (scene) rebuildScene();
        console.log('[JsonGraph3D] Reset complete');
    }

    return {
        open,
        close,
        isOpen,
        clearCache,
        reset
    };
})();

// Expose to global window for non-module scripts
window.JsonGraph3D = JsonGraph3D;
