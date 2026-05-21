/**
 * Graph Builder Worker
 * Recursive JSON tree traversal offloaded from main thread.
 * MIT License - Copyright (c) 2025 coax
 */

self.onmessage = function(e) {
    const { json, collapsedNodes, is3D } = e.data;
    const collapsedSet = new Set(collapsedNodes || []);
    const result = buildGraph(json, collapsedSet, is3D);
    self.postMessage(result);
};

function buildGraph(json, collapsedNodes, is3D) {
    const nodes = [];
    const links = [];
    const stats = { totalNodes: 0, maxDepth: 0, typeCount: { string: 0, number: 0, boolean: 0, object: 0, array: 0, null: 0 } };

    let nodeId = 0;

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

    function addStats(node) {
        stats.totalNodes++;
        stats.maxDepth = Math.max(stats.maxDepth, node.depth);
        stats.typeCount[node.type]++;
    }

    const rootId = 'node-' + (nodeId++);
    const rootType = getValueType(json);
    const rootNode = {
        id: rootId, type: rootType, key: 'root',
        depth: 0, isRoot: true, childCount: countChildren(json),
        path: '$', x: 0, y: 0
    };
    if (is3D) rootNode.z = 0;
    nodes.push(rootNode);
    addStats(rootNode);

    function addChildren(parentId, parentPath, obj, depth, ancestorCollapsed) {
        const type = getValueType(obj);

        if (type === 'object' && obj !== null) {
            const entries = Object.entries(obj);
            for (let i = 0; i < entries.length; i++) {
                const [key, value] = entries[i];
                const childId = 'node-' + (nodeId++);
                const childPath = parentPath + '.' + key;
                const childType = getValueType(value);
                const hasChildren = childType === 'object' || childType === 'array';
                const isCollapsed = collapsedNodes.has(is3D ? childPath : childId);

                const childNode = {
                    id: childId, type: childType, key: key,
                    path: childPath, depth: depth + 1,
                    isRoot: false, hasChildren: hasChildren,
                    childCount: hasChildren ? countChildren(value) : 0,
                    parentId: parentId, x: 0, y: 0
                };
                if (is3D) childNode.z = 0;
                if (!hasChildren) childNode.value = value;

                nodes.push(childNode);
                addStats(childNode);
                links.push({ source: parentId, target: childId });

                if (hasChildren && !isCollapsed && !ancestorCollapsed) {
                    addChildren(childId, childPath, value, depth + 1, isCollapsed);
                }
            }
        } else if (type === 'array') {
            for (let i = 0; i < obj.length; i++) {
                const item = obj[i];
                const childId = 'node-' + (nodeId++);
                const childPath = parentPath + '[' + i + ']';
                const childType = getValueType(item);
                const hasChildren = childType === 'object' || childType === 'array';
                const isCollapsed = collapsedNodes.has(is3D ? childPath : childId);

                const childNode = {
                    id: childId, type: childType, key: i,
                    path: childPath, depth: depth + 1,
                    isRoot: false, hasChildren: hasChildren,
                    childCount: hasChildren ? countChildren(item) : 0,
                    parentId: parentId, x: 0, y: 0
                };
                if (is3D) childNode.z = 0;
                if (!hasChildren) childNode.value = item;

                nodes.push(childNode);
                addStats(childNode);
                links.push({ source: parentId, target: childId });

                if (hasChildren && !isCollapsed && !ancestorCollapsed) {
                    addChildren(childId, childPath, item, depth + 1, isCollapsed);
                }
            }
        }
    }

    addChildren(rootId, '$', json, 0, false);

    return { nodes, links, stats };
}