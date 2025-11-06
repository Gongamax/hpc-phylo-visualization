import React, { useState, useEffect } from "react";
import DeckGL from "@deck.gl/react";
import { ScatterplotLayer, LineLayer } from "@deck.gl/layers";
import { OrthographicView, COORDINATE_SYSTEM } from "@deck.gl/core";
import { computeOptimizedMST } from "./graph-algorithms.js";

const INITIAL_VIEW_STATE = {
  target: [50, 40, 0], // center the graph roughly (x, y, z)
  zoom: 1,
  pitch: 0,
  bearing: 0,
};

export default function App() {
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [mstEdges, setMstEdges] = useState([]);
  const [performanceStats, setPerformanceStats] = useState(null);
  const [useOptimized, setUseOptimized] = useState(true);
  const [nodeCount, setNodeCount] = useState(1000);

  useEffect(() => {
    fetch("graph-data.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch graph-data.json");
        return res.json();
      })
      .then((data) => {
        console.log("Loaded graph data:", data);
        setGraph(data);
      })
      .catch((err) => {
        console.error("Error loading graph data:", err);
        setGraph({ nodes: [], edges: [] });
      });
  }, []);

  // Fallback hardcoded data for debugging, but prefer fetched `graph`
  const fallbackNodes = [
    { id: "A", x: 0, y: 0 },
    { id: "B", x: 100, y: 0 },
    { id: "C", x: 50, y: 80 },
  ];

  const fallbackEdges = [
    { source: "A", target: "B" },
    { source: "A", target: "C" },
    { source: "B", target: "C" },
  ];

  const nodes =
    Array.isArray(graph.nodes) && graph.nodes.length
      ? graph.nodes
      : fallbackNodes;
  const edges =
    Array.isArray(graph.edges) && graph.edges.length
      ? graph.edges
      : fallbackEdges;

  // Build edge coordinates using node positions
  const edgeData = edges
    .map((e) => {
      const src = nodes.find((n) => n.id === e.source);
      const tgt = nodes.find((n) => n.id === e.target);
      return src && tgt
        ? { source: [src.x, src.y, 0], target: [tgt.x, tgt.y, 0] }
        : null;
    })
    .filter(Boolean);

  const nodeLayer = new ScatterplotLayer({
    id: "nodes",
    data: nodes,
    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    getPosition: (d) => [d.x, d.y, 0],
    getRadius: 15,
    getFillColor: [0, 128, 255],
  });

  const edgeLayer = new LineLayer({
    id: "edges",
    data: edgeData,
    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    getSourcePosition: (d) => d.source,
    getTargetPosition: (d) => d.target,
    getColor: [200, 200, 200],
    getWidth: 2,
    pickable: false,
  });

  class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }
    componentDidCatch(error, info) {
      console.error("ErrorBoundary caught:", error, info);
    }
    render() {
      if (this.state.hasError) {
        return <div>Render error: {String(this.state.error)}</div>;
      }
      return this.props.children;
    }
  }

  console.log("About to render DeckGL with layers:", { nodeLayer, edgeLayer });
  try {
    return (
      <ErrorBoundary>
        <div style={{ position: "absolute", left: 10, top: 10, zIndex: 10 }}>
          <button
            onClick={() => {
              // Compute MST over current nodes (Euclidean distance)
              const nodesForMst = nodes.map((n, i) => ({
                id: n.id,
                x: n.x,
                y: n.y,
                idx: i,
              }));
              const mst = computeMST(nodesForMst);
              // mst is list of pairs of indices; convert to edgeData format
              const mstEdgeData = mst.map(([i, j]) => {
                const a = nodes[i];
                const b = nodes[j];
                return { source: [a.x, a.y, 0], target: [b.x, b.y, 0] };
              });
              setMstEdges(mstEdgeData);
            }}
          >
            Compute MST
          </button>
          <button
            onClick={() => {
              setMstEdges([]);
            }}
            style={{ marginLeft: 8 }}
          >
            Clear MST
          </button>
        </div>
        <DeckGL
          initialViewState={INITIAL_VIEW_STATE}
          controller={true}
          views={[new OrthographicView()]}
          layers={[
            edgeLayer,
            nodeLayer,
            // MST overlay (red)
            new LineLayer({
              id: "mst",
              data: mstEdges,
              coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
              getSourcePosition: (d) => d.source,
              getTargetPosition: (d) => d.target,
              getColor: [255, 0, 0],
              getWidth: 3,
              pickable: false,
            }),
          ]}
        />
      </ErrorBoundary>
    );
  } catch (err) {
    console.error("Render threw:", err);
    return <div>Render threw error: {String(err)}</div>;
  }
}

// Prim's algorithm (O(n^2)) for small graphs; returns array of [i, j] edges indices
function computeMST(nodes) {
  const n = nodes.length;
  if (n === 0) return [];
  const inMST = new Array(n).fill(false);
  const minEdge = new Array(n).fill(Infinity);
  const parent = new Array(n).fill(-1);
  minEdge[0] = 0;

  function dist(i, j) {
    const dx = nodes[i].x - nodes[j].x;
    const dy = nodes[i].y - nodes[j].y;
    return Math.hypot(dx, dy);
  }

  for (let k = 0; k < n; k++) {
    // find the vertex with smallest minEdge
    let v = -1;
    for (let i = 0; i < n; i++) {
      if (!inMST[i] && (v === -1 || minEdge[i] < minEdge[v])) v = i;
    }
    if (minEdge[v] === Infinity) break;
    inMST[v] = true;

    // update neighbors
    for (let to = 0; to < n; to++) {
      if (!inMST[to]) {
        const w = dist(v, to);
        if (w < minEdge[to]) {
          minEdge[to] = w;
          parent[to] = v;
        }
      }
    }
  }

  const edges = [];
  for (let i = 1; i < n; i++) {
    if (parent[i] !== -1) edges.push([i, parent[i]]);
  }
  return edges;
}
