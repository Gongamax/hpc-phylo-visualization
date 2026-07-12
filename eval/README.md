# Phylogenetic visualization evaluation

The `eval/` directory contains the benchmark harness used to measure
phylogenetic visualization tools across dataset size, dataset family, rendering
technology, and execution mode.

The goal is to produce faithful CSV results, tables, and figures for the thesis,
without mixing benchmark logic into the old proof-of-concept applications under
`benchmarks/`.

## Tools under evaluation

The full comparison set is cataloged in `config/tools.js`:

| Tool | Class | Input | Status |
|------|-------|-------|--------|
| Phylotree.js | browser library | Newick | automated |
| PhyD3 | browser library | Newick | automated |
| React Force Graph | browser library | edge-list graph | automated |
| GraphGL | browser library | edge-list graph | automated |
| Cytoscape.js | browser graph library | edge-list graph | automated |
| GrapeTree | domain application | Newick / profile data | automated |
| Taxonium | browser/domain tool | Newick | automated |
| Archaeopteryx.js | browser library | Newick / phyloXML | automated |
| Phyloscape | browser library | tree / graph | adapter pending |
| PHYLOViZ | domain application | profile / goeBURST data | app protocol pending |
| iTOL | web service | Newick batch upload | API runner; requires key |
| ETE3 | Python static renderer | Newick | automated |
| ggtree | R static renderer | Newick | automated |

The automated runner currently executes only the tools that have a local,
repeatable adapter: Phylotree.js, PhyD3, React Force Graph, GraphGL,
Cytoscape.js, GrapeTree, Taxonium, Archaeopteryx.js, ETE3, and ggtree. iTOL has
a separate batch API runner because it is a web service and needs an
`ITOL_API_KEY` from an active iTOL account. Phyloscape and PHYLOViZ still need a
fair local or online interaction protocol before they should be included in the
CSV results.

## Datasets

Datasets are defined in `config/datasets.js` and use the canonical Newick files
under `data/`.

| Family | Purpose |
|--------|---------|
| Synthetic scale ladder | Controlled scalability tests over increasing node counts |
| Incremental Salmonella samples | Real EnteroBase time/space scaling while controlling organism/source |
| Cross-organism real datasets | Robustness across biological tree shapes and data sources |

The incremental Salmonella ladder currently includes 10K, 12.5K, 25K, 37.5K,
50K, 62.5K, 75K, and 82.5K samples.

Some old PoCs expose only fixed dataset selectors. For those cases, the runner
uses Playwright request interception: it selects a known placeholder dataset in
the UI, then serves the active benchmark dataset from `data/`. The CSV still
records the true dataset id and label.

## Benchmarks

The benchmark harness writes one raw CSV row per run and one summarized median
row per `(tool, dataset)` pair. Warm-up runs are recorded in the raw CSV but
excluded from the summary statistics.

### Scripts

- **`run.js`** — starts each local tool, drives it with Playwright, records
  load/parse/render/total time, validates that something actually rendered, and
  writes raw and summarized CSVs.
- **`datasets.js`** — writes dataset metadata tables from the canonical dataset
  registry and Newick files.
- **`summarize.js`** — rebuilds `results/summary.csv` from `results/runs.csv`.
- **`plot.py`** — creates publication-style figures from the summary CSV.
- **`tables.py`** — creates CSV and LaTeX thesis tables from the summary CSV.

### Metrics

| Column | Meaning |
|--------|---------|
| `load_ms` | Fetch, file load, or app-reported data loading time |
| `parse_ms` | Tree parsing, graph conversion, or initialization time |
| `render_ms` | Time to visual output |
| `total_ms` | End-to-end time-to-visual-output |
| `heap_delta_mb` | Best-effort Chromium JS heap delta for browser tools |
| `phase` | `warmup` or `measured`; summaries include only measured runs |
| `success` | Whether the run completed without an exception |
| `rendered` | Whether the visual artifact was validated as non-empty |
| `failure_kind` | `unsupported`, `timeout`, `parse_error`, `browser_crash`, `render_invalid`, or `runtime_error` |

Browser tools are validated by checking for non-empty SVG or canvas output.
Static renderers are validated through their exported SVG/PDF files and process
timings.

Summaries report median, P25, P75, and IQR columns for load, parse, render,
total, and memory metrics. Median remains the primary reported value; IQR is
included to show measurement stability without overclaiming tail percentiles
from small run counts.

## Running

Install the JavaScript dependencies once:

```sh
npm --prefix eval install
npm --prefix eval/local-tools/phylotree install
npm --prefix eval/local-tools/phyd3 install
npm --prefix eval/local-tools/force-graph install
npm --prefix eval/local-tools/graphgl install
npm --prefix eval/local-tools/taxonium install
```

Run a smoke test:

```sh
cd eval
WARMUP_RUNS=0 TOOLS=phylotree DATASETS=sim-1k RUNS=1 npm run benchmark
WARMUP_RUNS=0 TOOLS=phyd3 DATASETS=sim-1k RUNS=1 npm run benchmark
WARMUP_RUNS=0 TOOLS=cytoscape DATASETS=sim-1k RUNS=1 npm run benchmark
WARMUP_RUNS=0 TOOLS=grapetree DATASETS=sim-1k RUNS=1 npm run benchmark
WARMUP_RUNS=0 TOOLS=taxonium DATASETS=sim-1k RUNS=1 npm run benchmark
WARMUP_RUNS=0 TOOLS=archaeopteryx DATASETS=sim-1k RUNS=1 npm run benchmark
WARMUP_RUNS=0 TOOLS=ete3,ggtree DATASETS=sim-1k RUNS=1 npm run benchmark:static
```

Run the automated browser benchmark set:

```sh
cd eval
WARMUP_RUNS=1 RUNS=7 npm run benchmark
```

Run the incremental Salmonella ladder on the currently automated tools:

```sh
cd eval
TOOLS=phylotree,phyd3,force-graph,graphgl,cytoscape \
DATASETS=salmonella-10k,salmonella-25k,salmonella-50k,salmonella-75k \
RUNS=7 npm run benchmark
```

Run the static-renderer benchmark:

```sh
cd eval
TOOLS=ete3,ggtree DATASETS=sim-1k,sim-3k,salmonella-10k RUNS=7 npm run benchmark:static
```

Append static or service results to an existing browser run:

```sh
cd eval
RUNS=7 npm run benchmark
APPEND_RESULTS=1 TOOLS=ete3,ggtree RUNS=7 npm run benchmark:static
APPEND_RESULTS=1 ITOL_API_KEY=... ITOL_PROJECT=phylolens-eval DATASETS=sim-1k RUNS=1 npm run benchmark:itol
```

Run iTOL through the batch API:

```sh
cd eval
ITOL_API_KEY=... ITOL_PROJECT=phylolens-eval DATASETS=sim-1k RUNS=1 npm run benchmark:itol
```

Generate figures and tables:

```sh
cd eval
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python plot.py
.venv/bin/python tables.py
npm run datasets
```

## Outputs

| File | Contents |
|------|----------|
| `results/runs.csv` | one row per benchmark run |
| `results/summary.csv` | medians and success counts per tool/dataset |
| `results/environment.csv` | OS, CPU, browser, Node, viewport, git commit |
| `results/environment.json` | same environment metadata in JSON |
| `figures/*.png` | generated matplotlib figures |
| `tables/dataset_metadata.csv` | dataset family, size, file format, and source path |
| `tables/dataset_metadata.tex` | LaTeX version of the dataset metadata table |
| `tables/performance_summary.csv` | thesis-ready performance table |
| `tables/performance_summary.tex` | LaTeX version of the performance table |
| `tables/tool_capability.csv` | maximum successful dataset by tool |
| `tables/tool_capability.tex` | LaTeX version of the capability table |

The raw CSV schema is:

```text
iso,tool_id,tool,tool_category,input_format,dataset_id,dataset,dataset_group,
phase,run,success,failure_kind,rendered,render_artifact,nodes,edges,load_ms,parse_ms,
render_ms,total_ms,heap_before_mb,heap_after_mb,heap_delta_mb,metric_source,
browser,node_version,git_commit,viewport_width,viewport_height,
validation_detail,error
```

## Notes

- **Use medians.** Browser benchmarks are noisy because of garbage collection,
  layout, and scheduling. The summary table reports medians, IQRs, and success
  counts.
- **Warm up explicitly.** Browser/static runners default to one warm-up run per
  tool and dataset. Warm-ups remain in `runs.csv` for auditability but are not
  summarized.
- **Do not mix classes blindly.** Browser libraries, full domain applications,
  web services, and static renderers should be labeled separately in the thesis.
- **Proxy loading is explicit.** When the runner intercepts a placeholder
  dataset request, the raw CSV still records the real benchmark dataset.
- **Results are generated.** The repository ignores `eval/results/`,
  `eval/.venv/`, and local caches. Keep important result sets separately when
  preparing thesis figures.
- **Adapters are incremental.** A tool is added to the automated runner only when
  it has a reproducible local/API/manual protocol and an output validation rule.

## Environment

The runner records the benchmark environment automatically in
`results/environment.csv` and `results/environment.json`, including:

- OS, CPU model, logical CPU count, and RAM.
- Node and npm versions.
- Browser version and headless/headed mode.
- Best-effort WebGL vendor and renderer strings for browser benchmarks.
- Viewport and device scale factor.
- Measured and warm-up run counts.
- Git commit and dirty-state flag.

For final thesis runs, keep the environment file together with the raw CSVs and
figures so the results can be reproduced and audited later.
