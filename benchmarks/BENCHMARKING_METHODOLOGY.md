# Benchmarking Methodology for Phylogenetic Visualization

## 1. Objective

To rigorously compare the performance of different phylogenetic tree visualization libraries (PoCs) using standardized metrics and protocols.

## 2. Metrics Definition

All measurements use the high-resolution `performance.now()` API.

| Metric          | Definition                                                                              |
| --------------- | --------------------------------------------------------------------------------------- |
| **Load Time**   | Time to fetch the dataset (CSV/Newick) and parse it into memory.                        |
| **Render Time** | Time from library initialization until the visual output is ready (or component mount). |
| **Total Time**  | The sum of Load + Render. This represents the **Time-to-Interactive** for the user.     |

## 3. Measurement Protocol (N=7 Median)

For each Library and Dataset combination, perform the following **"Fresh Page"** protocol:

1.  **Setup:** Open the PoC in the browser (Chrome/Firefox).
2.  **Warm-up:** Load the dataset once to ensure browser caching is active (simulating a returning user).
3.  **Measurement Loop (Repeat 7 times):**
    - Refresh the page (Cmd+R / F5).
    - Wait for the page to settle.
    - Click "Load" for the target dataset.
    - Record the **Total Time** displayed in the metrics panel.
4.  **Calculation:**
    - Sort the 7 recorded values from lowest to highest.
    - Select the **Median** (the 4th value).

### Why N=7 Median?

- **Robustness:** The Median is resistant to outliers (e.g., random CPU spikes or Garbage Collection pauses) which are common in browser environments.
- **Efficiency:** N=7 provides a statistically significant "typical" value without requiring excessive manual labor.

## 4. Test Datasets

| Dataset Name      | Nodes   | Edges  | Purpose                                                          |
| ----------------- | ------- | ------ | ---------------------------------------------------------------- |
| `tree_1k`         | ~1,000  | ~999   | **Baseline:** Basic rendering capability.                        |
| `tree_3k`         | ~3,000  | ~2,999 | **Stress Test:** Mid-range performance.                          |
| `tree_10k`        | ~10,000 | ~9,999 | **Scalability:** Identifies performance bottlenecks.             |
| `Influenzae MLST` | ~3,100  | ~3,100 | **Real World:** Validates performance on actual biological data. |

## 5. Environment Reporting

When reporting results, always include:

- **Browser:** (e.g., Chrome v120)
- **OS:** (e.g., macOS Sonoma)
- **Hardware:** (e.g., M1 Pro, 16GB RAM)
