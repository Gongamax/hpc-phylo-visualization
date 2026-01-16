import React from "react";

interface ControlPanelProps {
  nodeCount: number;
  edgeCount: number;
  showMST: boolean;
  graphType: "random" | "phylogenetic";
  layoutType: "cladogram" | "phylogram" | "circular";
  onNodeCountChange: (count: number) => void;
  onEdgeCountChange: (count: number) => void;
  onShowMSTChange: (show: boolean) => void;
  onGraphTypeChange: (type: "random" | "phylogenetic") => void;
  onLayoutTypeChange: (type: "cladogram" | "phylogram" | "circular") => void;
  onGenerateGraph: () => void;
  onLoadNewick: (newick: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  nodeCount,
  edgeCount,
  showMST,
  graphType,
  layoutType,
  onNodeCountChange,
  onEdgeCountChange,
  onShowMSTChange,
  onGraphTypeChange,
  onLayoutTypeChange,
  onGenerateGraph,
  onLoadNewick,
}) => {
  const maxEdges = Math.min(
    Math.floor((nodeCount * (nodeCount - 1)) / 2),
    nodeCount * 10 // Reasonable edge limit for performance
  );

  // Smart edge density calculation for large graphs
  const suggestedEdgeCount = Math.min(
    nodeCount * 3, // 3x nodes for reasonable density
    maxEdges
  );

  return (
    <div className="control-panel">
      <h3>Graph Controls</h3>

      <div className="control-group">
        <label htmlFor="graph-type">Graph Type:</label>
        <select
          id="graph-type"
          value={graphType}
          onChange={(e) =>
            onGraphTypeChange(e.target.value as "random" | "phylogenetic")
          }
          className="graph-type-selector"
        >
          <option value="random">Random Graph</option>
          <option value="phylogenetic">Phylogenetic Tree</option>
        </select>
      </div>

      {graphType === "phylogenetic" && (
        <div className="control-group">
          <label htmlFor="layout-type">Tree Layout:</label>
          <select
            id="layout-type"
            value={layoutType}
            onChange={(e) =>
              onLayoutTypeChange(
                e.target.value as "cladogram" | "phylogram" | "circular"
              )
            }
            className="layout-type-selector"
          >
            <option value="cladogram">Cladogram (topology)</option>
            <option value="phylogram">Phylogram (branch lengths)</option>
            <option value="circular">Circular Tree</option>
          </select>
        </div>
      )}

      {graphType === "phylogenetic" && (
        <>
          <div className="custom-newick">
            <h4>Import Your Own Dataset</h4>
            <textarea
              className="newick-input"
              placeholder="Paste your Newick format tree here...&#10;Example: ((species1:0.1,species2:0.2):0.05,species3:0.3);"
              rows={4}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value && (value.includes("(") || value.includes(";"))) {
                  console.log(
                    "Loading Newick from textarea:",
                    value.substring(0, 50) + "..."
                  );
                  onLoadNewick(value);
                }
              }}
              onKeyDown={(e) => {
                // Also allow Enter to trigger loading
                if (e.key === "Enter" && e.ctrlKey) {
                  const value = (e.target as HTMLTextAreaElement).value.trim();
                  if (value && (value.includes("(") || value.includes(";"))) {
                    console.log(
                      "Loading Newick with Ctrl+Enter:",
                      value.substring(0, 50) + "..."
                    );
                    onLoadNewick(value);
                  }
                }
              }}
            />
            <div className="input-hint">
              💡 Supports trees with thousands of species! Paste your Newick
              string and press Ctrl+Enter or click outside the text area to
              load.
            </div>
          </div>

          <div className="phylo-samples">
            <h4>Sample Datasets</h4>
            <div className="sample-buttons">
              <button
                className="sample-btn small"
                onClick={() => {
                  const newick = "((A:0.1,B:0.2):0.05,C:0.3);";
                  console.log("Loading simple sample:", newick);
                  onLoadNewick(newick);
                }}
              >
                Simple (3 species)
              </button>
              <button
                className="sample-btn small"
                onClick={() =>
                  onLoadNewick(
                    "((human:0.1,chimp:0.1):0.05,(mouse:0.2,rat:0.15):0.1);"
                  )
                }
              >
                Mammals (4 species)
              </button>
              <button
                className="sample-btn medium"
                onClick={() =>
                  onLoadNewick(
                    "(((((human:0.002,chimp:0.002):0.001,bonobo:0.003):0.008,gorilla:0.011):0.015,orangutan:0.026):0.030,((gibbon_siamang:0.008,gibbon_lar:0.008):0.036,gibbon_agile:0.044):0.012):0.0;"
                  )
                }
              >
                Primates (15 species)
              </button>
              <button
                className="sample-btn large"
                onClick={() =>
                  onLoadNewick(
                    "((((((human:0.1,chimp:0.1):0.05,(gorilla:0.15,orangutan:0.15):0.05):0.1,((mouse:0.2,rat:0.18):0.02,(rabbit:0.22,guinea_pig:0.20):0.02):0.15):0.2,(((dog:0.25,wolf:0.23):0.02,(fox:0.27,coyote:0.25):0.02):0.05,((cat:0.30,tiger:0.28):0.02,(lion:0.29,leopard:0.31):0.02):0.05):0.1):0.3,((((cow:0.35,sheep:0.33):0.03,(goat:0.34,pig:0.36):0.03):0.1,((horse:0.40,donkey:0.38):0.02,(zebra:0.39,rhino:0.45):0.05):0.08):0.2,(((elephant:0.50,mammoth:0.48):0.05,(manatee:0.55,dugong:0.53):0.05):0.15,((whale:0.60,dolphin:0.58):0.03,(porpoise:0.59,orca:0.61):0.03):0.12):0.1):0.1):0.4,(((((chicken:0.70,turkey:0.68):0.05,(duck:0.72,goose:0.71):0.05):0.1,((eagle:0.80,hawk:0.78):0.03,(falcon:0.79,vulture:0.82):0.03):0.08):0.2,((penguin:0.90,albatross:0.88):0.05,(pelican:0.89,cormorant:0.91):0.05):0.15):0.3,(((salmon:1.0,trout:0.98):0.05,(tuna:1.05,mackerel:1.03):0.05):0.2,((shark:1.2,ray:1.18):0.1,(cod:1.1,herring:1.08):0.08):0.15):0.25):0.1);"
                  )
                }
              >
                Vertebrates (50+ species)
              </button>
            </div>
            <div className="massive-samples">
              <h5>🚀 Massive Scale Datasets</h5>
              <div className="massive-buttons">
                <button
                  className="sample-btn massive"
                  onClick={() => {
                    // Import the function properly
                    import("../utils/mst").then(({ sampleNewickTrees }) => {
                      onLoadNewick(sampleNewickTrees.massive);
                    });
                  }}
                >
                  Research Scale (150 species)
                </button>
                <button
                  className="sample-btn massive"
                  onClick={() => {
                    import("../utils/mst").then(({ sampleNewickTrees }) => {
                      onLoadNewick(sampleNewickTrees.phylogenomics);
                    });
                  }}
                >
                  Phylogenomics (500 species)
                </button>
                <button
                  className="sample-btn extreme"
                  onClick={() => {
                    import("../utils/mst").then(({ sampleNewickTrees }) => {
                      onLoadNewick(sampleNewickTrees.tree_of_life);
                    });
                  }}
                >
                  Tree of Life (1000 species) 🌳
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {graphType === "random" && (
        <>
          <div className="control-group">
            <label htmlFor="node-count">
              Number of Nodes: {nodeCount.toLocaleString()}
            </label>
            <input
              id="node-count"
              type="range"
              min="3"
              max="10000"
              step={nodeCount < 100 ? "1" : nodeCount < 1000 ? "10" : "100"}
              value={nodeCount}
              onChange={(e) => onNodeCountChange(parseInt(e.target.value))}
            />
            <div className="range-labels">
              <span>3</span>
              <span>Small (100)</span>
              <span>Medium (1K)</span>
              <span>Large (10K)</span>
            </div>
          </div>

          <div className="control-group">
            <label htmlFor="edge-count">
              Number of Edges: {edgeCount.toLocaleString()}
              {nodeCount > 1000 && (
                <span className="suggestion">
                  {" "}
                  (suggested: {suggestedEdgeCount.toLocaleString()})
                </span>
              )}
            </label>
            <input
              id="edge-count"
              type="range"
              min={nodeCount - 1}
              max={maxEdges}
              step={edgeCount < 1000 ? "1" : edgeCount < 10000 ? "10" : "100"}
              value={Math.min(edgeCount, maxEdges)}
              onChange={(e) => onEdgeCountChange(parseInt(e.target.value))}
            />
            <div className="range-labels">
              <span>{(nodeCount - 1).toLocaleString()}</span>
              <span>Sparse</span>
              <span>Dense</span>
              <span>Max</span>
            </div>
          </div>
        </>
      )}

      {nodeCount > 1000 && (
        <div className="performance-warning">
          ⚠️ Large graphs may impact performance. Consider using &quot;Show MST
          Only&quot; for better performance.
        </div>
      )}

      <div className="control-group">
        <label>
          <input
            type="checkbox"
            checked={showMST}
            onChange={(e) => onShowMSTChange(e.target.checked)}
          />
          Show MST Only {nodeCount > 1000 && "(Recommended for large graphs)"}
        </label>
      </div>

      <button className="generate-button" onClick={onGenerateGraph}>
        Generate New Graph
      </button>

      <div className="quick-presets">
        <h4>Quick Presets</h4>
        <div className="preset-buttons">
          <button
            className="preset-btn"
            onClick={() => {
              onNodeCountChange(100);
              onEdgeCountChange(200);
            }}
          >
            Small (100 nodes)
          </button>
          <button
            className="preset-btn"
            onClick={() => {
              onNodeCountChange(1000);
              onEdgeCountChange(2000);
            }}
          >
            Medium (1K nodes)
          </button>
          <button
            className="preset-btn"
            onClick={() => {
              onNodeCountChange(5000);
              onEdgeCountChange(10000);
            }}
          >
            Large (5K nodes)
          </button>
          <button
            className="preset-btn"
            onClick={() => {
              onNodeCountChange(10000);
              onEdgeCountChange(20000);
            }}
          >
            Extreme (10K nodes)
          </button>
        </div>
      </div>

      <div className="info-section">
        <h4>About MST</h4>
        <p>
          The Minimum Spanning Tree (MST) connects all nodes with the minimum
          total edge weight. Red edges show the MST. This implementation uses
          Kruskal&apos;s algorithm with performance optimizations for large
          graphs.
        </p>
      </div>
    </div>
  );
};

export default ControlPanel;
