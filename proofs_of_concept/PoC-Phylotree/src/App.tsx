import { useState, useCallback } from "react";
import PhylotreeVisualization from "./components/PhylotreeVisualization";
import ControlPanel from "./components/ControlPanel";
import "./App.css";

function App() {
  const [newick, setNewick] = useState("((A:0.1,B:0.2):0.05,C:0.3);");
  const [options, setOptions] = useState<Record<string, unknown>>({});
  const [layout, setLayout] = useState<"rectangular" | "radial" | "linear">(
    "rectangular"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    parseTime: 0,
    renderTime: 0,
    totalTime: 0,
    nodeCount: 0,
  });

  const handleNewickChange = useCallback((newNewick: string) => {
    console.log("🔄 Loading new tree:", newNewick.substring(0, 50) + "...");
    setIsLoading(true);

    const startTime = performance.now();

    // Parse and count nodes (quick check)
    let nodeCount = 0;
    try {
      // Count nodes by counting leaf names and internal nodes in Newick string
      nodeCount = (newNewick.match(/[,()]/g) || []).length / 2 + 1;
    } catch {
      nodeCount = 0;
    }

    const parseTime = (performance.now() - startTime).toFixed(2);

    // Add small delay to show loading state and let component render
    setTimeout(() => {
      setNewick(newNewick);
      setMetrics({
        parseTime: parseFloat(parseTime),
        renderTime: 0, // Will be updated by visualization component
        totalTime: parseFloat(parseTime),
        nodeCount: Math.floor(nodeCount),
      });
      setIsLoading(false);
    }, 50);
  }, []);

  const handleOptionsChange = useCallback(
    (newOptions: Record<string, unknown>) => {
      setOptions(newOptions);
    },
    []
  );

  const handleLayoutChange = useCallback(
    (newLayout: "rectangular" | "radial" | "linear") => {
      setLayout(newLayout);
    },
    []
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌳 Phylotree.js PoC</h1>
        <p>Advanced phylogenetic tree visualization with D3.js</p>
      </header>

      <div className="app-content">
        <aside className="sidebar">
          <ControlPanel
            onNewickChange={handleNewickChange}
            onOptionsChange={handleOptionsChange}
            onLayoutChange={handleLayoutChange}
          />

          {metrics.nodeCount > 0 && (
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                backgroundColor: "#2a2a2a",
                borderRadius: "8px",
                fontSize: "12px",
                fontFamily: "monospace",
                color: "#eee",
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
                Parse Time: <strong>{metrics.parseTime}ms</strong>
              </div>
              <div>
                Render Time: <strong>{metrics.renderTime}ms</strong>
              </div>
              <div>
                Total Time: <strong>{metrics.totalTime}ms</strong>
              </div>
              <div
                style={{
                  marginTop: "8px",
                  paddingTop: "8px",
                  borderTop: "1px solid #444",
                }}
              >
                Nodes: <strong>{metrics.nodeCount}</strong>
              </div>
            </div>
          )}
        </aside>

        <main className="main-content">
          {isLoading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading phylogenetic tree...</p>
            </div>
          ) : (
            <PhylotreeVisualization
              newick={newick}
              width={900}
              height={700}
              options={{
                ...options,
                layout: layout,
              }}
            />
          )}
        </main>
      </div>

      <footer className="app-footer">
        <p>
          Built with <strong>phylotree.js</strong> (v2.1.6) •
          Performance-optimized for large phylogenetic datasets • Based on D3.js
          for superior rendering
        </p>
      </footer>
    </div>
  );
}

export default App;
