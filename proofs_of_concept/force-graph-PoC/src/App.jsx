/*
Force-Graph PoC (single-file React app)

Goals of this demo (POC):
- provide a minimal, runnable demo that shows:
  * force-directed layout (d3-force via react-force-graph-2d)
  * compute + display a Minimum Spanning Tree (MST) extracted from the graph
  * node size proportional to a node metric
  * pie-charts drawn inside nodes (ancillary information)
  * expand / collapse of subtrees (on the MST)
- keep the code compact and heavily commented so you can read and understand every step.

How to run (short):
1) create a new React app (Vite or CRA). I recommend Vite:
   npm create vite@latest force-graph-demo -- --template react
   cd force-graph-demo
2) install dependencies:
   npm i react-force-graph-2d
3) replace src/App.jsx with this file and run
   npm install
   npm run dev

Notes about choices:
- I used react-force-graph-2d (canvas-based) for this PoC because it gives quick control over custom node rendering (canvas), supports force-directed layout using d3-force under the hood and has easy pan/zoom/interaction handling. It's easier for pies & labels than wiring everything manually with deck.gl for a quick PoC.
- For a real 500k-node deployment we need more advanced strategies (multilevel coarsening, Barnes-Hut or GPU force solvers, server-side precomputation) — I document those ideas after the demo code in the chat.

---
*/

import React, { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";

export default function App() {
  const fgRef = useRef();

  // PARAMETERS for the demo
  const NODE_COUNT = 3000;
  const EXTRA_EDGES = Math.floor(NODE_COUNT * 0.5);

  // Full graph (original). We'll generate a random "seed" tree and then add extra edges.
  const fullGraph = useMemo(
    () => generateGraph(NODE_COUNT, EXTRA_EDGES),
    [NODE_COUNT, EXTRA_EDGES]
  );

  // UI state
  const [showMST, setShowMST] = useState(false);
  const [displayGraph, setDisplayGraph] = useState(() => ({
    nodes: [],
    links: [],
  }));
  const [mstLinks, setMstLinks] = useState(null);
  const [collapsedSet, setCollapsedSet] = useState(new Set());
  const [info, setInfo] = useState("Ready.");

  // Build MST after initial layout has placed nodes (we'll compute MST using current node positions)
  const computeAndShowMST = () => {
    setInfo("Computing MST (using current node positions as weights).");
    const data = fullGraph; // use full graph edges (tree + extra)

    // ensure nodes have positions: if simulation didn't run yet, we warn
    const anyNode = data.nodes[0];
    if (
      anyNode &&
      (typeof anyNode.x === "undefined" || typeof anyNode.y === "undefined")
    ) {
      setInfo(
        "Node positions are not set yet. Please interact with the graph or wait for layout to finish, then try again."
      );
      return;
    }

    const nodesById = new Map(data.nodes.map((n) => [n.id, n]));

    // compute weight for each link = euclidean distance using current x,y
    const weightedLinks = data.links
      .map((l) => {
        // Handle source/target as objects or IDs
        const sourceId = typeof l.source === "object" ? l.source.id : l.source;
        const targetId = typeof l.target === "object" ? l.target.id : l.target;
        const s = nodesById.get(sourceId);
        const t = nodesById.get(targetId);
        if (!s || !t) {
          console.warn("Link with missing node:", l);
          return null;
        }
        const dx = (s.x || 0) - (t.x || 0);
        const dy = (s.y || 0) - (t.y || 0);
        const w = Math.hypot(dx, dy);
        return { ...l, source: sourceId, target: targetId, weight: w };
      })
      .filter(Boolean); // remove nulls

    // Kruskal's algorithm on the sparse link set
    const mst = kruskalMST(
      data.nodes.map((n) => n.id),
      weightedLinks
    );

    setMstLinks(mst);
    setShowMST(true);
    setInfo(`MST computed (links: ${mst.length}). Building tree structure...`);

    // Build parent/children from MST (root=0)
    const tree = buildTreeFromMST(
      data.nodes,
      mst,
      /*rootId=*/ data.nodes[0].id
    );

    // Initially collapse nodes deeper than depth 2 for manageable view
    const collapsed = new Set();
    for (const node of tree.nodes) {
      if ((node._depth || 0) > 2) collapsed.add(node.id);
    }
    setCollapsedSet(collapsed);

    // build displayed graph based on collapsed set
    const displayed = buildDisplayGraph(tree, collapsed);
    setDisplayGraph(displayed);
    setInfo("MST + initial collapse built. Click nodes to expand / collapse.");
  };

  // On first render we set the displayed graph to the full graph (will be re-filtered when MST created)
  useEffect(() => {
    setDisplayGraph(fullGraph);
    setInfo(
      'Initial graph generated. Allow simulation to run a few seconds for stable positions, then "Compute MST".'
    );
  }, [fullGraph]);

  // Toggle expand/collapse on node click (tree must already be built via MST)
  const onNodeClick = (node) => {
    if (!mstLinks) {
      setInfo('MST not computed yet. Click "Compute MST" first.');
      return;
    }

    // toggle collapse state for clicked node (only meaningful if node has children)
    const newCollapsed = new Set(collapsedSet);
    if (newCollapsed.has(node.id)) newCollapsed.delete(node.id);
    else newCollapsed.add(node.id);
    setCollapsedSet(newCollapsed);

    // rebuild the displayed graph using the MST tree structure (we rebuild tree from current mst)
    const tree = buildTreeFromMST(
      fullGraph.nodes,
      mstLinks,
      fullGraph.nodes[0].id
    );
    const displayed = buildDisplayGraph(tree, newCollapsed);
    setDisplayGraph(displayed);
  };

  // helper to render edges: when showMST is true highlight the MST links, otherwise show normal links
  // eslint-disable-next-line no-unused-vars
  const getLinksToRender = () => {
    if (!showMST || !mstLinks) return displayGraph.links;
    // we will return displayGraph.links but add a property 'isMST' true for edges in mst
    const mstSet = new Set(mstLinks.map((l) => `${l.source}->${l.target}`));
    return displayGraph.links.map((l) => ({
      ...l,
      isMST:
        mstSet.has(`${l.source}->${l.target}`) ||
        mstSet.has(`${l.target}->${l.source}`),
    }));
  };

  return (
    <div className="h-screen w-screen flex flex-col">
      <div className="p-2 flex gap-2 items-center bg-gray-100">
        <button
          className="px-3 py-1 rounded bg-blue-600 text-white"
          onClick={() => {
            setShowMST(false);
            setDisplayGraph(fullGraph);
            setInfo("Showing full original graph.");
          }}
        >
          Show Full Graph
        </button>
        <button
          className="px-3 py-1 rounded bg-green-600 text-white"
          onClick={computeAndShowMST}
        >
          Compute MST & Build Tree
        </button>
        <div className="ml-4">
          Nodes: {fullGraph.nodes.length} | Links: {fullGraph.links.length}
        </div>
        <div className="ml-auto mr-2 text-sm text-gray-700">{info}</div>
      </div>

      <div className="flex-1">
        <ForceGraph2D
          ref={fgRef}
          graphData={displayGraph}
          linkColor={(link) =>
            link.isMST ? "rgba(220,20,60,0.9)" : "rgba(100,100,100,0.2)"
          }
          linkWidth={(link) => (link.isMST ? 1.8 : 0.6)}
          nodeCanvasObject={(node, ctx, globalScale) =>
            drawNode(node, ctx, globalScale)
          }
          nodePointerAreaPaint={(node, color, ctx) => {
            // enlarge pointer area to make clicking easier for small nodes
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(
              node.x,
              node.y,
              Math.max(6, (node.size || 4) * 1.5),
              0,
              2 * Math.PI,
              false
            );
            ctx.fill();
          }}
          onNodeClick={onNodeClick}
          cooldownTicks={50}
          onEngineStop={() => {
            // Layout stabilized, node positions are now available for MST computation
            setInfo("Layout stabilized. You can compute MST now.");
          }}
          width={window.innerWidth}
          height={window.innerHeight - 48}
        />
      </div>
    </div>
  );
}

/* --------------------------- Utility functions --------------------------- */

// generateGraph: create a random "seed tree" and then add some random extra edges.
function generateGraph(nodeCount = 2000, extraEdges = 1000) {
  const nodes = new Array(nodeCount).fill(0).map((_, i) => ({
    id: i,
    // a sample metric that will control node size
    elementCount: Math.floor(Math.random() * 50) + 1,
    // pie data (random, normalized later)
    pie: [Math.random(), Math.random(), Math.random()].map((v) =>
      Math.round(v * 100)
    ),
    size: 2 + Math.random() * 6,
  }));

  const links = [];

  // Build a random tree (each node connects to a random earlier node) => guarantees connectivity
  for (let i = 1; i < nodeCount; i++) {
    const target = i;
    const source = Math.floor(Math.random() * i);
    links.push({ source, target });
  }

  // Add extra random edges to create cycles / extra connectivity
  for (let e = 0; e < extraEdges; e++) {
    const a = Math.floor(Math.random() * nodeCount);
    const b = Math.floor(Math.random() * nodeCount);
    if (a === b) continue;
    links.push({ source: a, target: b });
  }

  // compute degrees (useful for sizing or drawing choice)
  const degree = new Array(nodeCount).fill(0);
  for (const l of links) {
    degree[l.source]++;
    degree[l.target]++;
  }
  for (const n of nodes) n.degree = degree[n.id];

  return { nodes, links };
}

// Kruskal algorithm on a sparse link set. Expects nodes = array of ids, links = array with weight.
function kruskalMST(nodeIds, links) {
  // sort by weight
  const sorted = links.slice().sort((a, b) => a.weight - b.weight);
  const uf = new UnionFind(nodeIds);
  const mst = [];
  for (const l of sorted) {
    if (!uf.connected(l.source, l.target)) {
      uf.union(l.source, l.target);
      mst.push({ source: l.source, target: l.target });
    }
    if (mst.length >= nodeIds.length - 1) break;
  }
  return mst;
}

class UnionFind {
  constructor(elements) {
    this.parent = new Map();
    for (const e of elements) this.parent.set(e, e);
  }
  find(a) {
    let p = this.parent.get(a);
    while (p !== this.parent.get(p)) p = this.parent.get(p);
    let root = p;
    // path compression
    let cur = a;
    while (cur !== root) {
      let next = this.parent.get(cur);
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    this.parent.set(ra, rb);
  }
  connected(a, b) {
    return this.find(a) === this.find(b);
  }
}

// Given nodes + MST links, build a rooted tree (parent + children + depth)
function buildTreeFromMST(nodes, mstLinks, rootId) {
  // const nodeMap = new Map(nodes.map((n) => [n.id, { ...n }]));
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
function buildDisplayGraph(tree, collapsedSet) {
  const root = tree.nodes[0].id; // we built tree with root as first node earlier
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

// node drawing: draws a pie-chart inside the node and a label to the right
function drawNode(node, ctx, globalScale) {
  const label = `#${node.id}`;
  const baseRadius = Math.max(3, node.size || 4);
  const radius = baseRadius * (1 + Math.log((node.elementCount || 1) + 1) / 3);

  // draw pie
  const pies = node.pie || [1];
  const total = pies.reduce((a, b) => a + b, 0) || 1;
  let start = -Math.PI / 2;
  for (let i = 0; i < pies.length; i++) {
    const slice = pies[i] / total;
    const end = start + slice * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(node.x, node.y);
    ctx.arc(node.x, node.y, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = colorForIndex(i);
    ctx.fill();
    start = end;
  }

  // draw circle outline
  ctx.beginPath();
  ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = Math.max(0.5, 1 / globalScale);
  ctx.stroke();

  // draw label (only when zoomed enough)
  if (globalScale > 0.5) {
    ctx.font = `${12 / globalScale}px Sans-Serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "black";
    ctx.fillText(label, node.x + radius + 4, node.y);
  }
}

function colorForIndex(i) {
  const palette = ["#ef476f", "#ffd166", "#06d6a0", "#118ab2", "#073b4c"];
  return palette[i % palette.length];
}

/*
Explanatory notes (in-code quick reference):
- Force-directed layout: a physics simulation that treats nodes as particles and edges as springs. The most common forces are:
  * link force (attract linked nodes)
  * many-body (repulsion / charge) to avoid collapse
  * center force to keep the graph in view
  The algorithm iteratively updates node positions until the system "stabilizes".

- MST (Minimum Spanning Tree): given a connected weighted graph, the MST is a subset of edges that connects all vertices with minimum possible total edge weight. Common algorithms: Kruskal (works on sorted edges + union-find), Prim (grows a tree using priority queue).

- Expand / Collapse: we use the MST as a tree and show/hide subtrees by toggling a collapsed flag on nodes. This is a useful pattern for very large trees because it reduces the number of visible nodes and lets the user explore details on demand.

- Scalability concerns (why 500k is hard):
  * naive force computation is O(N^2) per tick (all pairs). Approximations like Barnes-Hut (quadtree) get ~O(N log N).
  * rendering half a million objects is heavy even for the GPU; strategies: level-of-detail, aggregation (cluster nodes into meta-nodes), progressive rendering, or server-side precomputation + tiled view.
  * layout and rendering can be separated: compute layout offline (HPC, multi-threaded, or GPU) and stream positions to client.
*/
