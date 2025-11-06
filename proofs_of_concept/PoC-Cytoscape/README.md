Cytoscape.js PoC — Phylogenetic tree demo

What this is

- Minimal demo that uses Cytoscape.js to render a small phylogenetic-like tree.

Files

- `index.html`: demo page (loads Cytoscape.js from CDN and `js/main.js`).
- `js/main.js`: initialization, layout, and simple controls.
- `data/sample-tree.json`: small example converted to Cytoscape elements JSON.

Run

1. Open `index.html` in a browser (double-click or serve with a simple static server).

Optional (serve with Python):

```bash
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

Notes and next steps

- This demo uses the `breadthfirst` layout which is suitable for tree-like structures. For larger trees consider `dagre` (requires plugin) or custom layout algorithms.
- If you have Newick trees, we can add a converter to parse Newick and generate Cytoscape elements programmatically.
- I can also provide React/Vue integration examples and performance tips for large trees.

Newick support

- The demo now accepts a Newick file via the "Load Newick" file input in the toolbar. Choose the render mode: "Dendrogram (preset)" or "Graph (breadthfirst)".
- Dendrogram mode attempts a simple preset layout that positions leaves along the x-axis and internal nodes above them. This produces a classical phylogeny look but is simplistic and meant for small-to-medium trees.
- Graph mode runs Cytoscape's `breadthfirst` layout which treats the tree as a directed graph and spaces nodes by levels. It may be preferable for interactive exploration.

Limitations and next improvements

- The included Newick parser is minimal: it handles nested trees, node labels, and numeric branch lengths but doesn't handle comments or some exotic Newick features. It runs client-side in the browser.
- For very large trees (thousands of leaves) consider server-side parsing, progressive rendering, WebGL-backed renderers, or specialized tree viewers (e.g., D3-based radial/tree layouts).

MST (Minimum Spanning Tree) view

- There's a "Toggle MST" button in the toolbar. When enabled, the demo computes a Minimum Spanning Tree over the currently loaded graph using Kruskal's algorithm and highlights the MST edges while dimming others.
- Edge weights: the code looks for `data.weight` first, then `data.length` (from Newick branch lengths). If no numeric weights are present, it falls back to an unweighted spanning tree (all edges weight=1).
- While MST is active, click a node to temporarily reveal its non-MST incident edges (useful to explore additional connections locally).

MST performance and Web Worker

- For large graphs, MST computation is offloaded to a Web Worker (`js/mstWorker.js`) to keep the UI responsive. The worker is created on-demand when you first toggle MST. If your browser supports Web Workers, MST computation will happen in the background and the toolbar will show "MST: computing..." while it runs.

Phylogram / branch-length layout

- A new render mode "Phylogram (branch lengths)" positions nodes vertically by cumulative branch length from the root and spaces leaves evenly along the x-axis. Choose it from the Render select in the toolbar. This mode uses branch lengths parsed from Newick (`data.length`) and is intended to produce phylogram-like visuals.

Force-directed (cose) layout

- A new render mode "Force-directed (cose)" uses Cytoscape's spring-embedder layout with edge-length weighting. This layout respects branch lengths from Newick (`data.length`) by setting spring rest lengths proportional to edge lengths. It's great for organic, readable layouts of phylogenetic trees, especially when combined with edge labels. Recommended by the Cytoscape RCy3 documentation for phylogenetic trees.

Edge labels and minimal internal nodes

- **Edge labels**: Enable the "Edge labels" checkbox in the toolbar to display branch lengths (from Newick) on edges. This helps visualize evolutionary distances at a glance.
- **Minimal internal nodes**: The "Minimal internal nodes" checkbox (checked by default) shrinks internal (junction) nodes to small dots and hides their labels, decluttering large trees and emphasizing leaf nodes. This follows best practices from the Cytoscape RCy3 phylogenetic tree guide.
