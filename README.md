# HPC Phylogenetic Visualization Benchmarking

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 📋 Overview

This repository contains the benchmarking infrastructure and analysis tools developed for my thesis research on **high-performance phylogenetic tree visualization**. The project systematically evaluates and compares multiple web-based visualization libraries for rendering large-scale phylogenetic trees, with datasets ranging from 1,000 to 500,000+ nodes.

### Visualization Libraries Evaluated

| Library            | Technology   | Description                              |
| ------------------ | ------------ | ---------------------------------------- |
| **3d-force-graph** | WebGL/Canvas | Force-directed 2D/3D graph visualization |
| **Cytoscape.js**   | Canvas       | General-purpose graph visualization      |
| **GrapeTree**      | SVG/Canvas   | Phylogenetic tree visualization tool     |
| **PhyloScape**     | WebGL        | High-performance phylogenetic rendering  |
| **Phylotree.js**   | D3.js/SVG    | Interactive phylogenetic tree viewer     |
| **iTOL**           | Web Service  | Online tree annotation and display       |
| **Sigma.js**       | WebGL        | Large-scale graph rendering              |
| **GraphGL**        | WebGL        | GPU-accelerated graph visualization      |
| **phyD3**          | D3.js        | Phylogenetic tree visualization          |

## 🗂️ Repository Structure

```
├── analysis/
│   ├── benchmarks/          # Benchmark analysis & visualization scripts
│   │   ├── visualize_benchmarks.py
│   │   ├── aggregate_benchmarks.py
│   │   └── csv_to_latex.py
│   └── scripts/             # Data processing utilities
│       ├── generate_trees.py        # Synthetic tree generation (ETE3)
│       ├── newick_to_edgelist.py    # Format conversion
│       ├── newick_to_phyloxml.py    # Format conversion
│       └── calculate_dataset_metadata.py
│
├── benchmarks/              # Proof-of-concept implementations
│   ├── force-graph/         # react-force-graph (2D/3D)
│   ├── sigma/               # Sigma.js + Graphology
│   ├── phylotree/           # Phylotree.js
│   ├── graphgl/             # GraphGL
│   ├── phyd3/               # phyD3
│   └── BENCHMARKING_METHODOLOGY.md
│
├── data/                    # Phylogenetic tree datasets
│   ├── enterobase/          # EnteroBase datasets
│   │   ├── clostridium/
│   │   ├── salmonella/
│   │   └── vibrio/
│   ├── pubmlst/             # PubMLST datasets
│   │   ├── campylobacter_coli/
│   │   ├── haemophilus_influenzae/
│   │   ├── neisseria/
│   │   ├── staphylococcus_aureus/
│   │   └── streptococcus_pneumoniae/
│   └── simulated/           # Synthetic trees (ETE3, SimBack)
│
├── datasets/                # Raw dataset files and metadata
│
└── results/                 # Benchmark results and figures
    ├── benchmark_tables/    # CSV results and LaTeX tables
    └── figures/             # Generated visualizations
```

## 📊 Datasets

### Real-World Biological Data

| Dataset               | Typing Method   | Profile Length | Distinct Elements | Source     |
| --------------------- | --------------- | -------------- | ----------------- | ---------- |
| _C. coli_             | MLST            | 7              | 14,862            | PubMLST    |
| _C. coli_             | cgMLST          | 1,350          | 173,810           | PubMLST    |
| _H. influenzae_       | MLST            | 7              | 3,127             | PubMLST    |
| _H. influenzae_       | cgMLST          | 1,047          | 17,852            | PubMLST    |
| _Neisseria_ spp.      | MLST            | 7              | 19,131            | PubMLST    |
| _Neisseria_ spp.      | cgMLST          | 1,660          | 94,497            | PubMLST    |
| _S. aureus_           | MLST            | 7              | 10,660            | PubMLST    |
| _S. aureus_           | cgMLST          | 1,719          | 29,207            | PubMLST    |
| _S. pneumoniae_       | MLST            | 7              | 20,396            | PubMLST    |
| _S. pneumoniae_       | cgMLST          | 1,235          | 101,513           | PubMLST    |
| _Clostridium_ spp.    | cgMLST + HierCC | 2,556          | 27,962            | EnteroBase |
| _Vibrio_ spp.         | cgMLST + HierCC | 1,128          | 17,646            | EnteroBase |
| _Salmonella_ enterica | cgMLST + HierCC | 3,303          | 100,000           | EnteroBase |

> **Note:** All datasets were downloaded on November 5, 2025.

### Simulated Trees

Generated using [ETE3](http://etetoolkit.org/) with random topologies and branch lengths:

- 1K, 3K, 10K, 30K, 50K, 200K, 500K nodes

## 🔬 Benchmarking Methodology

### Metrics

| Metric          | Definition                                |
| --------------- | ----------------------------------------- |
| **Load Time**   | Time to fetch and parse the dataset       |
| **Render Time** | Time from initialization to visual output |
| **Total Time**  | Load + Render (Time-to-Interactive)       |

### Protocol

- **N=7 Median**: Each measurement repeated 7 times, median selected
- **Fresh Page**: Full page refresh between measurements
- **Environment**: Browser (Chrome), OS (macOS), Hardware specs recorded

## 🚀 Getting Started

### Prerequisites

- **Node.js** v16+ (for web-based PoCs)
- **Python** 3.9+ (for analysis scripts)
- **npm** or **yarn**

### Running a Proof-of-Concept

Each PoC is a standalone Vite/React application:

```bash
# Example: Force-Graph PoC
cd benchmarks/force-graph
npm install
npm run dev
# Open http://localhost:5173
```

### Generating Synthetic Trees

```bash
cd analysis/scripts
python generate_trees.py
```

### Converting Newick to Edge List

```bash
python newick_to_edgelist.py input.newick output.csv
```

### Running Benchmark Analysis

```bash
cd analysis/benchmarks
python visualize_benchmarks.py
```

## 📈 Key Results

Performance comparison across datasets (Total Time, lower is better):

| Dataset         | 3d-force-graph | Cytoscape.js | GrapeTree | Phylotree.js |
| --------------- | -------------- | ------------ | --------- | ------------ |
| Simulated 1K    | 10 ms          | 4.80 s       | 657 ms    | 1.69 s       |
| Simulated 10K   | 49 ms          | 29.54 s      | 1.64 s    | 2.47 s       |
| _H. influenzae_ | 17 ms          | 4.92 s       | 1.09 s    | 1.69 s       |
| _S. aureus_     | 67 ms          | 34+ s        | 11.44 s   | 2.99 s       |

> **Finding**: WebGL-based libraries (3d-force-graph) significantly outperform SVG/Canvas alternatives at scale.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Visualization**: D3.js, Three.js, WebGL, Sigma.js, Graphology
- **Analysis**: Python, Pandas, Matplotlib, Seaborn
- **Tree Generation**: ETE3 Toolkit

## 📖 Related Work

- [ETE Toolkit](http://etetoolkit.org/) - Python framework for tree analysis
- [PubMLST](https://pubmlst.org/) - Public databases for molecular typing
- [EnteroBase](https://enterobase.warwick.ac.uk/) - Bacterial genomic epidemiology

## 📝 Citation

If you use this benchmarking framework in your research, please cite:

```bibtex
@thesis{frutuoso2026phyloviz,
  author  = {Gonçalo Frutuoso},
  title   = {High-Performance Phylogenetic Tree Visualization},
  school  = {[ULisboa, Instituto Superior Técnico]},
  year    = {2026}
}
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Author**: Gonçalo Frutuoso  
**Thesis Research** • 2025-2026
