import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import ForceGraph3D from "react-force-graph-3d";

const DATASETS = [
  ["Phylo: Simulated 1K", "/data/simulated/ete3/tree_1k_edgelist.csv"],
  ["Phylo: Simulated 3K", "/data/simulated/ete3/tree_3k_edgelist.csv"],
  ["Phylo: Simulated 10K", "/data/simulated/ete3/tree_10k_edgelist.csv"],
  ["Phylo: Simulated 30K", "/data/simulated/ete3/tree_30k_edgelist.csv"],
  ["Phylo: Simulated 50K", "/data/simulated/ete3/tree_50k_edgelist.csv"],
  ["Phylo: Simulated 200K", "/data/simulated/ete3/tree_200k_edgelist.csv"],
  ["Phylo: Simulated 500K", "/data/simulated/ete3/tree_500k_edgelist.csv"],
  [
    "Phylo: Clostridium UPGMA",
    "/data/enterobase/clostridium/clostridium-upgma-tree_edgelist.csv",
  ],
  [
    "Phylo: Clostridium goeBURST",
    "/data/enterobase/clostridium/clostridium_tree_goeburst_edgelist.csv",
  ],
  [
    "Phylo: Salmonella 100K",
    "/data/enterobase/salmonella/salmonella-100k-sample-tree_edgelist.csv",
  ],
  [
    "Phylo: Vibrio UPGMA",
    "/data/enterobase/vibrio/vibrio-upgma-tree_edgelist.csv",
  ],
  [
    "Phylo: Vibrio goeBURST",
    "/data/enterobase/vibrio/vibrio_tree_goeburst_edgelist.csv",
  ],
  [
    "Phylo: C. coli MLST",
    "/data/pubmlst/campylobacter_coli/coli-MLST_tree_edgelist.csv",
  ],
  [
    "Phylo: C. coli cgMLST",
    "/data/pubmlst/campylobacter_coli/coli-cgMLST-tree_edgelist.csv",
  ],
  [
    "Phylo: H. influenzae MLST",
    "/data/pubmlst/haemophilus_influenzae/haemophilus_influenzae-MLST_tree_edgelist.csv",
  ],
  [
    "Phylo: H. influenzae cgMLST",
    "/data/pubmlst/haemophilus_influenzae/haemophilus_influenzae-cgmlst-tree_edgelist.csv",
  ],
  [
    "Phylo: Neisseria MLST",
    "/data/pubmlst/neisseria/neisseria-MLST_tree_edgelist.csv",
  ],
  [
    "Phylo: Neisseria cgMLST",
    "/data/pubmlst/neisseria/neisseria-cgmlst-tree_edgelist.csv",
  ],
  [
    "Phylo: S. aureus cgMLST",
    "/data/pubmlst/staphylococcus_aureus/staphylococcus-cgMLST_tree_edgelist.csv",
  ],
  [
    "Phylo: S. aureus NJ",
    "/data/pubmlst/staphylococcus_aureus/staphylococcus-nj-tree_edgelist.csv",
  ],
  [
    "Phylo: S. aureus MLST",
    "/data/pubmlst/staphylococcus_aureus/staphylococus-MLST_tree_edgelist.csv",
  ],
  [
    "Phylo: S. pneumoniae MLST",
    "/data/pubmlst/streptococcus_pneumoniae/pneumoniae-MLST_tree_edgelist.csv",
  ],
  [
    "Phylo: S. pneumoniae",
    "/data/pubmlst/streptococcus_pneumoniae/pneumoniae-tree_edgelist.csv",
  ],
];

const DEFAULT_DATASET = DATASETS[0][0];
const DEFAULT_MODE = "2D";

function parseEdgeList(text) {
  const parseStart = performance.now();
  const nodes = new Set();
  const links = [];

  for (const line of text.trim().split(/\r?\n/).slice(1)) {
    const [source, target] = line.split(",").map((value) => value.trim());
    if (!source || !target) continue;
    nodes.add(source);
    nodes.add(target);
    links.push({ source, target });
  }

  return {
    graph: { nodes: [...nodes].map((id) => ({ id })), links },
    parseMs: performance.now() - parseStart,
  };
}

async function loadGraph(datasetName) {
  const dataset = DATASETS.find(([label]) => label === datasetName);
  if (!dataset) throw new Error(`Unknown dataset: ${datasetName}`);

  const loadStart = performance.now();
  const response = await fetch(dataset[1], { cache: "no-store" });
  const text = await response.text();
  const loadMs = performance.now() - loadStart;
  const { graph, parseMs } = parseEdgeList(text);

  return { graph, loadMs, parseMs };
}

function formatMetrics(metrics) {
  if (!metrics) return "Loading...";
  return [
    `Nodes: ${metrics.nodes}`,
    `Edges: ${metrics.edges}`,
    `Load: ${metrics.load_ms.toFixed(2)}ms`,
    `Parse: ${metrics.parse_ms.toFixed(2)}ms`,
    `Render: ${metrics.render_ms.toFixed(2)}ms`,
    `Total: ${metrics.total_ms.toFixed(2)}ms`,
  ].join(" | ");
}

export default function App() {
  const [datasetName, setDatasetName] = useState(DEFAULT_DATASET);
  const [mode, setMode] = useState(DEFAULT_MODE);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [metrics, setMetrics] = useState(null);
  const renderStartRef = useRef(0);
  const baseMetricsRef = useRef(null);
  const completedRenderIdRef = useRef(0);
  const renderIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setMetrics(null);
      const totalStart = performance.now();
      const { graph, loadMs, parseMs } = await loadGraph(datasetName);
      if (cancelled) return;

      const renderId = renderIdRef.current + 1;
      renderIdRef.current = renderId;
      baseMetricsRef.current = {
        renderId,
        totalStart,
        load_ms: loadMs,
        parse_ms: parseMs,
        nodes: graph.nodes.length,
        edges: graph.links.length,
      };
      renderStartRef.current = performance.now();
      setGraphData(graph);
    }

    run().catch((error) => {
      console.error(error);
      if (!cancelled) setMetrics({ error: error.message });
    });

    return () => {
      cancelled = true;
    };
  }, [datasetName]);

  const graphSize = useMemo(
    () => ({
      width: window.innerWidth,
      height: Math.max(300, window.innerHeight - 48),
    }),
    []
  );

  function completeRender() {
    const base = baseMetricsRef.current;
    if (!base || completedRenderIdRef.current === base.renderId) return;

    const now = performance.now();
    completedRenderIdRef.current = base.renderId;
    const nextMetrics = {
      ...base,
      render_ms: now - renderStartRef.current,
      total_ms: now - base.totalStart,
    };
    window.__lastForceGraphMetrics = nextMetrics;
    setMetrics(nextMetrics);
  }

  return (
    <main className="fixture">
      <form className="toolbar">
        <label>
          Dataset
          <select
            value={datasetName}
            onChange={(event) => setDatasetName(event.target.value)}
          >
            {DATASETS.map(([label]) => (
              <option key={label}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          Mode
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option>2D</option>
            <option>3D</option>
          </select>
        </label>
        <output>{metrics?.error ?? formatMetrics(metrics)}</output>
      </form>

      {mode === "2D" ? (
        <ForceGraph2D
          graphData={graphData}
          width={graphSize.width}
          height={graphSize.height}
          nodeLabel="id"
          nodeColor={() => "#2563eb"}
          nodeRelSize={3}
          linkColor={() => "rgba(71, 85, 105, 0.35)"}
          linkWidth={0.75}
          cooldownTicks={80}
          onEngineStop={completeRender}
        />
      ) : (
        <ForceGraph3D
          graphData={graphData}
          width={graphSize.width}
          height={graphSize.height}
          nodeLabel="id"
          nodeColor={() => "#2563eb"}
          nodeRelSize={3}
          linkColor={() => "rgba(148, 163, 184, 0.45)"}
          linkWidth={0.75}
          cooldownTicks={80}
          onEngineStop={completeRender}
        />
      )}
    </main>
  );
}
