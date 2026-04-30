/**
 * Layout Worker - Spherical tree layout calculation
 * Offloaded from main thread to avoid UI blocking
 */

self.onmessage = function(e) {
    const { nodes, links, config } = e.data;
    
    // Run layout calculation
    const positions = calculateSphericalLayout(nodes, links, config);
    
    // Convert Map to plain object for structured clone
    const positionsObj = Object.fromEntries(positions);
    self.postMessage({ positions: positionsObj });
};

function calculateSphericalLayout(nodes, links, config) {
    const SPHERE_LAYER_SPACING = config?.SPHERE_LAYER_SPACING || 120;
    const LAYER_Y_SPACING = 100;
    
    const positions = new Map();
    
    // Build parent -> children mapping
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
    if (!root) return positions;

    // Root at center
    positions.set(root.id, { x: 0, y: 0, z: 0 });

    const CHILD_ANGLE_SPREAD = Math.PI / 3; // 60 degrees per subtree

    function layoutSubtree(nodeId, startAngle, endAngle, depth) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const children = parentChildrenMap[nodeId] || [];
        const childNodes = children
            .map(cid => nodes.find(n => n.id === cid))
            .filter(Boolean);

        if (childNodes.length === 0) return;

        const totalAngle = endAngle - startAngle;
        const perChildAngle = totalAngle / childNodes.length;

        childNodes.forEach((child, idx) => {
            const childAngle = startAngle + idx * perChildAngle + perChildAngle / 2;
            const radius = SPHERE_LAYER_SPACING;

            positions.set(child.id, {
                x: node.x + radius * Math.cos(childAngle),
                y: depth * LAYER_Y_SPACING,
                z: node.z + radius * Math.sin(childAngle)
            });

            const childStartAngle = childAngle - perChildAngle / 2;
            const childEndAngle = childAngle + perChildAngle / 2;
            layoutSubtree(child.id, childStartAngle, childEndAngle, depth + 1);
        });
    }

    layoutSubtree(root.id, -Math.PI, Math.PI, 1);
    
    return positions;
}
