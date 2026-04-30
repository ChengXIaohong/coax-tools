/**
 * JSON Graph 3D - Three.js based 3D visualization
 * MIT License - Copyright (c) 2025 coax
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// Listen for module import errors
window.addEventListener('error', function(e) {
    if (e.message && (e.message.includes('Import') || e.message.includes('module') || e.message.includes('three'))) {
        console.error('[JsonGraph3D] Module/import error:', e.message, 'at', e.filename, ':', e.lineno);
    }
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('[JsonGraph3D] Unhandled rejection:', e.reason);
});

console.log('[JsonGraph3D] Module loaded, THREE:', typeof THREE, 'OrbitControls:', typeof OrbitControls, 'CSS2DRenderer:', typeof CSS2DRenderer);

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
        // Tree-aware layout params
        MAX_VISIBLE_NODES: 150,
        AUTO_COLLAPSE_THRESHOLD: 10,
        LAYER_ANGLE_SPAN: Math.PI * 2,  // 每个节点的子树在全部角度范围内展开
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

    // Instanced rendering pool - one InstancedMesh per node type
    let instancedMeshes = {};
    // Map nodeId -> instanceIndex for raycasting
    let nodeIdToInstance = {};

    // Breadcrumb navigation state
    let navigationStack = ['$'];  // ['$', '$.tasks', '$.tasks[0]']
    let rootJson = null;  // Original root JSON for navigation

    // Three.js objects
    let raycaster = null;
    let mouse = null;
    let _ignoreCollapsedNodes = false;  // Flag to ignore collapsed state during rebuild

    let layoutWorker = null;  // Web Worker for layout calculation

    // P1-OPTIMIZED: Label cache - one CSS2DObject per node type, clone on use
    const labelCache = new Map(); // type -> { div, label }

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

        // addChildren: uses PATH instead of nodeId for collapse state
        // parentPath format: $.address, $.hobbies[1], etc.
        function addChildren(parentId, parentPath, obj, depth, ancestorCollapsed) {
            const type = getValueType(obj);

            if (type === 'object' && obj !== null) {
                Object.entries(obj).forEach(([key, value]) => {
                    const childId = `node-${nodeId++}`;
                    const childPath = `${parentPath}.${key}`;
                    const childType = getValueType(value);
                    const hasChildren = childType === 'object' || childType === 'array';
                    // KEY FIX: check collapse state by PATH instead of nodeId
                    const isCollapsed = collapsedNodes.has(childPath);

                    nodes.push({
                        id: childId,
                        type: childType,
                        value: value,
                        key: key,
                        path: childPath,  // Store stable path on node
                        depth: depth + 1,
                        isRoot: false,
                        hasChildren: hasChildren,
                        childCount: hasChildren ? countChildren(value) : 0,
                        x: 0, y: 0, z: 0,
                        parentId: parentId
                    });

                    links.push({ source: parentId, target: childId });

                    if (hasChildren && !isCollapsed && !ancestorCollapsed) {
                        addChildren(childId, childPath, value, depth + 1, isCollapsed);
                    }
                });
            } else if (type === 'array') {
                obj.forEach((item, index) => {
                    const childId = `node-${nodeId++}`;
                    const childPath = `${parentPath}[${index}]`;
                    const childType = getValueType(item);
                    const hasChildren = childType === 'object' || childType === 'array';
                    // KEY FIX: check collapse state by PATH instead of nodeId
                    const isCollapsed = collapsedNodes.has(childPath);

                    nodes.push({
                        id: childId,
                        type: childType,
                        value: item,
                        key: index,
                        path: childPath,  // Store stable path on node
                        depth: depth + 1,
                        isRoot: false,
                        hasChildren: hasChildren,
                        childCount: hasChildren ? countChildren(item) : 0,
                        x: 0, y: 0, z: 0,
                        parentId: parentId
                    });

                    links.push({ source: parentId, target: childId });

                    if (hasChildren && !isCollapsed && !ancestorCollapsed) {
                        addChildren(childId, childPath, item, depth + 1, isCollapsed);
                    }
                });
            }
        }

        addChildren(rootId, '$', json, 0, false);
    }

    function applySphericalLayout() {
        // 构建 parent -> children 映射
        const parentChildrenMap = {};
        nodes.forEach(n => parentChildrenMap[n.id] = []);
        links.forEach(link => {
            const parentId = typeof link.source === 'object' ? link.source.id : link.source;
            const childId = typeof link.target === 'object' ? link.target.id : link.target;
            if (parentChildrenMap[parentId]) {
                parentChildrenMap[parentId].push(childId);
            }
        });

        const root = nodes.find(n => n.isRoot);
        if (!root) return;

        // 根节点在中心
        root.x = 0;
        root.y = 0;
        root.z = 0;

        // 递归布局：从根开始，每个节点将自己的角度范围分配给孩子
        const CHILD_ANGLE_SPREAD = Math.PI / 3; // 每个子树占 60° 范围
        const LAYER_Y_SPACING = 100; // 每层 y 方向间距

        function layoutSubtree(nodeId, startAngle, endAngle, depth) {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;

            const children = parentChildrenMap[nodeId] || [];
            const childNodes = children
                .map(cid => nodes.find(n => n.id === cid))
                .filter(Boolean);

            if (childNodes.length === 0) return;

            // 每个孩子分配的角度范围
            const totalAngle = endAngle - startAngle;
            const perChildAngle = totalAngle / childNodes.length;

            childNodes.forEach((child, idx) => {
                const childAngle = startAngle + idx * perChildAngle + perChildAngle / 2;
                const radius = CONFIG.SPHERE_LAYER_SPACING;

                // 位置：相对于父节点，沿子节点角度方向偏移
                child.x = node.x + radius * Math.cos(childAngle);
                child.y = depth * LAYER_Y_SPACING; // y 按深度分层
                child.z = node.z + radius * Math.sin(childAngle);

                // 递归布局子树
                const childStartAngle = childAngle - perChildAngle / 2;
                const childEndAngle = childAngle + perChildAngle / 2;
                layoutSubtree(child.id, childStartAngle, childEndAngle, depth + 1);
            });
        }

        // 从根节点开始布局
        layoutSubtree(root.id, -Math.PI, Math.PI, 1);
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
        camera.userData.zoom = 1;
    }

    function createRenderer() {
        const graphArea = modal.querySelector('.modal-graph-area');
        const width = graphArea.clientWidth || 800;
        const height = graphArea.clientHeight || 600;

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
        const childBonus = node.childCount * CONFIG.SIZE_INFLATION * 0.5;
        const decay = Math.pow(CONFIG.SIZE_DECAY, node.depth);
        const radius = Math.max(baseRadius * decay + childBonus, 6);

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

    // P0-OPTIMIZED: Build InstancedMesh pool by node type for batch rendering
    function buildInstancedMeshes() {
        // Dispose old instanced meshes
        Object.values(instancedMeshes).forEach(mesh => {
            scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        instancedMeshes = {};
        nodeIdToInstance = {};

        // Group nodes by type (exclude root which needs glow effect)
        const nodesByType = { root: [], string: [], number: [], boolean: [], object: [], array: [], null: [] };
        nodes.forEach(node => {
            const type = node.isRoot ? 'root' : node.type;
            if (!nodesByType[type]) nodesByType[type] = [];
            nodesByType[type].push(node);
        });

        // Create one InstancedMesh per type
        const nodeTypes = ['string', 'number', 'boolean', 'object', 'array', 'null'];
        nodeTypes.forEach(type => {
            const typeNodes = nodesByType[type];
            if (typeNodes.length === 0) return;

            // Use average radius for shared geometry (acceptable compromise)
            const avgRadius = CONFIG.NODE_RADIUS;
            const geometry = new THREE.SphereGeometry(avgRadius, 16, 16);
            const color = CONFIG.NODE_COLORS[type] || 0x808080;
            const material = new THREE.MeshPhongMaterial({
                color: color,
                emissive: 0x000000,
                emissiveIntensity: 0,
                shininess: 80
            });

            const instancedMesh = new THREE.InstancedMesh(geometry, material, typeNodes.length);
            const matrix = new THREE.Matrix4();
            const colorAttr = new THREE.Color();

            typeNodes.forEach((node, i) => {
                matrix.setPosition(node.x, node.y, node.z);
                instancedMesh.setMatrixAt(i, matrix);
                colorAttr.setHex(color);
                instancedMesh.setColorAt(i, colorAttr);
                nodeIdToInstance[node.id] = { mesh: instancedMesh, index: i };
            });

            instancedMesh.instanceMatrix.needsUpdate = true;
            if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
            scene.add(instancedMesh);
            instancedMeshes[type] = instancedMesh;

            // Add CSS2D labels on top (can't be instanced - must be per-node)
            typeNodes.forEach((node, i) => {
                const baseRadius = CONFIG.NODE_RADIUS;
                const childBonus = node.childCount * CONFIG.SIZE_INFLATION * 0.5;
                const decay = Math.pow(CONFIG.SIZE_DECAY, node.depth);
                const radius = Math.max(baseRadius * decay + childBonus, 6);
                const label = createNodeLabel(node, radius);
                // Position label in world space at node position
                label.position.set(node.x, node.y + radius + 12, node.z);
                scene.add(label);
            });
        });

        // Root node gets special treatment (glow effect + highlight)
        const rootNodes = nodesByType['root'];
        rootNodes.forEach(node => {
            const baseRadius = CONFIG.NODE_RADIUS;
            const radius = baseRadius;
            const color = CONFIG.NODE_COLORS.root;
            const geometry = new THREE.SphereGeometry(radius, 24, 24);
            const material = new THREE.MeshPhongMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.3,
                shininess: 80
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(node.x, node.y, node.z);
            mesh.userData = { nodeId: node.id, node: node };
            // Glow sphere
            const glowGeometry = new THREE.SphereGeometry(radius * 1.8, 24, 24);
            const glowMaterial = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.15 });
            mesh.add(new THREE.Mesh(glowGeometry, glowMaterial));
            const label = createNodeLabel(node, radius);
            mesh.add(label);
            scene.add(mesh);
            nodeMeshes.push(mesh);
        });
    }

    // P0-OPTIMIZED: Build single LineSegments for all links
    let allLinksLine = null;
    function buildAllLinksLine() {
        if (allLinksLine) {
            scene.remove(allLinksLine);
            allLinksLine.geometry.dispose();
            allLinksLine.material.dispose();
            allLinksLine = null;
        }
        if (links.length === 0) return;

        const positions = new Float32Array(links.length * 6);
        links.forEach((link, i) => {
            const source = nodes.find(n => n.id === (link.source.id || link.source));
            const target = nodes.find(n => n.id === (link.target.id || link.target));
            if (source && target) {
                positions[i * 6 + 0] = source.x;
                positions[i * 6 + 1] = source.y;
                positions[i * 6 + 2] = source.z;
                positions[i * 6 + 3] = target.x;
                positions[i * 6 + 4] = target.y;
                positions[i * 6 + 5] = target.z;
            }
        });

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.LineBasicMaterial({
            color: CONFIG.THEME_COLORS[currentTheme].fg,
            transparent: true,
            opacity: 0.6
        });
        allLinksLine = new THREE.LineSegments(geometry, material);
        scene.add(allLinksLine);
    }

    function createNodeLabel(node, radius) {
        const type = node.isRoot ? 'root' : node.type;
        if (!labelCache.has(type)) {
            // Create once per type
            const labelDiv = document.createElement('div');
            labelDiv.className = 'graph3d-node-label';
            labelDiv.style.color = '#' + CONFIG.THEME_COLORS[currentTheme].fg.toString(16).padStart(6, '0');
            labelDiv.style.background = 'rgba(13, 17, 23, 0.75)';
            labelDiv.style.backdropFilter = 'blur(4px)';
            const label = new CSS2DObject(labelDiv);
            label.userData = { isLabel: true };
            labelCache.set(type, { div: labelDiv, label });
        }
        const cached = labelCache.get(type);
        // Update text
        let labelText;
        if (node.isRoot) {
            labelText = 'root';
        } else if (typeof node.key === 'number') {
            if (!node.hasChildren && node.value !== undefined && node.value !== null) {
                const v = String(node.value);
                labelText = v.length > 8 ? v.slice(0, 6) + '..' : v;
            } else {
                labelText = `[${node.key}]`;
            }
        } else {
            labelText = String(node.key);
        }
        cached.div.textContent = labelText.length > 8 ? labelText.slice(0, 6) + '..' : labelText;
        // Clone because CSS2DObject can't have multiple parents
        const newLabel = cached.label.clone();
        newLabel.position.set(0, radius + 12, 0);
        return newLabel;
    }

    function createLinkLine(sourceNode, targetNode) {
        const points = [
            new THREE.Vector3(sourceNode.x, sourceNode.y, sourceNode.z),
            new THREE.Vector3(targetNode.x, targetNode.y, targetNode.z)
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: CONFIG.NODE_COLORS[targetNode.type] || CONFIG.THEME_COLORS[currentTheme].fg,
            transparent: true,
            opacity: 0.6
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

    function autoCollapse() {
        if (nodes.length <= CONFIG.MAX_VISIBLE_NODES) {
            return;
        }

        // Find candidates: nodes with many children, not already collapsed
        // Sort by childCount descending - collapse biggest subtrees first
        // KEY FIX: use node.path instead of node.id
        const candidates = nodes
            .filter(n => n.childCount > CONFIG.AUTO_COLLAPSE_THRESHOLD && !collapsedNodes.has(n.path))
            .sort((a, b) => b.childCount - a.childCount);

        // Collapse until under limit (use 90% of MAX as target)
        const target = Math.floor(CONFIG.MAX_VISIBLE_NODES * 0.9);
        for (const node of candidates) {
            if (nodes.length <= target) break;
            collapsedNodes.add(node.path);
        }

        // Save auto-collapsed state to instance before recursive rebuildScene
        const instance = graphInstances.get(activeTabId);
        if (instance) {
            instance.collapsedNodes = new Set(collapsedNodes);
        }

        // Trigger proper rebuildScene cycle to handle disposal correctly
        _autoCollapsing = true;
        rebuildScene();
        _autoCollapsing = false;
    }

    function rebuildScene() {
        // P0-OPTIMIZED: Dispose instanced meshes and allLinksLine (not individual nodeMeshes/linkLines)
        if (!_autoCollapsing) {
            // Dispose instanced meshes
            Object.values(instancedMeshes).forEach(mesh => {
                scene.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
            });
            instancedMeshes = {};
            // Dispose allLinksLine
            if (allLinksLine) {
                scene.remove(allLinksLine);
                allLinksLine.geometry.dispose();
                allLinksLine.material.dispose();
                allLinksLine = null;
            }
            // Dispose root node meshes (non-instanced)
            nodeMeshes.forEach(mesh => {
                while (mesh.children.length > 0) {
                    const child = mesh.children[0];
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                    mesh.remove(child);
                }
                scene.remove(mesh);
                mesh.geometry.dispose();
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    mesh.material.dispose();
                }
            });
            // Remove CSS2D labels from scene (they're added to scene directly in buildInstancedMeshes)
            scene.children.filter(c => c.isCSS2DObject).forEach(label => {
                scene.remove(label);
            });
        }
        nodeMeshes = [];
        linkLines = [];

        // CRITICAL: Clean up stale collapsedNode IDs BEFORE buildGraph
        // At this point, 'nodes' still has the OLD valid IDs from previous render
        // Restore per-instance collapsed state
        const instance = graphInstances.get(activeTabId);
        if (instance) {
            collapsedNodes = new Set(instance.collapsedNodes || []);
        }

        // Now clear nodes/links before buildGraph creates new IDs
        nodes = [];
        links = [];

        buildGraph(graphInstances.get(activeTabId)?.json || {});

        // Auto-collapse if over limit and this is first render (no prior collapsed state)
        if (!_autoCollapsing && collapsedNodes.size === 0 && nodes.length > CONFIG.MAX_VISIBLE_NODES) {
            autoCollapse();
            return;  // autoCollapse triggers rebuildScene recursively with proper state
        }

        startLayout();
    }

    function startLayout() {
        console.log('[JsonGraph3D] [startLayout] layoutWorker:', !!layoutWorker, 'nodes:', nodes.length);
        if (layoutWorker) {
            // Worker mode - async, results come via onmessage
            layoutWorker.postMessage({
                nodes: nodes,
                links: links,
                config: { SPHERE_LAYER_SPACING: CONFIG.SPHERE_LAYER_SPACING }
            });
            console.log('[JsonGraph3D] [startLayout] Worker message sent, waiting for response...');
        } else {
            // Fallback: synchronous layout (worker failed to load)
            console.log('[JsonGraph3D] [startLayout] FALLBACK to sync layout, calling applySphericalLayout...');
            applySphericalLayout();
            console.log('[JsonGraph3D] [startLayout] applySphericalLayout done, building meshes...');
            buildInstancedMeshes();
            buildAllLinksLine();
            console.log('[JsonGraph3D] [startLayout] FALLBACK complete, instancedMeshes types:', Object.keys(instancedMeshes).join(','));
        }
    }

    function createModal(jsonData) {
        console.log('[JsonGraph3D] createModal called, json keys:', jsonData ? Object.keys(jsonData) : 'null');
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
                        <button class="toolbar-btn" data-action="view-top" title="俯视">↑</button>
                        <button class="toolbar-btn" data-action="view-bottom" title="仰视">↓</button>
                        <button class="toolbar-btn" data-action="view-side" title="侧视">→</button>
                        <button class="toolbar-btn" data-action="view-isometric" title="等距视图">◇</button>
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
                    <div class="breadcrumb-nav" id="breadcrumb-nav">
                        <button class="breadcrumb-btn" data-action="breadcrumb-root" title="返回根节点">🏠</button>
                        <button class="breadcrumb-btn" data-action="breadcrumb-back" title="返回上级">←</button>
                        <span class="breadcrumb-trail" id="breadcrumb-trail">$</span>
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

        // Initialize breadcrumb navigation with root JSON
        rootJson = jsonData;
        navigationStack = ['$'];

        setupModalEvents();
        // Show modal first so graphArea gets computed dimensions
        setTimeout(() => modal.classList.add('active'), 10);
        // Then init Three.js after layout is computed
        setTimeout(() => {
            initThreeJS();
            rebuildScene();
            updateStats(jsonData);
            applyTheme();
        }, 50);
    }

    function initThreeJS() {
        console.log('[JsonGraph3D] initThreeJS start');
        createScene();
        console.log('[JsonGraph3D] scene created, scene:', !!scene);
        createCamera();
        createRenderer();
        console.log('[JsonGraph3D] renderer created, renderer:', !!renderer);
        createLights();
        createControls();
        console.log('[JsonGraph3D] controls created, controls:', !!controls);
        setupRaycaster();
        
        // Initialize layout worker (fallback to sync if Worker fails)
        try {
            layoutWorker = new Worker('js/layout.worker.js');
            layoutWorker.onmessage = function(e) {
                const { positions } = e.data;
                // Apply positions to nodes
                positions.forEach((pos, nodeId) => {
                    const node = nodes.find(n => n.id === nodeId);
                    if (node) {
                        node.x = pos.x;
                        node.y = pos.y;
                        node.z = pos.z;
                    }
                });
                // Build meshes after layout is applied
                buildInstancedMeshes();
                buildAllLinksLine();
            };
            layoutWorker.onerror = function(e) {
                console.error('[JsonGraph3D] Worker error:', e);
                layoutWorker = null;
                // Fallback to sync layout
                applySphericalLayout();
                buildInstancedMeshes();
                buildAllLinksLine();
            };
        } catch (e) {
            console.warn('[JsonGraph3D] Worker init failed, using sync layout:', e);
            layoutWorker = null;
        }
        
        animate();
        console.log('[JsonGraph3D] initThreeJS complete');
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

    let _autoCollapsing = false;
    let _animateRan = false;
    function _ensureAnimateRuns() {
        if (!_animateRan) {
            console.log('[JsonGraph3D] First animate tick');
            _animateRan = true;
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

        modal.querySelectorAll('.breadcrumb-btn').forEach(btn => {
            btn.addEventListener('click', () => handleBreadcrumbAction(btn.dataset.action));
        });

        modal.querySelector('.sidebar-toggle').addEventListener('click', () => {
            modal.querySelector('.modal-sidebar').classList.toggle('collapsed');
        });

        const graphArea = modal.querySelector('.modal-graph-area');
        graphArea.addEventListener('click', onGraphClick);
        graphArea.addEventListener('dblclick', onGraphDblClick);
        graphArea.addEventListener('contextmenu', onGraphContextMenu);

        window.addEventListener('resize', onWindowResize);
        document.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('keydown', handleKeydown);
    }

    function handleKeydown(e) {
        if (!modal) return;
        if (e.key === 'Escape') closeModal();
    }

    function animateCameraTo(targetX, targetY, targetZ, lookX, lookY, lookZ) {
        const startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
        const startTarget = { x: controls.target.x, y: controls.target.y, z: controls.target.z };
        const endPos = { x: targetX, y: targetY, z: targetZ };
        const endTarget = { x: lookX, y: lookY, z: lookZ };
        
        let frame = 0;
        const maxFrames = 15;
        
        function step() {
            frame++;
            const t = frame / maxFrames;
            const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
            
            camera.position.x = startPos.x + (endPos.x - startPos.x) * ease;
            camera.position.y = startPos.y + (endPos.y - startPos.y) * ease;
            camera.position.z = startPos.z + (endPos.z - startPos.z) * ease;
            
            controls.target.x = startTarget.x + (endTarget.x - startTarget.x) * ease;
            controls.target.y = startTarget.y + (endTarget.y - startTarget.y) * ease;
            controls.target.z = startTarget.z + (endTarget.z - startTarget.z) * ease;
            
            controls.update();
            
            if (frame < maxFrames) {
                requestAnimationFrame(step);
            }
        }
        
        requestAnimationFrame(step);
    }

    function handleToolbarAction(action) {
        switch (action) {
            case 'view-top':
                animateCameraTo(0, 800, 0, 0, 0, 0);
                break;
            case 'view-bottom':
                animateCameraTo(0, -800, 0, 0, 0, 0);
                break;
            case 'view-side':
                animateCameraTo(800, 200, 0, 0, 0, 0);
                break;
            case 'view-isometric':
                animateCameraTo(500, 400, 500, 0, 0, 0);
                break;
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

    function handleBreadcrumbAction(action) {
        switch (action) {
            case 'breadcrumb-root':
                navigateToRoot();
                break;
            case 'breadcrumb-back':
                navigateBack();
                break;
        }
    }

    // Navigate to root and rebuild scene
    function navigateToRoot() {
        navigationStack = ['$'];
        collapsedNodes.clear();
        rebuildSceneForPath('$');
        updateBreadcrumbDisplay();
    }

    // Navigate back one level
    function navigateBack() {
        if (navigationStack.length <= 1) return;
        navigationStack.pop();
        collapsedNodes.clear();
        rebuildSceneForPath(navigationStack[navigationStack.length - 1]);
        updateBreadcrumbDisplay();
    }

    // Navigate to a specific path
    function navigateTo(path) {
        if (!navigationStack.includes(path)) {
            navigationStack.push(path);
        }
        collapsedNodes.clear();
        rebuildSceneForPath(path);
        updateBreadcrumbDisplay();
    }

    // Rebuild scene using a specific path as root
    function rebuildSceneForPath(path) {
        if (!rootJson) return;

        // Get the sub-json at this path
        const targetJson = getValueAtPath(rootJson, path);
        if (!targetJson) return;

        // Clear current scene meshes, links, instanced meshes, and allLinksLine
        nodeMeshes.forEach(mesh => {
            while (mesh.children.length > 0) {
                const child = mesh.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                mesh.remove(child);
            }
            scene.remove(mesh);
            mesh.geometry.dispose();
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(m => m.dispose());
            } else {
                mesh.material.dispose();
            }
        });
        // Clear instanced meshes
        Object.values(instancedMeshes).forEach(mesh => {
            scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        instancedMeshes = {};
        // Clear allLinksLine
        if (allLinksLine) {
            scene.remove(allLinksLine);
            allLinksLine.geometry.dispose();
            allLinksLine.material.dispose();
            allLinksLine = null;
        }
        // Clear CSS2D labels
        scene.children.filter(c => c.isCSS2DObject).forEach(label => scene.remove(label));
        linkLines.forEach(line => {
            scene.remove(line);
            line.geometry.dispose();
            line.material.dispose();
        });
        nodeMeshes = [];
        linkLines = [];

        // Reset camera for new context
        resetCamera();

        // Build graph from the target sub-json
        nodes = [];
        links = [];
        let nodeId = 0;
        const rootId = `node-${nodeId++}`;

        nodes.push({
            id: rootId,
            type: getValueType(targetJson),
            value: targetJson,
            key: path.split('.').pop() || 'root',
            path: path,
            depth: 0,
            isRoot: true,
            childCount: countChildren(targetJson),
            x: 0, y: 0, z: 0
        });

        function addChildren(parentId, parentPath, obj, depth, ancestorCollapsed) {
            const type = getValueType(obj);

            if (type === 'object' && obj !== null) {
                Object.entries(obj).forEach(([key, value]) => {
                    const childId = `node-${nodeId++}`;
                    const childPath = `${parentPath}.${key}`;
                    const childType = getValueType(value);
                    const hasChildren = childType === 'object' || childType === 'array';
                    const isCollapsed = collapsedNodes.has(childPath);

                    nodes.push({
                        id: childId,
                        type: childType,
                        value: value,
                        key: key,
                        path: childPath,
                        depth: depth + 1,
                        isRoot: false,
                        hasChildren: hasChildren,
                        childCount: hasChildren ? countChildren(value) : 0,
                        x: 0, y: 0, z: 0,
                        parentId: parentId
                    });

                    links.push({ source: parentId, target: childId });

                    if (hasChildren && !isCollapsed && !ancestorCollapsed) {
                        addChildren(childId, childPath, value, depth + 1, isCollapsed);
                    }
                });
            } else if (type === 'array') {
                obj.forEach((item, index) => {
                    const childId = `node-${nodeId++}`;
                    const childPath = `${parentPath}[${index}]`;
                    const childType = getValueType(item);
                    const hasChildren = childType === 'object' || childType === 'array';
                    const isCollapsed = collapsedNodes.has(childPath);

                    nodes.push({
                        id: childId,
                        type: childType,
                        value: item,
                        key: index,
                        path: childPath,
                        depth: depth + 1,
                        isRoot: false,
                        hasChildren: hasChildren,
                        childCount: hasChildren ? countChildren(item) : 0,
                        x: 0, y: 0, z: 0,
                        parentId: parentId
                    });

                    links.push({ source: parentId, target: childId });

                    if (hasChildren && !isCollapsed && !ancestorCollapsed) {
                        addChildren(childId, childPath, item, depth + 1, isCollapsed);
                    }
                });
            }
        }

        addChildren(rootId, path, targetJson, 0, false);

        // Use startLayout to trigger async (Worker) or sync rendering path
        startLayout();

        updateStats(targetJson);
    }

    // Get value at JSON path
    function getValueAtPath(json, path) {
        if (path === '$' || path === '$root') return json;

        const parts = path.replace(/^\$\.?/, '').split(/\.|\[/).filter(Boolean);
        let current = json;

        for (const part of parts) {
            const key = part.replace(/\]/g, '');
            if (current === null || current === undefined) return undefined;
            current = current[key];
        }

        return current;
    }

    // Update breadcrumb display
    function updateBreadcrumbDisplay() {
        const trail = modal?.querySelector('#breadcrumb-trail');
        if (!trail) return;

        trail.innerHTML = navigationStack.map((path, idx) => {
            const label = path === '$' ? '$' : path.split('.').pop().replace(/\[(\d+)\]/g, '[$1]');
            const isLast = idx === navigationStack.length - 1;
            return `<span class="breadcrumb-item ${isLast ? 'active' : ''}" data-path="${path}">${label}</span>`;
        }).join('<span class="breadcrumb-sep"> › </span>');

        // Add click handlers to breadcrumb items
        trail.querySelectorAll('.breadcrumb-item:not(.active)').forEach(item => {
            item.addEventListener('click', () => {
                const path = item.dataset.path;
                // Truncate stack to this point
                const idx = navigationStack.indexOf(path);
                if (idx >= 0) {
                    navigationStack = navigationStack.slice(0, idx + 1);
                    collapsedNodes.clear();
                    rebuildSceneForPath(path);
                    updateBreadcrumbDisplay();
                }
            });
        });
    }

    function handleZoomAction(action) {
        const factor = action === 'zoom-in' ? 1.2 : 0.8;
        const newZoom = Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, (camera.userData.zoom || 1) * factor));
        camera.userData.zoom = newZoom;

        // Move camera along the direction from target to camera (away/toward target)
        const direction = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
        const currentDistance = camera.position.distanceTo(controls.target);
        const newDistance = currentDistance / factor;
        camera.position.copy(controls.target).addScaledVector(direction, newDistance);

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

    // P0-OPTIMIZED: Raycasting helper for InstancedMesh
    function getRaycastTargets() {
        const targets = [...nodeMeshes]; // Root node meshes (non-instanced)
        Object.values(instancedMeshes).forEach(mesh => targets.push(mesh));
        return targets;
    }

    function findNodeFromIntersect(intersect) {
        const mesh = intersect.object;
        // Root node mesh (non-instanced) - has userData.node
        if (mesh.userData && mesh.userData.node) {
            return mesh.userData.node;
        }
        // InstancedMesh hit - look up via instanceId
        if (mesh.isInstancedMesh && intersect.instanceId !== undefined) {
            const entry = Object.entries(nodeIdToInstance).find(([id, info]) =>
                info.mesh === mesh && info.index === intersect.instanceId
            );
            if (entry) {
                const nodeId = entry[0];
                return nodes.find(n => n.id === nodeId);
            }
        }
        return null;
    }

    function onGraphClick(e) {
        const graphArea = modal.querySelector('.modal-graph-area');
        const rect = graphArea.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(getRaycastTargets(), false);

        if (intersects.length > 0) {
            const node = findNodeFromIntersect(intersects[0]);
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
        const intersects = raycaster.intersectObjects(getRaycastTargets(), false);

        if (intersects.length > 0) {
            const node = findNodeFromIntersect(intersects[0]);
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
        const targets = getRaycastTargets();
        console.log('[JsonGraph3D] [CONTEXT-MENU] targets:', targets.length, '| instancedMeshes:', Object.keys(instancedMeshes).join(',') || 'none', '| nodeMeshes:', nodeMeshes.length);
        const intersects = raycaster.intersectObjects(targets, false);
        console.log('[JsonGraph3D] [CONTEXT-MENU] intersects:', intersects.length);

        if (intersects.length > 0) {
            const node = findNodeFromIntersect(intersects[0]);
            console.log('[JsonGraph3D] [CONTEXT-MENU] node found:', node ? `${node.id} (${node.key})` : 'NULL');
            selectedNode = node;
            showContextMenu(e.clientX, e.clientY, node);
        }
    }

    function showContextMenu(x, y, node) {
        if (!node) return;  // Guard: no node under click
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
            <div class="menu-divider"></div>
            <div class="menu-item" data-action="open-subgraph">🔍 查看下级图谱</div>
        `;

        const markItem = contextMenu.querySelector('[data-action="mark-important"]');
        if (markedNodes.has(node.id)) {
            markItem.textContent = '⭐ 取消重点关注';
        }

        contextMenu.style.display = 'block';
        const graphAreaRect = modal.querySelector('.modal-graph-area').getBoundingClientRect();
        const menuRect = contextMenu.getBoundingClientRect();
        contextMenu.style.left = Math.min(x - graphAreaRect.left, graphAreaRect.width - menuRect.width - 10) + 'px';
        contextMenu.style.top = Math.min(y - graphAreaRect.top, graphAreaRect.height - menuRect.height - 10) + 'px';

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
                collapsedNodes.add(node.path);
                saveAndRebuild();
                break;
            case 'expand-children':
                collapsedNodes.delete(node.path);
                saveAndRebuild();
                break;
            case 'open-subgraph':
                // Navigate to the selected node's path as new root
                if (node.hasChildren && (node.type === 'object' || node.type === 'array')) {
                    navigateTo(node.path);
                    showNotification('已切换到: ' + node.path);
                } else {
                    showNotification('该节点无下级数据');
                }
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

    // Helper: save collapsed state to instance, then rebuild
    function saveAndRebuild() {
        const instance = graphInstances.get(activeTabId);
        if (instance) {
            instance.collapsedNodes = new Set(collapsedNodes);
        }
        rebuildScene();
    }

    function toggleCollapse(nodeId) {
        // Find the node to get its path
        const node = nodes.find(n => n.id === nodeId);
        if (!node) {
            return;
        }

        const nodePath = node.path;
        if (collapsedNodes.has(nodePath)) {
            collapsedNodes.delete(nodePath);
        } else {
            collapsedNodes.add(nodePath);
        }

        // Save to instance before rebuildScene restores from instance
        const instance = graphInstances.get(activeTabId);
        if (instance) {
            instance.collapsedNodes = new Set(collapsedNodes);
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
        if (collapsedNodes.size > 0) {
            document.getElementById('pagination-info').textContent =
                `${totalNodes} 节点 · ${collapsedNodes.size} 已折叠 · 3D 图谱模式`;
        } else {
            document.getElementById('pagination-info').textContent =
                `${totalNodes} 节点 · 3D 图谱模式`;
        }
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
        const width = graphArea.clientWidth || 800;
        const height = graphArea.clientHeight || 600;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        labelRenderer.setSize(width, height);
    }

    function onFullscreenChange() {
        // Delay to let fullscreen transition complete
        setTimeout(() => {
            onWindowResize();
        }, 100);
    }

    function closeModal() {
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                // Clear contextMenu orphan
                if (contextMenu) {
                    contextMenu.remove();
                    contextMenu = null;
                }
                // Clear instanced meshes
                Object.values(instancedMeshes).forEach(mesh => {
                    scene.remove(mesh);
                    mesh.geometry.dispose();
                    mesh.material.dispose();
                });
                instancedMeshes = {};
                // Clear allLinksLine
                if (allLinksLine) {
                    scene.remove(allLinksLine);
                    allLinksLine.geometry.dispose();
                    allLinksLine.material.dispose();
                    allLinksLine = null;
                }
                // Clear CSS2D labels
                if (scene) {
                    scene.children.filter(c => c.isCSS2DObject).forEach(label => scene.remove(label));
                }
                // Terminate layout worker
                if (layoutWorker) {
                    layoutWorker.terminate();
                    layoutWorker = null;
                }
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
                nodeIdToInstance = {};
                labelCache.clear();
                navigationStack = ['$'];
                rootJson = null;
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
console.log('[JsonGraph3D] Exposed to window, is function:', typeof window.JsonGraph3D);
