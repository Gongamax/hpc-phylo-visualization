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

  const handleNewickChange = useCallback((newNewick: string) => {
    console.log("🔄 Loading new tree:", newNewick.substring(0, 50) + "...");
    setIsLoading(true);

    // Add small delay to show loading state
    setTimeout(() => {
      setNewick(newNewick);
      setIsLoading(false);
    }, 100);
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
