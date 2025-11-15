import NgraphGenerators from "ngraph.generators";

import lesGraph from "./les-miserable.json";
import randomGraphGenerator from "./random-graph-generator";

// Function to load phylogenetic tree from CSV edgelist
const loadPhylogeneticTree = async (csvPath) => {
  try {
    const response = await fetch(csvPath);
    const text = await response.text();
    const lines = text.trim().split("\n");
    const edges = [];
    const nodeSet = new Set();

    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const [source, target] = lines[i].split(",");
      if (source && target) {
        nodeSet.add(source);
        nodeSet.add(target);
        edges.push({
          id: i - 1,
          sourceId: source,
          targetId: target,
        });
      }
    }

    const nodes = Array.from(nodeSet).map((id) => ({ id }));
    return { nodes, edges };
  } catch (error) {
    console.error("Error loading phylogenetic tree:", error);
    return { nodes: [], edges: [] };
  }
};

const convertNgraphDataset = (ngraph) => {
  const nodes = [];
  const edges = [];
  ngraph.forEachNode((n) => {
    nodes.push({ id: n.id });
  });
  ngraph.forEachLink((link) => {
    edges.push({
      id: link.id,
      sourceId: link.fromId,
      targetId: link.toId,
    });
  });
  return { nodes, edges };
};

const SAMPLE_GRAPH_DATASETS = {
  "Les Miserable": () => lesGraph,
  "Random (20, 40)": () => randomGraphGenerator(20, 40, "Random (20, 40)"),
  "Random (100, 200)": () =>
    randomGraphGenerator(100, 200, "Random (100, 200)"),
  "Random (1000, 2000)": () =>
    randomGraphGenerator(1000, 2000, "Random (1000, 2000)"),
  "Random (5000, 3000)": () =>
    randomGraphGenerator(5000, 3000, "Random (5000, 3000)"),
  "Phylo: Simulated 1K": () =>
    loadPhylogeneticTree("/data/simulated/ete3/tree_1k_edgelist.csv"),
  "Phylo: Simulated 3K": () =>
    loadPhylogeneticTree("/data/simulated/ete3/tree_3k_edgelist.csv"),
  "Phylo: Simulated 10K": () =>
    loadPhylogeneticTree("/data/simulated/ete3/tree_10k_edgelist.csv"),
  "Phylo: H. influenzae MLST": () =>
    loadPhylogeneticTree(
      "/data/pubmlst/haemophilus_influenzae/haemophilus_influenzae-MLST_tree_edgelist.csv"
    ),
  "Phylo: C. coli MLST": () =>
    loadPhylogeneticTree(
      "/data/pubmlst/campylobacter_coli/coli-MLST_tree_edgelist.csv"
    ),
  "Ladder (10)": () => convertNgraphDataset(NgraphGenerators.ladder(10)),
  "BalancedBinTree (5)": () =>
    convertNgraphDataset(NgraphGenerators.balancedBinTree(5)),
  "BalancedBinTree (8)": () =>
    convertNgraphDataset(NgraphGenerators.balancedBinTree(8)),
  "Grid (10, 10)": () => convertNgraphDataset(NgraphGenerators.grid(10, 10)),
  "WattsStrogatz (100, 10, 0.06)": () =>
    convertNgraphDataset(NgraphGenerators.wattsStrogatz(100, 10, 0.06)),
};

export default SAMPLE_GRAPH_DATASETS;
