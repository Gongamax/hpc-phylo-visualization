// Tree utility functions

// Given nodes + MST links, build a rooted tree (parent + children + depth)
export function buildTreeFromMST(nodes, mstLinks, rootId) {
  const adj = new Map();
  for (const n of nodes) adj.set(n.id, []);
  for (const l of mstLinks) {
    adj.get(l.source).push(l.target);
    adj.get(l.target).push(l.source);
  }

  const parent = new Map();
  const depth = new Map();
  const children = new Map();
  for (const n of nodes) children.set(n.id, []);

  const q = [rootId];
  parent.set(rootId, null);
  depth.set(rootId, 0);

  while (q.length) {
    const v = q.shift();
    for (const w of adj.get(v)) {
      if (w === parent.get(v)) continue;
      parent.set(w, v);
      depth.set(w, (depth.get(v) || 0) + 1);
      children.get(v).push(w);
      q.push(w);
    }
  }

  // attach parent/children/depth to node objects
  const outNodes = nodes.map((n) => ({
    ...n,
    parent: parent.get(n.id),
    children: children.get(n.id),
    _depth: depth.get(n.id),
  }));
  const outLinks = mstLinks.map((l) => ({ ...l }));
  return { nodes: outNodes, links: outLinks };
}

// Build the display graph from the tree and a set of collapsed node ids.
// We traverse from root and only include a node if none of its ancestors is collapsed.
export function buildDisplayGraph(tree, collapsedSet) {
  const root = tree.nodes[0].id; // Assume first node is the root
  const included = new Set();
  const q = [root];

  while (q.length) {
    const v = q.shift();
    included.add(v);
    if (collapsedSet.has(v)) continue; // do not traverse children
    const node = tree.nodes.find((n) => n.id === v);
    for (const c of node.children || []) q.push(c);
  }

  const nodes = tree.nodes.filter((n) => included.has(n.id));
  const links = tree.links.filter(
    (l) => included.has(l.source) && included.has(l.target)
  );
  return { nodes, links };
}

// Utility function to create colors for pie segments
export function colorForIndex(i) {
  const palette = ["#ef476f", "#ffd166", "#06d6a0", "#118ab2", "#073b4c"];
  return palette[i % palette.length];
}
