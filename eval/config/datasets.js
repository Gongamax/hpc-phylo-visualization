import path from "node:path";

const root = (...parts) => path.resolve(import.meta.dirname, "..", "..", ...parts);

export const DATASETS = [
  {
    id: "sim-1k",
    label: "Simulated 1K",
    group: "synthetic",
    benchmarkDefault: true,
    nodes: 1000,
    newickPath: root("data", "simulated", "ete3", "tree_1k.newick"),
    requestStems: ["tree_1k"],
    appLabels: {
      phylotree: "sim-1k",
      forceGraph: "Phylo: Simulated 1K",
      graphgl: "Phylo: Simulated 1K",
    },
  },
  {
    id: "sim-3k",
    label: "Simulated 3K",
    group: "synthetic",
    benchmarkDefault: true,
    nodes: 3000,
    newickPath: root("data", "simulated", "ete3", "tree_3k.newick"),
    requestStems: ["tree_3k"],
    appLabels: {
      phylotree: "sim-3k",
      forceGraph: "Phylo: Simulated 3K",
      graphgl: "Phylo: Simulated 3K",
    },
  },
  {
    id: "sim-10k",
    label: "Simulated 10K",
    group: "synthetic",
    benchmarkDefault: true,
    nodes: 10000,
    newickPath: root("data", "simulated", "ete3", "tree_10k.newick"),
    requestStems: ["tree_10k"],
    appLabels: {
      phylotree: "sim-10k",
      forceGraph: "Phylo: Simulated 10K",
      graphgl: "Phylo: Simulated 10K",
    },
  },
  {
    id: "hinf-mlst",
    label: "H. influenzae MLST",
    group: "real",
    benchmarkDefault: true,
    newickPath: root(
      "data",
      "pubmlst",
      "haemophilus_influenzae",
      "haemophilus_influenzae-mlst-full_goeburst.nwk"
    ),
    requestStems: ["haemophilus_influenzae-MLST_tree"],
    appLabels: {
      phylotree: "hinf-mlst",
      forceGraph: "Phylo: H. influenzae MLST",
      graphgl: "Phylo: H. influenzae MLST",
    },
  },
  {
    id: "clostridium-upgma",
    label: "Clostridium UPGMA",
    group: "real",
    benchmarkDefault: true,
    newickPath: root(
      "data",
      "enterobase",
      "clostridium",
      "clostridium-upgma-tree.nwk"
    ),
    requestStems: ["clostridium-upgma-tree"],
    appLabels: {
      phylotree: "clostridium-upgma",
      forceGraph: "Phylo: Clostridium UPGMA",
      graphgl: "Phylo: Clostridium UPGMA",
    },
  },
  {
    id: "salmonella-10k",
    label: "Salmonella 10K sample",
    group: "incremental-salmonella",
    benchmarkDefault: false,
    nodes: 10000,
    newickPath: root(
      "data",
      "enterobase",
      "salmonella",
      "salmonella_samples_17-03-2026_trees",
      "tree_10000.nwk"
    ),
    requestStems: ["tree_10000"],
    proxyRequestStems: ["tree_1k"],
    appLabels: {},
  },
  {
    id: "salmonella-12_5k",
    label: "Salmonella 12.5K sample",
    group: "incremental-salmonella",
    benchmarkDefault: false,
    nodes: 12500,
    newickPath: root(
      "data",
      "enterobase",
      "salmonella",
      "salmonella_samples_17-03-2026_trees",
      "tree_12500.nwk"
    ),
    requestStems: ["tree_12500"],
    proxyRequestStems: ["tree_1k"],
    appLabels: {},
  },
  {
    id: "salmonella-25k",
    label: "Salmonella 25K sample",
    group: "incremental-salmonella",
    benchmarkDefault: false,
    nodes: 25000,
    newickPath: root(
      "data",
      "enterobase",
      "salmonella",
      "salmonella_samples_17-03-2026_trees",
      "tree_25000.nwk"
    ),
    requestStems: ["tree_25000"],
    proxyRequestStems: ["tree_1k"],
    appLabels: {},
  },
  {
    id: "salmonella-37_5k",
    label: "Salmonella 37.5K sample",
    group: "incremental-salmonella",
    benchmarkDefault: false,
    nodes: 37500,
    newickPath: root(
      "data",
      "enterobase",
      "salmonella",
      "salmonella_samples_17-03-2026_trees",
      "tree_37500.nwk"
    ),
    requestStems: ["tree_37500"],
    proxyRequestStems: ["tree_1k"],
    appLabels: {},
  },
  {
    id: "salmonella-50k",
    label: "Salmonella 50K sample",
    group: "incremental-salmonella",
    benchmarkDefault: false,
    nodes: 50000,
    newickPath: root(
      "data",
      "enterobase",
      "salmonella",
      "salmonella_samples_17-03-2026_trees",
      "tree_50000.nwk"
    ),
    requestStems: ["tree_50000"],
    proxyRequestStems: ["tree_1k"],
    appLabels: {},
  },
  {
    id: "salmonella-62_5k",
    label: "Salmonella 62.5K sample",
    group: "incremental-salmonella",
    benchmarkDefault: false,
    nodes: 62500,
    newickPath: root(
      "data",
      "enterobase",
      "salmonella",
      "salmonella_samples_17-03-2026_trees",
      "tree_62500.nwk"
    ),
    requestStems: ["tree_62500"],
    proxyRequestStems: ["tree_1k"],
    appLabels: {},
  },
  {
    id: "salmonella-75k",
    label: "Salmonella 75K sample",
    group: "incremental-salmonella",
    benchmarkDefault: false,
    nodes: 75000,
    newickPath: root(
      "data",
      "enterobase",
      "salmonella",
      "salmonella_samples_17-03-2026_trees",
      "tree_75000.nwk"
    ),
    requestStems: ["tree_75000"],
    proxyRequestStems: ["tree_1k"],
    appLabels: {},
  },
  {
    id: "salmonella-82_5k",
    label: "Salmonella 82.5K sample",
    group: "incremental-salmonella",
    benchmarkDefault: false,
    nodes: 82500,
    newickPath: root(
      "data",
      "enterobase",
      "salmonella",
      "salmonella_samples_17-03-2026_trees",
      "tree_82500.nwk"
    ),
    requestStems: ["tree_82500"],
    proxyRequestStems: ["tree_1k"],
    appLabels: {},
  },
];

for (const dataset of DATASETS) {
  if (dataset.group === "incremental-salmonella") {
    dataset.appLabels = {
      phylotree: "sim-1k",
      forceGraph: "Phylo: Simulated 1K",
      graphgl: "Phylo: Simulated 1K",
    };
  }
}

export function selectDatasets(ids) {
  if (!ids.length) return DATASETS.filter((dataset) => dataset.benchmarkDefault);

  const requested = new Set(ids);
  return DATASETS.filter((dataset) => requested.has(dataset.id));
}
