# Evaluation Methodology

## Dataset Strategy

Use three complementary dataset families:

1. **Synthetic scale ladder**: generated trees with fixed topology-generation
   rules. These isolate scalability as node count grows.
2. **Incremental Salmonella samples**: real EnteroBase-derived trees at 10K,
   12.5K, 25K, 37.5K, 50K, 62.5K, 75K, and 82.5K. These are the best set for
   time/space scaling because the organism and data source are controlled while
   size changes.
3. **Cross-organism real datasets**: Clostridium, Vibrio, Staphylococcus,
   Neisseria, Haemophilus, Campylobacter, and Streptococcus. These test whether
   a tool behaves consistently across different biological trees rather than only
   on one family.

## Tool Strategy

Separate tools into comparable execution classes:

- **Interactive browser renderers**: Phylotree.js, PhyD3, Phyloscape,
  Archaeopteryx.js, Taxonium when browser-based, GraphGL, React Force Graph,
  Cytoscape.
- **Domain applications/services**: PHYLOViZ, GrapeTree, iTOL, Taxonium when
  used as its full application.
- **Static programmatic renderers**: ggtree and ETE3.

Do not mix measurements without labeling the class. Browser tools can report
load, parse/init, render, total, and JS heap delta. Static renderers should report
parse, layout/render, export time, peak RSS, and output file size.

## Run Protocol

Browser and static runners execute `WARMUP_RUNS` warm-up iterations before the
measured repetitions for each `(tool, dataset)` pair. Warm-up rows are retained
in `results/runs.csv` with `phase=warmup` so the run history is auditable, but
`results/summary.csv` includes only `phase=measured` rows.

The default protocol is:

```text
WARMUP_RUNS=1
RUNS=7
```

Median values are the primary reported statistic. P25, P75, and IQR are also
reported for load, parse, render, total, and memory metrics to show measurement
stability. P95 is intentionally omitted from the default tables because the
default run count is too small for a reliable tail estimate.

## Core Metrics

- `load_ms`: file read, HTTP fetch, or upload/load time.
- `parse_ms`: tree parsing or graph conversion time.
- `render_ms`: time to visual output or exported image.
- `total_ms`: end-to-end time.
- `memory_mb`: JS heap delta for browser tools, peak RSS for CLI tools.
- `phase`: warm-up or measured; only measured rows are summarized.
- `success`: whether the tool produced a usable visualization for the dataset.
- `rendered`: whether the tool produced a non-empty SVG/canvas/export artifact.
- `failure_kind`: timeout, parse error, unsupported input, browser crash,
  invalid render, or runtime error.

Use `WARMUP_RUNS=1 RUNS=7` and report measured-run medians with IQR. Keep failed
runs in the raw CSV and report the number of successful runs in the summary
table.

## Proxy Dataset Loading

Some proof-of-concept apps expose only a fixed dataset selector. For controlled
benchmarking, the Playwright runner can select a known placeholder dataset and
intercept its `/data/...` request, serving the active benchmark dataset instead.
The raw CSV always records the true `dataset_id`; the placeholder is only an app
loading mechanism. This is used for the incremental Salmonella ladder until each
PoC has a first-class arbitrary-file input.
