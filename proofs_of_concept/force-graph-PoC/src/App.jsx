import React, { useState, useEffect, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";
import ForceGraph3D from "react-force-graph-3d";

const SAMPLE_DATASETS = {
  "Phylo: Simulated 1K": "/data/simulated/ete3/tree_1k_edgelist.csv",
  "Phylo: Simulated 3K": "/data/simulated/ete3/tree_3k_edgelist.csv",
  "Phylo: Simulated 10K": "/data/simulated/ete3/tree_10k_edgelist.csv",
  "Phylo: Simulated 30K": "/data/simulated/ete3/tree_30k_edgelist.csv",
  "Phylo: Simulated 50K": "/data/simulated/ete3/tree_50k_edgelist.csv",
  "Phylo: H. influenzae MLST":
    "/data/pubmlst/haemophilus_influenzae/haemophilus_influenzae-MLST_tree_edgelist.csv",
  "Phylo: H. influenzae cgMLST":
    "/data/pubmlst/haemophilus_influenzae/haemophilus_influenzae-cgMLST_tree_edgelist.csv",
  "Phylo: C. coli MLST":
    "/data/pubmlst/campylobacter_coli/coli-MLST_tree_edgelist.csv",
  "Phylo: Neisseria MLST":
    "/data/pubmlst/neisseria/neisseria-MLST_tree_edgelist.csv",
  "Phylo: S. aureus MLST":
    "/data/pubmlst/staphylococcus_aureus/staphylococus-MLST_tree_edgelist.csv",
  "Phylo: S. pneumoniae MLST":
    "/data/pubmlst/streptococcus_pneumoniae/pneumoniae-MLST_tree_edgelist.csv",
};

export default function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedDataset, setSelectedDataset] = useState("Phylo: Simulated 1K");
  const [viewMode, setViewMode] = useState("2D");
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    parseTime: 0,
    renderTime: 0,
    totalTime: 0,
    nodeCount: 0,
    edgeCount: 0,
  });
  const fgRef = useRef();
  const renderStartTime = useRef(null);

  const loadDataset = async (datasetName) => {
    setIsLoading(true);

    try {
      const csvPath = SAMPLE_DATASETS[datasetName];

      // Measure CSV fetch time
      const startFetch = performance.now();
      const response = await fetch(csvPath);
      const text = await response.text();
      const fetchTime = performance.now() - startFetch;

      // Measure parsing time
      const startParse = performance.now();
      const lines = text.trim().split("\n");

      const nodeSet = new Set();
      const links = [];

      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const [source, target] = lines[i].split(",").map((s) => s.trim());
        if (source && target) {
          nodeSet.add(source);
          nodeSet.add(target);
          links.push({ source, target });
        }
      }

      const nodes = Array.from(nodeSet).map((id) => ({ id }));
      const parseTime = performance.now() - startParse;
      const loadTime = fetchTime + parseTime;

      // Set render start time before component renders
      renderStartTime.current = performance.now();

      setGraphData({ nodes, links });
      setMetrics({
        loadTime: loadTime.toFixed(2),
        parseTime: parseTime.toFixed(2),
        renderTime: 0, // Will be updated after first render
        totalTime: 0, // Will be updated after first render
        nodeCount: nodes.length,
        edgeCount: links.length,
      });
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading dataset:", error);
      setIsLoading(false);
    }
  };

  // Measure render completion
  useEffect(() => {
    if (graphData.nodes.length > 0 && renderStartTime.current) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        const renderTime = (
          performance.now() - renderStartTime.current
        ).toFixed(2);
        const totalTime = (
          parseFloat(metrics.loadTime) + parseFloat(renderTime)
        ).toFixed(2);

        setMetrics((prev) => ({
          ...prev,
          renderTime,
          totalTime,
        }));

        renderStartTime.current = null;
      });
    }
  }, [graphData, metrics.loadTime]);

  useEffect(() => {
    loadDataset(selectedDataset);
  }, [selectedDataset]);

  const handleDatasetChange = (e) => {
    setSelectedDataset(e.target.value);
  };

  const handleViewModeChange = (e) => {
    setViewMode(e.target.value);
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Control Panel */}
      <div
        style={{
          padding: "10px",
          background: "#f0f0f0",
          borderBottom: "1px solid #ccc",
          display: "flex",
          gap: "20px",
          alignItems: "center",
        }}
      >
        <div>
          <strong>Dataset:</strong>
          <select
            value={selectedDataset}
            onChange={handleDatasetChange}
            style={{ marginLeft: "10px", padding: "5px" }}
            disabled={isLoading}
          >
            {Object.keys(SAMPLE_DATASETS).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <strong>View:</strong>
          <select
            value={viewMode}
            onChange={handleViewModeChange}
            style={{ marginLeft: "10px", padding: "5px" }}
          >
            <option value="2D">2D</option>
            <option value="3D">3D</option>
          </select>
        </div>

        {!isLoading && graphData.nodes.length > 0 && (
          <div style={{ fontSize: "12px", color: "#555" }}>
            <strong>Performance:</strong>
            {" | "}
            Load: <strong>{metrics.loadTime}ms</strong> (fetch + parse:{" "}
            {metrics.parseTime}ms)
            {" | "}
            Render: <strong>{metrics.renderTime}ms</strong>
            {" | "}
            Total: <strong>{metrics.totalTime}ms</strong>
            {" | "}
            Nodes: <strong>{metrics.nodeCount}</strong>
            {" | "}
            Edges: <strong>{metrics.edgeCount}</strong>
          </div>
        )}

        {isLoading && <div>Loading...</div>}
      </div>

      {/* Graph Visualization */}
      <div style={{ flex: 1, position: "relative" }}>
        {!isLoading && graphData.nodes.length > 0 && (
          <>
            {viewMode === "2D" && (
              <ForceGraph2D
                ref={fgRef}
                graphData={graphData}
                nodeLabel="id"
                nodeColor={() => "#ff6b6b"}
                nodeRelSize={4}
                linkColor={() => "rgba(100, 100, 100, 0.2)"}
                linkWidth={1}
                width={window.innerWidth}
                height={window.innerHeight - 60}
              />
            )}
            {viewMode === "3D" && (
              <ForceGraph3D
                ref={fgRef}
                graphData={graphData}
                nodeLabel="id"
                nodeColor={() => "#ff6b6b"}
                nodeRelSize={4}
                linkColor={() => "rgba(100, 100, 100, 0.2)"}
                linkWidth={1}
                width={window.innerWidth}
                height={window.innerHeight - 60}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
