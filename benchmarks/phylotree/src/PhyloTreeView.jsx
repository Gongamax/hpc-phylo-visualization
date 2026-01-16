import { useEffect, useId, useRef, useState } from "react";
import * as d3 from "d3";
import { phylotree } from "phylotree";
import "phylotree/dist/phylotree.css";

const DATASETS = [
  {
    key: "sim-1k",
    label: "Phylo: Simulated 1K",
    path: "/data/simulated/ete3/tree_1k.newick",
  },
  {
    key: "sim-3k",
    label: "Phylo: Simulated 3K",
    path: "/data/simulated/ete3/tree_3k.newick",
  },
  {
    key: "sim-10k",
    label: "Phylo: Simulated 10K",
    path: "/data/simulated/ete3/tree_10k.newick",
  },
  {
    key: "sim-30k",
    label: "Phylo: Simulated 30K",
    path: "/data/simulated/ete3/tree_30k.newick",
  },
  {
    key: "sim-50k",
    label: "Phylo: Simulated 50K",
    path: "/data/simulated/ete3/tree_50k.newick",
  },
  {
    key: "sim-200k",
    label: "Phylo: Simulated 200K",
    path: "/data/simulated/ete3/tree_200k.newick",
  },
  {
    key: "sim-500k",
    label: "Phylo: Simulated 500K",
    path: "/data/simulated/ete3/tree_500k.newick",
  },
  {
    key: "clostridium-upgma",
    label: "Phylo: Clostridium UPGMA",
    path: "/data/enterobase/clostridium/clostridium-upgma-tree.nwk",
  },
  {
    key: "clostridium-goe",
    label: "Phylo: Clostridium goeBURST",
    path: "/data/enterobase/clostridium/clostridium_tree_goeburst.nwk",
  },
  {
    key: "salmonella-100k",
    label: "Phylo: Salmonella 100K",
    path: "/data/enterobase/salmonella/salmonella-100k-sample-tree.nwk",
  },
  {
    key: "vibrio-upgma",
    label: "Phylo: Vibrio UPGMA",
    path: "/data/enterobase/vibrio/vibrio-upgma-tree.nwk",
  },
  {
    key: "vibrio-goe",
    label: "Phylo: Vibrio goeBURST",
    path: "/data/enterobase/vibrio/vibrio_tree_goeburst.nwk",
  },
  {
    key: "coli-mlst",
    label: "Phylo: C. coli MLST",
    path: "/data/pubmlst/campylobacter_coli/coli-MLST_tree.newick",
  },
  {
    key: "coli-cgmlst",
    label: "Phylo: C. coli cgMLST",
    path: "/data/pubmlst/campylobacter_coli/coli-cgMLST-tree.nwk",
  },
  {
    key: "hinf-mlst",
    label: "Phylo: H. influenzae MLST",
    path: "/data/pubmlst/haemophilus_influenzae/haemophilus_influenzae-MLST_tree.newick",
  },
  {
    key: "hinf-cgmlst",
    label: "Phylo: H. influenzae cgMLST (2)",
    path: "/data/pubmlst/haemophilus_influenzae/haemophilus_influenzae-cgmlst-tree.nwk",
  },
  {
    key: "neisseria-mlst",
    label: "Phylo: Neisseria MLST",
    path: "/data/pubmlst/neisseria/neisseria-MLST_tree.newick",
  },
  {
    key: "neisseria-cgmlst",
    label: "Phylo: Neisseria cgMLST",
    path: "/data/pubmlst/neisseria/neisseria-cgmlst-tree.nwk",
  },
  {
    key: "saureus-cgmlst",
    label: "Phylo: S. aureus cgMLST",
    path: "/data/pubmlst/staphylococcus_aureus/staphylococcus-cgMLST_tree.newick",
  },
  {
    key: "saureus-nj",
    label: "Phylo: S. aureus NJ",
    path: "/data/pubmlst/staphylococcus_aureus/staphylococcus-nj-tree.nwk",
  },
  {
    key: "saureus-mlst",
    label: "Phylo: S. aureus MLST",
    path: "/data/pubmlst/staphylococcus_aureus/staphylococus-MLST_tree.newick",
  },
  {
    key: "spneu-mlst",
    label: "Phylo: S. pneumoniae MLST",
    path: "/data/pubmlst/streptococcus_pneumoniae/pneumoniae-MLST_tree.newick",
  },
  {
    key: "spneu-full",
    label: "Phylo: S. pneumoniae",
    path: "/data/pubmlst/streptococcus_pneumoniae/pneuomoniae-cgmlst-tree.nwk",
  },
];

export function PhyloTreeView() {
  const containerId = `phylotree-container-${useId().replace(/:/g, "_")}`;
  const radialRef = useRef(null);
  const metricsRef = useRef(null);
  const [datasetKey, setDatasetKey] = useState(DATASETS[0].key);

  useEffect(() => {
    // phylotree expects d3 on window
    if (!window.d3) {
      window.d3 = d3;
    }

    const el = radialRef.current;
    if (!el) return () => {};

    el.innerHTML = "";

    const { width = 800, height = 600 } = el.getBoundingClientRect();

    const runOnce = async (key) => {
      const ds = DATASETS.find((d) => d.key === key) || DATASETS[0];
      const tFetch0 = performance.now();
      const res = await fetch(`${ds.path}?nocache=${performance.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
      const newick = await res.text();
      const tFetch1 = performance.now();

      el.innerHTML = "";
      const t0 = performance.now();
      const tree = new phylotree(newick);
      const t1 = performance.now();

      tree.render({
        container: `#${containerId}`,
        width: width || 800,
        height: height || 600,
        "font-size": 12,
        zoom: false,
      });

      tree.display.radial(true).update();

      const displayNode = tree.display.show?.();
      if (displayNode) {
        el.append(displayNode);
      }

      // Wait for browser to complete layout and paint (double-RAF trick)
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });

      const t2 = performance.now();
      const parseMs = t1 - t0;
      const renderMs = t2 - t1;
      const totalMs = t2 - tFetch0;

      // Count nodes - fallback to counting from newick if API doesn't work
      let nodes = 0;
      if (tree.get_nodes) {
        const n = tree.get_nodes();
        nodes = Array.isArray(n) ? n.length : 0;
      }
      if (nodes === 0) {
        // Count leaves from newick (commas + 1), estimate total nodes for binary tree
        const leaves = (newick.match(/,/g) || []).length + 1;
        nodes = leaves * 2 - 1;
      }
      const edges = nodes > 0 ? nodes - 1 : 0;

      if (metricsRef.current) {
        metricsRef.current.textContent = `Dataset: ${
          ds.label
        } | Nodes: ${nodes} | Edges: ${edges} | Fetch: ${(
          tFetch1 - tFetch0
        ).toFixed(2)}ms | Parse: ${parseMs.toFixed(
          2
        )}ms | Render: ${renderMs.toFixed(2)}ms | Total: ${totalMs.toFixed(
          2
        )}ms`;
      }

      return {
        dataset: ds.label,
        nodes,
        edges,
        fetch: tFetch1 - tFetch0,
        parse: parseMs,
        render: renderMs,
        total: totalMs,
      };
    };

    window.__runPhylotreeBenchmark = (key) => runOnce(key ?? datasetKey);

    // Signal when component is ready for benchmarking
    window.__phylotreeReady = new Promise((resolve) => {
      runOnce(datasetKey)
        .then(() => resolve())
        .catch((err) => {
          console.error("phylotree render failed", err);
          if (metricsRef.current) {
            metricsRef.current.textContent = err.message || "Render failed";
          }
          resolve();
        });
    });

    return () => {
      el.innerHTML = "";
    };
  }, [containerId, datasetKey]);

  const sharedStyle = {
    width: "100%",
    minHeight: 600,
    border: "1px solid #ddd",
    padding: 8,
    marginBottom: 12,
  };

  return (
    <div>
      <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
        <select
          value={datasetKey}
          onChange={(e) => setDatasetKey(e.target.value)}
          style={{ padding: "4px 6px" }}
        >
          {DATASETS.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => window.__runPhylotreeBenchmark?.(datasetKey)}
          style={{ padding: "4px 10px" }}
        >
          Render & Measure
        </button>
      </div>
      <div
        id={containerId}
        ref={radialRef}
        className="tree-widget"
        style={sharedStyle}
      />
      <div
        ref={metricsRef}
        style={{ fontFamily: "monospace", fontSize: 13, marginTop: 6 }}
      />
    </div>
  );
}
