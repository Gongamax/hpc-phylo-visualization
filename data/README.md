# Phylogenetic Trees Dataset Organization

This directory contains phylogenetic trees and related benchmark artifacts generated from Enterobase, PubMLST, and simulated datasets. The files are organized by data source and organism so that benchmark scripts can locate the correct tree set without additional preprocessing.

## Directory Structure

```text
data/
|-- enterobase/
|   |-- clostridium/
|   |-- salmonella/
|   `-- vibrio/
|-- pubmlst/
|   |-- campylobacter_coli/
|   |-- haemophilus_influenzae/
|   |-- neisseria/
|   |-- staphylococcus_aureus/
|   `-- streptococcus_pneumoniae/
`-- simulated/
    `-- ete3/
```

Each organism directory typically contains:

- one `README.md` file with metadata and tree descriptions
- one or more Newick tree files (`.nwk` or `.newick`)
- optional derived artifacts such as CSV edge lists or preview images

Some datasets also include subdirectories for sampled series, such as the Salmonella sample trees under `enterobase/salmonella/`.

## Data Sources

### Enterobase

Source: [Enterobase](https://enterobase.warwick.ac.uk/) | Phylolib: [https://github.com/phyloviz/phylolib](https://github.com/phyloviz/phylolib)

| Organism           | Retrieved        | Data Type | Tree Variants         | Notes                                                               |
| ------------------ | ---------------- | --------- | --------------------- | ------------------------------------------------------------------- |
| Clostridium        | November 5, 2025 | cgMLST    | goEburst, NJ, UPGMA   | Core genome MLST trees generated with three phylogenetic algorithms |
| Vibrio             | November 5, 2025 | cgMLST    | goEburst, NJ, UPGMA   | Core genome MLST trees generated with three phylogenetic algorithms |
| Salmonella         | November 5, 2025 | cgMLST    | goEburst, 100k sample | Full dataset plus a large sample subset                             |
| Salmonella samples | March 17, 2026   | cgMLST    | 10k to 82.5k samples  | Progressive sampling at fixed intervals                             |

### PubMLST

Source: [PubMLST](https://pubmlst.org/) | Phylolib: [https://github.com/phyloviz/phylolib](https://github.com/phyloviz/phylolib)

| Organism                 | Retrieved        | Data Type    | Tree Algorithms       | Repository Link                                               |
| ------------------------ | ---------------- | ------------ | --------------------- | ------------------------------------------------------------- |
| Campylobacter coli       | November 5, 2025 | MLST, cgMLST | goEburst              | [PubMLST Campylobacter](https://pubmlst.org/campylobacter/)   |
| Haemophilus influenzae   | November 5, 2025 | MLST, cgMLST | goEburst              | [PubMLST Haemophilus](https://pubmlst.org/haemophilus/)       |
| Neisseria                | November 5, 2025 | MLST, cgMLST | goEburst              | [PubMLST Neisseria](https://pubmlst.org/neisseria/)           |
| Staphylococcus aureus    | November 5, 2025 | MLST, cgMLST | goEburst, NJ, rapidNJ | [PubMLST Staphylococcus](https://pubmlst.org/staphylococcus/) |
| Streptococcus pneumoniae | November 5, 2025 | MLST, cgMLST | goEburst              | [PubMLST Streptococcus](https://pubmlst.org/streptococcus/)   |

### Simulated Data

| Source           | Size Variants                     | Format             |
| ---------------- | --------------------------------- | ------------------ |
| ETE3 simulations | 1k, 3k, 10k, 30k, 50k, 200k, 500k | Newick (`.newick`) |

## How To Use These Data

1. Open the organism folder under the relevant source, for example `data/pubmlst/staphylococcus_aureus/`.
2. Read the organism-specific `README.md` for metadata and tree descriptions.
3. Select the relevant `.nwk` or `.newick` file for visualization, parsing, or benchmark execution.
4. Use the tree file together with any derived CSV or image artifacts when comparing algorithms or generating figures.

## Notes

- The on-disk structure is intentionally source-first, then organism-first.
- Existing filenames are preserved to keep benchmark scripts and published results stable.
- If you want, this README can also be expanded with a per-folder inventory of every file in each organism directory.
