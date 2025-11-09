# Dataset Collection for Phylogenetic Visualization Evaluation

This directory contains the datasets, metadata, and derived phylogenetic trees used for testing and benchmarking visualization libraries (e.g., Phylotree.js, PhyD3, Phyloscape, Graph.gl).

All data used in this project is **publicly available** from reputable biological databases such as **PubMLST** and **EnteroBase**. No proprietary or private data is included.

---

## Dataset Overview

| Dataset                 | Source                                                                 | Date Downloaded | Typing Scheme         | #Profiles | #Nodes                      | #Edges | Notes                                            |
| ----------------------- | ---------------------------------------------------------------------- | --------------- | --------------------- | --------- | --------------------------- | ------ | ------------------------------------------------ |
| _Salmonella enterica_   | [EnteroBase](https://enterobase.warwick.ac.uk/species/index/senterica) | 2025-03-01      | cgMLST                | 330k      | variable subsets (10k–100k) | —      | Used for scalability benchmarking.               |
| _Escherichia coli_      | [EnteroBase](https://enterobase.warwick.ac.uk/species/index/ecoli)     | 2025-03-01      | cgMLST                | 300k      | variable subsets            | —      | Dataset used in interaction performance tests.   |
| _Klebsiella pneumoniae_ | [PubMLST](https://pubmlst.org/organisms/klebsiella-pneumoniae)         | 2025-03-02      | MLST                  | 8,000     | 8k                          | —      | Used to test metadata overlay features.          |
| Simulated Dataset       | —                                                                      | —               | synthetic (MLST-like) | 50k       | 50k                         | —      | Used to test layout scaling and HPC integration. |

---

## ⚙️ Data Generation Notes

All distance matrices were generated using Hamming distance on allele profiles.  
Phylogenetic trees were inferred using distance-based methods (Neighbor-Joining, goeBURST) and exported in **Newick** format.

Each Newick file represents a pre-processed tree that can be directly loaded into visualization frameworks for rendering and scalability experiments.

The tool used for tree generation and distance calculation is [phylolib](https://github.com/Luanab/phylolib).

---

## 🔗 Citation & Usage

When using these datasets, please cite the original data sources:

- Jolley et al., _PubMLST: Bacterial Population Genomics in the Post-Genomic Era_, Microbial Genomics, 2018.
- Zhou et al., _EnteroBase: Hierarchical and Scalable Population Structure Analysis of Enteric Pathogens_, Nucleic Acids Research, 2020.

---

## ⚠️ Disclaimer

This repository **does not redistribute raw data** from PubMLST or EnteroBase.  
Only derived and lightweight representations (e.g., distance matrices, Newick trees, metadata summaries) are included for reproducibility and visualization testing.
