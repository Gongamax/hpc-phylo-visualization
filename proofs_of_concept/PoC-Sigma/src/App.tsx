import { useState, useEffect, useCallback } from "react";
import GraphVisualization from "./components/GraphVisualization";
import ControlPanel from "./components/ControlPanel";
import {
  generateRandomGraph,
  kruskalMST,
  parseNewick,
  phyloTreeToGraph,
  sampleNewickTrees,
  type Node,
  type Edge,
} from "./utils/mst";
import "./App.css";

function App() {
  const [nodeCount, setNodeCount] = useState(100);
  const [edgeCount, setEdgeCount] = useState(200);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [mstEdges, setMstEdges] = useState<Edge[]>([]);
  const [showMST, setShowMST] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [metrics, setMetrics] = useState({
    graphGenTime: 0,
    mstTime: 0,
    totalTime: 0,
  });
  const [graphType, setGraphType] = useState<"random" | "phylogenetic">(
    "random"
  );
  const [layoutType, setLayoutType] = useState<
    "cladogram" | "phylogram" | "circular"
  >("cladogram");

  const generateGraph = useCallback(async () => {
    setIsGenerating(true);

    // Use setTimeout to allow UI to update with loading state
    setTimeout(() => {
      const startTime = performance.now();
      let newNodes: Node[] = [];
      let newEdges: Edge[] = [];

      if (graphType === "random") {
        const result = generateRandomGraph(nodeCount, edgeCount);
        newNodes = result.nodes;
        newEdges = result.edges;
      } else {
        // For phylogenetic, use a sample tree
        const tree = parseNewick(sampleNewickTrees.mammals);
        const result = phyloTreeToGraph(tree, layoutType);
        newNodes = result.nodes;
        newEdges = result.edges;
      }

      const graphGenTime = performance.now() - startTime;

      const mstStartTime = performance.now();
      const mst = kruskalMST(newNodes, newEdges);
      const mstTime = performance.now() - mstStartTime;

      const totalTime = graphGenTime + mstTime;

      console.log(`Graph generation: ${graphGenTime.toFixed(2)}ms`);
      console.log(`MST computation: ${mstTime.toFixed(2)}ms`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);

      setNodes(newNodes);
      setEdges(newEdges);
      setMstEdges(mst);
      setMetrics({
        graphGenTime: parseFloat(graphGenTime.toFixed(2)),
        mstTime: parseFloat(mstTime.toFixed(2)),
        totalTime: parseFloat(totalTime.toFixed(2)),
      });
      setIsGenerating(false);
    }, 10);
  }, [nodeCount, edgeCount, graphType, layoutType]);

  const handleLoadNewick = useCallback(
    (newick: string) => {
      console.log("🧬 Loading Newick tree...");
      console.log("Input length:", newick.length);
      console.log("First 50 chars:", newick.substring(0, 50));

      setIsGenerating(true);

      // Use longer timeout for large datasets to prevent UI blocking
      const isLargeDataset = newick.length > 10000;
      const isExtremeDataset = newick.length > 50000;
      const timeout = isExtremeDataset ? 200 : isLargeDataset ? 100 : 10;

      setTimeout(() => {
        try {
          const startTime = performance.now();

          if (isExtremeDataset) {
            console.warn(
              `⚠️ Processing extreme dataset (${newick.length} characters). This may take several seconds...`
            );
          } else if (isLargeDataset) {
            console.log("🧬 Processing large phylogenetic dataset...");
          }

          const tree = parseNewick(newick);
          const result = phyloTreeToGraph(tree, layoutType);
          const graphGenTime = performance.now() - startTime;

          const mstStartTime = performance.now();
          const mst = kruskalMST(result.nodes, result.edges);
          const mstTime = performance.now() - mstStartTime;

          const totalTime = graphGenTime + mstTime;

          console.log(
            `Phylogenetic tree parsing: ${graphGenTime.toFixed(2)}ms`
          );
          console.log(`MST computation: ${mstTime.toFixed(2)}ms`);

          setNodes(result.nodes);
          setEdges(result.edges);
          setMstEdges(mst);
          setMetrics({
            graphGenTime: parseFloat(graphGenTime.toFixed(2)),
            mstTime: parseFloat(mstTime.toFixed(2)),
            totalTime: parseFloat(totalTime.toFixed(2)),
          });
          setIsGenerating(false);
        } catch (error) {
          console.error("Error parsing Newick format:", error);
          console.error("Newick input was:", newick.substring(0, 100) + "...");
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          alert(`Error parsing Newick format: ${errorMessage}`);
          setIsGenerating(false);
        }
      }, timeout);
    },
    [layoutType]
  );

  // Generate initial graph
  useEffect(() => {
    generateGraph();
  }, [generateGraph]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Graph Visualization & MST Computation</h1>
        <p>
          A proof of concept for phylogenetic tree visualization with Minimum
          Spanning Tree computation
        </p>
      </header>

      <main className="app-main">
        <div className="app-layout">
          <aside className="sidebar">
            <ControlPanel
              nodeCount={nodeCount}
              edgeCount={edgeCount}
              showMST={showMST}
              graphType={graphType}
              layoutType={layoutType}
              onNodeCountChange={setNodeCount}
              onEdgeCountChange={setEdgeCount}
              onShowMSTChange={setShowMST}
              onGraphTypeChange={setGraphType}
              onLayoutTypeChange={setLayoutType}
              onGenerateGraph={generateGraph}
              onLoadNewick={handleLoadNewick}
            />

            {nodes.length > 0 && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  backgroundColor: "#2a2a2a",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontFamily: "monospace",
                }}
              >
                <div
                  style={{
                    fontWeight: "bold",
                    marginBottom: "10px",
                    fontSize: "14px",
                  }}
                >
                  Performance Metrics
                </div>
                <div>
                  Graph Gen: <strong>{metrics.graphGenTime}ms</strong>
                </div>
                <div>
                  MST Compute: <strong>{metrics.mstTime}ms</strong>
                </div>
                <div>
                  Total: <strong>{metrics.totalTime}ms</strong>
                </div>
                <div
                  style={{
                    marginTop: "8px",
                    paddingTop: "8px",
                    borderTop: "1px solid #444",
                  }}
                >
                  Nodes: <strong>{nodes.length}</strong> | Edges:{" "}
                  <strong>{edges.length}</strong>
                </div>
              </div>
            )}
          </aside>

          <section className="graph-section">
            {isGenerating ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>
                  Generating graph with {nodeCount.toLocaleString()} nodes and{" "}
                  {edgeCount.toLocaleString()} edges...
                </p>
              </div>
            ) : (
              <GraphVisualization
                nodes={nodes}
                edges={edges}
                mstEdges={mstEdges}
                showMST={showMST}
                isPhylogenetic={graphType === "phylogenetic"}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
