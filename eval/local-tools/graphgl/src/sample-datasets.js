export const DATASETS = [
  ["Phylo: Simulated 1K", "/data/simulated/ete3/tree_1k_edgelist.csv"],
  ["Phylo: Simulated 3K", "/data/simulated/ete3/tree_3k_edgelist.csv"],
  ["Phylo: Simulated 10K", "/data/simulated/ete3/tree_10k_edgelist.csv"],
  ["Phylo: Simulated 30K", "/data/simulated/ete3/tree_30k_edgelist.csv"],
  ["Phylo: Simulated 50K", "/data/simulated/ete3/tree_50k_edgelist.csv"],
  ["Phylo: Simulated 200K", "/data/simulated/ete3/tree_200k_edgelist.csv"],
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

export async function loadDataset(datasetName) {
  const dataset = DATASETS.find(([label]) => label === datasetName);
  if (!dataset) throw new Error(`Unknown dataset: ${datasetName}`);

  const response = await fetch(dataset[1], { cache: "no-store" });
  const text = await response.text();
  const nodes = new Set();
  const edges = [];

  for (const [index, line] of text.trim().split(/\r?\n/).slice(1).entries()) {
    const [source, target] = line.split(",").map((value) => value.trim());
    if (!source || !target) continue;
    nodes.add(source);
    nodes.add(target);
    edges.push({ id: index, sourceId: source, targetId: target });
  }

  return {
    nodes: [...nodes].map((id) => ({ id })),
    edges,
  };
}
