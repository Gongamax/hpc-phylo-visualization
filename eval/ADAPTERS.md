# Tool Adapter Plan

Each adapter must produce the normalized columns in `eval/results/runs.csv`.
Adapters may be browser-driven, CLI-driven, or manual/API-driven, but they must
use the same dataset ids and run protocol.

## Implemented

| Tool | Adapter | Input | Validation |
| --- | --- | --- | --- |
| Phylotree.js | Playwright + app benchmark hook | Newick | SVG exists and contains marks |
| PhyD3 | Playwright + textarea import | Newick | SVG exists and contains marks |
| React Force Graph | Playwright + dataset selector | generated edge-list CSV | Canvas exists and is nonblank/inspectable |
| GraphGL | Playwright + dataset selector | generated edge-list CSV | Canvas exists and is nonblank/inspectable |
| Cytoscape.js | Playwright + local adapter page | generated edge-list CSV | Canvas exists and is nonblank/inspectable |
| ETE3 | CLI static renderer | Newick | output SVG exists |
| ggtree | CLI static renderer | Newick | output PDF exists |
| GrapeTree | Playwright + local Flask app | Newick | GrapeTree completion status and rendered nodes |
| Taxonium | Playwright + `taxonium-component` fixture | Newick served by benchmark route | Canvas exists and is nonblank/inspectable |
| Archaeopteryx.js | Playwright + local adapter page | Newick | SVG exists and contains marks |
| iTOL | Batch API runner | Newick ZIP upload | tree id, optional exported artifact; requires `ITOL_API_KEY` |

## Next Browser Adapters

| Tool | Adapter task | Notes |
| --- | --- | --- |
| Phyloscape | Create or connect a local page and expose load/parse/render metrics | Prefer local bundle over public website for reproducibility |

## Domain App / Service Protocols

| Tool | Protocol |
| --- | --- |
| PHYLOViZ | Use exported goeBURST/profile workflow when testing the full tool. Do not mix with graph-library results unless labeled as `domain-tool`. |

## Static Renderer Adapters

| Tool | Protocol |
| --- | --- |
| ETE3 | CLI script reads Newick, renders PNG/SVG, records parse/render time and peak RSS. |
| ggtree | R script reads Newick, renders PDF, records render time and process status. |

Static renderers should use `memory_mb` as peak process RSS rather than JS heap
delta. Their `render_artifact` should be the exported file type.
