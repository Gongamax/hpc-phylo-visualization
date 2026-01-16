import { useEffect, useRef, useState } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import type { Edge, Node } from "../utils/mst";

interface GraphVisualizationProps {
  nodes: Node[];
  edges: Edge[];
  mstEdges: Edge[];
  showMST: boolean;
  isPhylogenetic?: boolean;
  onRender?: (renderTime: number) => void;
}

const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  nodes,
  edges,
  mstEdges,
  showMST,
  isPhylogenetic = false,
  onRender,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const [stats, setStats] = useState({ totalWeight: 0, mstWeight: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const renderStartTime = performance.now();

    // Cleanup previous instance first
    if (sigmaRef.current) {
      sigmaRef.current.kill();
      sigmaRef.current = null;
    }

    // Create a new graph
    const graph = new Graph();
    const nodeCount = nodes.length;

    // Aggressive performance optimizations for phylogenetic trees
    const isLargeGraph = nodeCount > 50; // Much more aggressive threshold
    const isExtremeGraph = nodeCount > 200; // Phylogenetic trees are dense
    const nodeSize = isLargeGraph
      ? Math.max(0.5, 6 - Math.log10(nodeCount))
      : 8;
    const showLabels = nodeCount < 30; // Very aggressive label hiding for phylogenetic trees
    const edgeSize = isExtremeGraph ? 0.1 : isLargeGraph ? 0.3 : 0.8;

    console.log(
      `📊 Rendering phylogenetic graph: ${nodeCount} nodes, labels: ${showLabels}, nodeSize: ${nodeSize}, edgeSize: ${edgeSize}`
    );

    if (isExtremeGraph) {
      console.warn(
        `⚠️ Large phylogenetic tree detected (${nodeCount} nodes). Performance will be limited.`
      );
    }

    // Add nodes with performance optimizations
    nodes.forEach((node) => {
      let nodeColor = "#666";
      let nodeLabel = showLabels ? node.label : "";
      let size = nodeSize;

      if (isPhylogenetic) {
        // Special styling for phylogenetic trees
        nodeColor = node.isLeaf ? "#27ae60" : "#8e44ad"; // Green for leaves, purple for internal
        size = node.isLeaf ? nodeSize * 1.5 : nodeSize * 0.8; // Larger leaves, smaller internal nodes
        nodeLabel = node.isLeaf ? node.label : ""; // Only show labels for leaves (species names)
      }

      // Safety check to prevent duplicate nodes
      if (!graph.hasNode(node.id)) {
        graph.addNode(node.id, {
          label: nodeLabel,
          x: node.x || Math.random(),
          y: node.y || Math.random(),
          size: size,
          color: nodeColor,
        });
      }
    });

    // Calculate total weight and MST weight
    const totalWeight = edges.reduce((sum, edge) => sum + edge.weight, 0);
    const mstWeight = mstEdges.reduce((sum, edge) => sum + edge.weight, 0);

    setStats({ totalWeight, mstWeight });

    // Add edges based on what we want to show
    const edgesToShow = showMST ? mstEdges : edges;

    edgesToShow.forEach((edge) => {
      if (
        graph.hasNode(edge.source) &&
        graph.hasNode(edge.target) &&
        !graph.hasEdge(edge.source, edge.target)
      ) {
        const isMSTEdge =
          showMST ||
          mstEdges.some(
            (mstEdge) =>
              (mstEdge.source === edge.source &&
                mstEdge.target === edge.target) ||
              (mstEdge.source === edge.target && mstEdge.target === edge.source)
          );

        graph.addEdge(edge.source, edge.target, {
          weight: edge.weight,
          label: showLabels ? edge.weight.toString() : "",
          size: isMSTEdge && !showMST ? Math.max(edgeSize * 3, 1) : edgeSize,
          color: showMST ? "#e74c3c" : isMSTEdge ? "#e74c3c" : "#bbb",
          type: "line",
        });
      }
    });

    // Create Sigma instance with aggressive phylogenetic optimizations
    try {
      const sigmaSettings = {
        renderEdgeLabels: false, // Always disable for phylogenetic trees
        renderLabels: showLabels,
        defaultNodeColor: "#666",
        defaultEdgeColor: "#bbb",
        labelFont: "Arial",
        labelSize: Math.max(4, 10 - Math.log10(nodeCount)),
        labelWeight: "normal",
        edgeLabelFont: "Arial",
        // Phylogenetic-specific optimizations
        enableEdgeClickEvents: false,
        enableEdgeWheelEvents: false,
        enableEdgeHoverEvents: nodeCount < 100,
        hideEdgesOnMove: nodeCount > 100,
        hideLabelsOnMove: nodeCount > 50,
        zoomingRatio: 1.2,
        doubleClickZoomingRatio: 2.2,
      };

      console.log(`🎛️ Sigma settings:`, sigmaSettings);

      sigmaRef.current = new Sigma(graph, containerRef.current, sigmaSettings);

      const renderTime = performance.now() - renderStartTime;
      if (onRender) {
        onRender(renderTime);
      }

      console.log("✅ Sigma instance created successfully");
      console.log("Graph nodes:", graph.nodes().length);
      console.log("Graph edges:", graph.edges().length);
    } catch (error) {
      console.error("❌ Error creating Sigma instance:", error);
      console.log("Graph nodes:", graph.nodes().length);
      console.log("Graph edges:", graph.edges().length);
    }

    return () => {
      if (sigmaRef.current) {
        sigmaRef.current.kill();
      }
    };
  }, [nodes, edges, mstEdges, showMST, isPhylogenetic]);

  return (
    <div className="graph-container">
      <div className="graph-stats">
        <div className="stat">
          <strong>Nodes:</strong> {nodes.length}
        </div>
        <div className="stat">
          <strong>Edges:</strong> {edges.length}
        </div>
        <div className="stat">
          <strong>Total Weight:</strong> {stats.totalWeight.toFixed(2)}
        </div>
        <div className="stat">
          <strong>MST Weight:</strong> {stats.mstWeight.toFixed(2)}
        </div>
        <div className="stat">
          <strong>Weight Saved:</strong>{" "}
          {(stats.totalWeight - stats.mstWeight).toFixed(2)}
        </div>
      </div>
      <div
        ref={containerRef}
        className="sigma-container"
        style={{
          width: "100%",
          height: "500px",
          border: "1px solid #ddd",
          borderRadius: "4px",
        }}
      />
    </div>
  );
};

export default GraphVisualization;
