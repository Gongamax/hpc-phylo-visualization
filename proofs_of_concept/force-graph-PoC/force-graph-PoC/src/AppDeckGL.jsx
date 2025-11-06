import React, { useEffect, useState, useMemo } from "react";
import DeckGL from "@deck.gl/react";
import { COORDINATE_SYSTEM } from "@deck.gl/core";
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import * as d3 from "d3-force-3d";
import NodePieLayer from "./layers/NodePieLayer";
import NodeLayer from "./layers/NodeLayer";
import EdgeLayer from "./layers/EdgeLayer";
import { buildTreeFromMST, buildDisplayGraph } from "./TreeUtils";

// PARAMETERS for the demo
const NODE_COUNT = 50;
const LINK_COUNT = Math.floor(NODE_COUNT * 1.2);

// Generate a random graph with a tree structure plus extra edges
function generateGraph(nodeCount = NODE_COUNT, extraEdges = LINK_COUNT) {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: i,
    // a sample metric that will control node size
    elementCount: Math.floor(Math.random() * 50) + 1,
    // pie data (random)
    pie: [Math.random(), Math.random(), Math.random()].map((v) =>
      Math.round(v * 100)
    ),
    size: 2 + Math.random() * 6,
    z: 0,
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

// Union-Find data structure for Kruskal's algorithm
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

// Kruskal's MST algorithm with edge weights based on node positions
function computeMST(graph) {
  const nodes = graph.nodes;
  const links = graph.links;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Compute weight for each link = euclidean distance using current x,y
  const weightedLinks = links
    .map((l) => {
      // Handle source/target as objects or IDs
      const sourceId = typeof l.source === "object" ? l.source.id : l.source;
      const targetId = typeof l.target === "object" ? l.target.id : l.target;
      const s = nodeById.get(sourceId);
      const t = nodeById.get(targetId);
      if (!s || !t) return null;
      const dx = (s.x || 0) - (t.x || 0);
      const dy = (s.y || 0) - (t.y || 0);
      const w = Math.sqrt(dx * dx + dy * dy);
      return { ...l, source: sourceId, target: targetId, weight: w };
    })
    .filter(Boolean); // Remove nulls

  // Sort by weight
  const sorted = weightedLinks.slice().sort((a, b) => a.weight - b.weight);
  const uf = new UnionFind(nodes.map((n) => n.id));
  const mstLinks = [];

  for (const l of sorted) {
    if (!uf.connected(l.source, l.target)) {
      uf.union(l.source, l.target);
      mstLinks.push({ source: l.source, target: l.target });
    }
    if (mstLinks.length >= nodes.length - 1) break;
  }

  return mstLinks;
}

// Helper function to get a color from node ID - makes visualization more colorful
function getNodeColor(id) {
  const colors = [
    [66, 133, 244, 230], // Google Blue
    [219, 68, 55, 230], // Google Red
    [244, 160, 0, 230], // Google Yellow
    [15, 157, 88, 230], // Google Green
    [171, 71, 188, 230], // Purple
    [0, 172, 193, 230], // Teal
    [255, 112, 67, 230], // Deep Orange
    [158, 157, 36, 230], // Lime
  ];

  return colors[id % colors.length];
}

export default function AppDeckGL() {
  // State for the visualization
  const [fullGraph] = useState(() => {
    // Initialize graph and run simulation once on component mount
    const initialGraph = generateGraph(NODE_COUNT, LINK_COUNT);
    const nodesCopy = initialGraph.nodes.map((n) => ({ ...n }));
    const linksCopy = initialGraph.links.map((l) => ({ ...l }));

    const simulation = d3
      .forceSimulation(nodesCopy)
      .force(
        "link",
        d3
          .forceLink(linksCopy)
          .id((d) => d.id)
          .distance(80) // Increased distance for better visibility and spreading
      )
      .force("charge", d3.forceManyBody().strength(-200)) // Stronger repulsion for more spread
      .force("center", d3.forceCenter(0, 0)) // Centered at origin
      .force("x", d3.forceX().strength(0.05)) // Light force towards center x
      .force("y", d3.forceY().strength(0.05)) // Light force towards center y
      .force(
        "collision",
        d3.forceCollide().radius((d) => (d.size || 3) * 2)
      ) // Prevent node overlap
      .stop();

    // Run the simulation for a set number of iterations
    for (let i = 0; i < 400; i++) simulation.tick(); // More iterations for better stability

    // Get min/max coordinates for normalization
    const xs = nodesCopy.map((n) => n.x || 0);
    const ys = nodesCopy.map((n) => n.y || 0);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs);
    const minY = Math.min(...ys),
      maxY = Math.max(...ys);

    // Simple scaling to ensure nodes are visible
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    // Apply scaling but keep some spacing between nodes
    const scaleFactor = 0.8; // Scale to 80% of available space for some padding

    // Scale nodes to fit in a reasonable range
    nodesCopy.forEach((n) => {
      // Normalize to [-scaleFactor, scaleFactor] range
      n.x = ((n.x - minX) / rangeX) * 2 * scaleFactor - scaleFactor;
      n.y = ((n.y - minY) / rangeY) * 2 * scaleFactor - scaleFactor;

      // Ensure nodes have reasonable sizes for better visibility
      n.size = Math.max(n.size || 2, 3);
    });

    return { nodes: nodesCopy, links: linksCopy };
  });

  const [displayGraph, setDisplayGraph] = useState(fullGraph);
  const [mstLinks, setMstLinks] = useState([]);
  const [showMST, setShowMST] = useState(false);
  const [treeGraph, setTreeGraph] = useState(null);
  const [collapsedSet, setCollapsedSet] = useState(new Set());
  const [info, setInfo] = useState("Ready. Click 'Compute MST' to start.");
  const [useTreeLayout, setUseTreeLayout] = useState(false);
  const [showEdgeLabels, setShowEdgeLabels] = useState(false);
  const [showPieCharts, setShowPieCharts] = useState(true);

  // Node-by-ID lookup map for quick reference
  const nodeById = useMemo(
    () => new Map(fullGraph.nodes.map((n) => [n.id, n])),
    [fullGraph]
  );

  // Compute MST and initialize the tree structure
  const computeAndShowMST = () => {
    setInfo("Computing MST using current node positions as weights...");

    // Compute MST using Kruskal's algorithm
    const mst = computeMST(fullGraph);
    setMstLinks(mst);
    setShowMST(true);

    // Build tree structure from MST with node 0 as root
    const tree = buildTreeFromMST(fullGraph.nodes, mst, fullGraph.nodes[0].id);
    setTreeGraph(tree);

    // Initially collapse nodes deeper than depth 2 for manageable view
    const collapsed = new Set();
    for (const node of tree.nodes) {
      if ((node._depth || 0) > 2) collapsed.add(node.id);
    }
    setCollapsedSet(collapsed);

    // Build displayed graph based on collapsed set
    if (useTreeLayout) {
      const displayed = buildDisplayGraph(tree, collapsed);
      setDisplayGraph(displayed);
      setInfo(
        "MST computed. Click nodes to expand/collapse. Currently using tree layout."
      );
    } else {
      setInfo("MST computed. Showing full graph with MST highlighted.");
    }
  };

  // Toggle expand/collapse on node click
  const handleNodeClick = (node) => {
    if (!treeGraph) {
      setInfo("MST not computed yet. Click 'Compute MST' first.");
      return;
    }

    // Toggle collapsed state
    const newCollapsed = new Set(collapsedSet);
    if (newCollapsed.has(node.id)) {
      newCollapsed.delete(node.id);
      setInfo(`Node ${node.id} expanded`);
    } else {
      newCollapsed.add(node.id);
      setInfo(`Node ${node.id} collapsed`);
    }
    setCollapsedSet(newCollapsed);

    // Update display graph if using tree layout
    if (useTreeLayout) {
      const displayed = buildDisplayGraph(treeGraph, newCollapsed);
      setDisplayGraph(displayed);
    }
  };

  // Toggle between full graph and tree layout
  const toggleTreeLayout = () => {
    if (!treeGraph) {
      setInfo("MST not computed yet. Click 'Compute MST' first.");
      return;
    }

    setUseTreeLayout(!useTreeLayout);

    if (!useTreeLayout) {
      // Switching to tree layout
      const displayed = buildDisplayGraph(treeGraph, collapsedSet);
      setDisplayGraph(displayed);
      setInfo("Switched to tree layout. Only MST links are shown.");
    } else {
      // Switching to full graph
      setDisplayGraph(fullGraph);
      setInfo("Switched to full graph. MST links are highlighted in red.");
    }
  };

  // Process links - improved version with additional properties for visualization
  const processedLinks = useMemo(() => {
    // Determine which links to show
    const linksToProcess =
      useTreeLayout && treeGraph ? displayGraph.links : fullGraph.links;

    // Create a Set of MST links for easy lookup
    const mstSet = new Set();
    mstLinks.forEach((l) => {
      const sourceId = typeof l.source === "object" ? l.source.id : l.source;
      const targetId = typeof l.target === "object" ? l.target.id : l.target;
      mstSet.add(`${sourceId}-${targetId}`);
      mstSet.add(`${targetId}-${sourceId}`);
    });

    // Process each link
    const processed = [];

    for (const link of linksToProcess) {
      // Handle different link formats
      const sourceId =
        typeof link.source === "object" ? link.source.id : link.source;
      const targetId =
        typeof link.target === "object" ? link.target.id : link.target;

      // Get the actual node objects
      const sourceNode = nodeById.get(sourceId);
      const targetNode = nodeById.get(targetId);

      if (!sourceNode || !targetNode) continue;

      // Calculate distance for potential thickness or opacity adjustments
      const dx = sourceNode.x - targetNode.x;
      const dy = sourceNode.y - targetNode.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Add processed link with all needed properties
      processed.push({
        sourceId,
        targetId,
        source: sourceNode,
        target: targetNode,
        distance,
        inMST:
          mstSet.has(`${sourceId}-${targetId}`) ||
          mstSet.has(`${targetId}-${sourceId}`),
        // Color based on MST status - will be used for styling
        color:
          mstSet.has(`${sourceId}-${targetId}`) ||
          mstSet.has(`${targetId}-${sourceId}`)
            ? [255, 0, 0, 200] // Red for MST
            : [80, 80, 80, 100], // Gray for regular links
      });
    }

    return processed;
  }, [
    fullGraph.links,
    displayGraph.links,
    mstLinks,
    nodeById,
    treeGraph,
    useTreeLayout,
  ]);

  // Node rendering with pie charts is handled by NodePieLayer

  // Component mount initialization
  useEffect(() => {
    // Initial setup if needed
    setInfo("Graph initialized. Click 'Compute MST' to start.");
  }, []);

  // Define layers for the visualization - improved for better visibility and performance
  const layers = [
    // Custom Edge Layer
    new EdgeLayer({
      id: "edges",
      data: processedLinks,
      getSourcePosition: (d) => [d.source.x, d.source.y, 0],
      getTargetPosition: (d) => [d.target.x, d.target.y, 0],
      getColor: (d) => (showMST ? d.color : [80, 80, 80, 160]),
      getWidth: (d) => (showMST && d.inMST ? 3 : 1.5),
      widthUnits: "pixels",
      widthMinPixels: 1.5,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      pickable: true,
      onHover: (info) => {
        if (info.object) {
          // Could set tooltip or highlight info here if needed
        }
      },
    }),

    // Edge labels (optional)
    showEdgeLabels &&
      new TextLayer({
        id: "edge-labels",
        data: processedLinks,
        getPosition: (d) => [
          (d.source.x + d.target.x) / 2,
          (d.source.y + d.target.y) / 2,
          0,
        ],
        getText: (d) => `${d.sourceId}-${d.targetId}`,
        getSize: 10,
        getColor: [80, 80, 80],
        sizeUnits: "pixels",
        sizeMinPixels: 10,
        coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      }),

    // Use custom node layer for basic nodes without pies
    !showPieCharts &&
      new NodeLayer({
        id: "nodes",
        data: useTreeLayout ? displayGraph.nodes : fullGraph.nodes,
        getPosition: (d) => [d.x, d.y, 0],
        getRadius: (d) => Math.max(5, d.size * 2 || 8),
        getFillColor: (d) => getNodeColor(d.id),
        getLineColor: [0, 0, 0, 150],
        stroked: true,
        lineWidthMinPixels: 1,
        radiusMinPixels: 5,
        coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
        pickable: true,
        onClick: (info) => info.object && handleNodeClick(info.object),
      }),

    // Node labels with improved visibility
    new TextLayer({
      id: "node-labels",
      data: useTreeLayout ? displayGraph.nodes : fullGraph.nodes,
      getPosition: (d) => [d.x, d.y, 0],
      getText: (d) => `N${d.id}`,
      getSize: 14, // Increased text size
      getColor: [0, 0, 0],
      getTextAnchor: "middle",
      getAlignmentBaseline: "center",
      sizeUnits: "pixels",
      sizeMinPixels: 12,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    }),

    // Add custom pie chart nodes when enabled
    showPieCharts &&
      new NodePieLayer({
        id: "pie-nodes",
        data: useTreeLayout ? displayGraph.nodes : fullGraph.nodes,
        getPosition: (d) => [d.x, d.y, 0],
        getRadius: (d) => Math.max(5, d.size * 2 || 8),
        getFillColor: (d) => getNodeColor(d.id),
        getLineColor: [0, 0, 0, 150],
        hasPie: (d) => Array.isArray(d.pie) && d.pie.length > 0,
        getPieData: (d) =>
          d.pie ? d.pie.map((value, i) => ({ value, index: i })) : [],
        getPieValue: (d) => d.value,
        getPieColor: (d, i) =>
          [
            [66, 133, 244, 230],
            [219, 68, 55, 230],
            [244, 160, 0, 230],
            [15, 157, 88, 230],
          ][i % 4],
        pickable: true,
        onClick: (info) => info.object && handleNodeClick(info.object),
      }),
  ].filter(Boolean); // Remove null layers

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Control panel */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 1,
          background: "white",
          padding: "10px",
          borderRadius: "5px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxWidth: "350px",
        }}
      >
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setShowMST(false);
              setDisplayGraph(fullGraph);
              setUseTreeLayout(false);
              setInfo("Showing full original graph.");
            }}
            style={{
              padding: "5px 10px",
              background: "steelblue",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Full Graph
          </button>

          <button
            onClick={computeAndShowMST}
            style={{
              padding: "5px 10px",
              background: "green",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Compute MST
          </button>

          <button
            onClick={toggleTreeLayout}
            disabled={!treeGraph}
            style={{
              padding: "5px 10px",
              background: treeGraph
                ? useTreeLayout
                  ? "purple"
                  : "indigo"
                : "#ccc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: treeGraph ? "pointer" : "not-allowed",
            }}
          >
            {useTreeLayout ? "Show Full Graph" : "Show Tree Layout"}
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <input
              type="checkbox"
              checked={showPieCharts}
              onChange={() => setShowPieCharts(!showPieCharts)}
            />
            Show Pie Charts
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <input
              type="checkbox"
              checked={showEdgeLabels}
              onChange={() => setShowEdgeLabels(!showEdgeLabels)}
            />
            Edge Labels
          </label>

          {/* Removed canvas option as it wasn't working well */}
        </div>

        <div style={{ fontSize: "12px", color: "#555" }}>{info}</div>

        <div style={{ fontSize: "12px" }}>
          Nodes: {fullGraph.nodes.length} | Links: {fullGraph.links.length} |
          MST: {mstLinks.length}
        </div>
      </div>

      {/* Main visualization */}
      <DeckGL
        initialViewState={{
          // Use standard 2D view settings with improved initial zoom
          longitude: 0,
          latitude: 0,
          zoom: 1.5, // Start more zoomed in for better visibility
          pitch: 0,
          bearing: 0,
          minZoom: -2,
          maxZoom: 10,
        }}
        controller={{
          doubleClickZoom: false, // Disable double-click zoom to prevent accidental zooming
          scrollZoom: {
            speed: 0.01, // Slower zoom for better control
            smooth: true,
          },
        }}
        layers={layers}
        style={{ width: "100%", height: "100%" }}
        getTooltip={({ object }) =>
          object && `Node ${object.id}\nDegree: ${object.degree || 0}`
        }
      />

      {/* Canvas overlay for pie charts removed as it wasn't working well */}
    </div>
  );
}
