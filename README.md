# Phylo-Lens Evaluation

This repository contains the datasets, adapters, and result-generation scripts
used to evaluate phylogenetic visualization tools for the thesis work around
Phylo-Lens.

The current benchmark code lives in `eval/`. Older proof-of-concept and
benchmarking experiments are not part of the reproducible evaluation path.

## Tools

The automated evaluation harness currently supports:

| Tool | Class | Input |
| --- | --- | --- |
| Phylotree.js | browser library | Newick |
| PhyD3 | browser library | Newick |
| React Force Graph | browser library | edge-list graph |
| GraphGL | browser library | edge-list graph |
| Cytoscape.js | browser graph library | edge-list graph |
| Archaeopteryx.js | browser library | Newick |
| GrapeTree | domain application | Newick |
| Taxonium | domain application | Newick |
| ETE3 | Python static renderer | Newick |
| ggtree | R static renderer | Newick |
| iTOL | web service | Newick batch upload; requires `ITOL_API_KEY` |

Phyloscape and PHYLOViZ still need fair, reproducible adapters before their
results should be mixed into the CSV output.

## Repository Layout

```text
data/                 canonical Newick datasets
datasets/             raw or source dataset material
analysis/scripts/     dataset processing utilities
eval/                 benchmark harness, local adapters, tables, and figures
results/              older generated outputs and external result snapshots
```

The local browser adapters used by `eval/` are under `eval/local-tools/`.

## Running Evaluation

Install dependencies:

```sh
npm --prefix eval install
npm --prefix eval/local-tools/phylotree install
npm --prefix eval/local-tools/phyd3 install
npm --prefix eval/local-tools/force-graph install
npm --prefix eval/local-tools/graphgl install
npm --prefix eval/local-tools/taxonium install
```

Run a browser smoke test:

```sh
cd eval
TOOLS=phylotree,phyd3,force-graph,graphgl,cytoscape,grapetree,taxonium,archaeopteryx \
DATASETS=sim-1k RUNS=1 npm run benchmark
```

Append static renderers to the same result CSV:

```sh
cd eval
APPEND_RESULTS=1 TOOLS=ete3,ggtree DATASETS=sim-1k RUNS=1 npm run benchmark:static
```

Generate tables and figures:

```sh
cd eval
.venv/bin/python tables.py
.venv/bin/python plot.py
```

See `eval/README.md` for the full methodology and command set.

## Outputs

The evaluation harness writes:

```text
eval/results/runs.csv
eval/results/summary.csv
eval/results/environment.csv
eval/results/environment.json
eval/tables/*.csv
eval/tables/*.tex
eval/figures/*.png
```

Keep raw CSVs with the generated environment file when preparing thesis
figures, so the results remain reproducible.
