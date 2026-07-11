import { useEffect, useId, useRef, useState } from "react";
import * as d3 from "d3";
import { phylotree } from "phylotree";
import "phylotree/dist/phylotree.css";

const DATASETS = [
  ["sim-1k", "Phylo: Simulated 1K", "/data/simulated/ete3/tree_1k.newick"],
  ["sim-3k", "Phylo: Simulated 3K", "/data/simulated/ete3/tree_3k.newick"],
  ["sim-10k", "Phylo: Simulated 10K", "/data/simulated/ete3/tree_10k.newick"],
  ["sim-30k", "Phylo: Simulated 30K", "/data/simulated/ete3/tree_30k.newick"],
  ["sim-50k", "Phylo: Simulated 50K", "/data/simulated/ete3/tree_50k.newick"],
  ["sim-200k", "Phylo: Simulated 200K", "/data/simulated/ete3/tree_200k.newick"],
  ["sim-500k", "Phylo: Simulated 500K", "/data/simulated/ete3/tree_500k.newick"],
  [
    "clostridium-upgma",
    "Phylo: Clostridium UPGMA",
    "/data/enterobase/clostridium/clostridium-upgma-tree.nwk",
  ],
  [
    "clostridium-goe",
    "Phylo: Clostridium goeBURST",
    "/data/enterobase/clostridium/clostridium_tree_goeburst.nwk",
  ],
  [
    "salmonella-100k",
    "Phylo: Salmonella 100K",
    "/data/enterobase/salmonella/salmonella-100k-sample-tree.nwk",
  ],
  [
    "vibrio-upgma",
    "Phylo: Vibrio UPGMA",
    "/data/enterobase/vibrio/vibrio-upgma-tree.nwk",
  ],
  [
    "vibrio-goe",
    "Phylo: Vibrio goeBURST",
    "/data/enterobase/vibrio/vibrio_tree_goeburst.nwk",
  ],
  [
    "coli-mlst",
    "Phylo: C. coli MLST",
    "/data/pubmlst/campylobacter_coli/coli-MLST_tree.newick",
  ],
  [
    "coli-cgmlst",
    "Phylo: C. coli cgMLST",
    "/data/pubmlst/campylobacter_coli/coli-cgMLST-tree.nwk",
  ],
  [
    "hinf-mlst",
    "Phylo: H. influenzae MLST",
    "/data/pubmlst/haemophilus_influenzae/haemophilus_influenzae-MLST_tree.newick",
  ],
  [
    "hinf-cgmlst",
    "Phylo: H. influenzae cgMLST",
    "/data/pubmlst/haemophilus_influenzae/haemophilus_influenzae-cgmlst-tree.nwk",
  ],
  [
    "neisseria-mlst",
    "Phylo: Neisseria MLST",
    "/data/pubmlst/neisseria/neisseria-MLST_tree.newick",
  ],
  [
    "neisseria-cgmlst",
    "Phylo: Neisseria cgMLST",
    "/data/pubmlst/neisseria/neisseria-cgmlst-tree.nwk",
  ],
  [
    "saureus-cgmlst",
    "Phylo: S. aureus cgMLST",
    "/data/pubmlst/staphylococcus_aureus/staphylococcus-cgMLST_tree.newick",
  ],
  [
    "saureus-nj",
    "Phylo: S. aureus NJ",
    "/data/pubmlst/staphylococcus_aureus/staphylococcus-nj-tree.nwk",
  ],
  [
    "saureus-mlst",
    "Phylo: S. aureus MLST",
    "/data/pubmlst/staphylococcus_aureus/staphylococus-MLST_tree.newick",
  ],
  [
    "spneu-mlst",
    "Phylo: S. pneumoniae MLST",
    "/data/pubmlst/streptococcus_pneumoniae/pneumoniae-MLST_tree.newick",
  ],
  [
    "spneu-full",
    "Phylo: S. pneumoniae",
    "/data/pubmlst/streptococcus_pneumoniae/pneuomoniae-cgmlst-tree.nwk",
  ],
];

const DEFAULT_DATASET = DATASETS[0][0];

function findDataset(key) {
  return DATASETS.find(([datasetKey]) => datasetKey === key) ?? DATASETS[0];
}

function estimateNodeCount(tree, newick) {
  const nodes = tree.get_nodes?.();
  if (Array.isArray(nodes) && nodes.length > 0) return nodes.length;

  const leaves = (newick.match(/,/g) || []).length + 1;
  return leaves * 2 - 1;
}

function formatMetrics(metrics) {
  if (!metrics) return "Rendering...";
  return [
    `Dataset: ${metrics.dataset}`,
    `Nodes: ${metrics.nodes}`,
    `Edges: ${metrics.edges}`,
    `Fetch: ${metrics.fetch.toFixed(2)}ms`,
    `Parse: ${metrics.parse.toFixed(2)}ms`,
    `Render: ${metrics.render.toFixed(2)}ms`,
    `Total: ${metrics.total.toFixed(2)}ms`,
  ].join(" | ");
}

async function waitForPaint() {
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

export function PhyloTreeView() {
  const containerId = `phylotree-${useId().replace(/:/g, "_")}`;
  const treeEl = useRef(null);
  const [datasetKey, setDatasetKey] = useState(DEFAULT_DATASET);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    window.d3 = window.d3 ?? d3;

    async function run(dataset = datasetKey) {
      const [, label, path] = findDataset(dataset);
      const el = treeEl.current;
      if (!el) throw new Error("Phylotree container is not mounted");

      setError("");
      setMetrics(null);
      el.innerHTML = "";

      const totalStart = performance.now();
      const fetchStart = performance.now();
      const response = await fetch(`${path}?t=${Date.now()}`, {
        cache: "no-store",
      });
      const newick = await response.text();
      const fetchMs = performance.now() - fetchStart;

      const parseStart = performance.now();
      const tree = new phylotree(newick);
      const parseMs = performance.now() - parseStart;

      const { width = 1200, height = 800 } = el.getBoundingClientRect();
      const renderStart = performance.now();
      tree.render({
        container: `#${containerId}`,
        width: Math.max(width, 800),
        height: Math.max(height, 600),
        "font-size": 12,
        zoom: false,
      });
      tree.display.radial(true).update();

      const displayNode = tree.display.show?.();
      if (displayNode) el.append(displayNode);
      await waitForPaint();

      const nodeCount = estimateNodeCount(tree, newick);
      const nextMetrics = {
        dataset: label,
        nodes: nodeCount,
        edges: Math.max(0, nodeCount - 1),
        fetch: fetchMs,
        parse: parseMs,
        render: performance.now() - renderStart,
        total: performance.now() - totalStart,
      };

      window.__lastPhylotreeMetrics = nextMetrics;
      setMetrics(nextMetrics);
      return nextMetrics;
    }

    window.__runPhylotreeBenchmark = run;
    window.__phylotreeReady = run().catch((runError) => {
      console.error(runError);
      setError(runError.message);
    });

    return () => {
      if (treeEl.current) treeEl.current.innerHTML = "";
    };
  }, [containerId, datasetKey]);

  return (
    <>
      <form className="toolbar" onSubmit={(event) => event.preventDefault()}>
        <label>
          Dataset
          <select
            value={datasetKey}
            onChange={(event) => setDatasetKey(event.target.value)}
          >
            {DATASETS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => window.__runPhylotreeBenchmark?.()}>
          Render
        </button>
        <output>{error || formatMetrics(metrics)}</output>
      </form>
      <main id={containerId} ref={treeEl} className="tree-frame" />
    </>
  );
}
