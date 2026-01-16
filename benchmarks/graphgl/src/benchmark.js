// benchmark.js
import { chromium } from "playwright";
import { writeFileSync, appendFileSync } from "fs";

// 1. CONFIGURATION
// =================
const APP_URL = "http://localhost:5174/";
const RUNS_PER_DATASET = 7;
const CSV_FILENAME = "benchmark_results.csv";

// All datasets from your sample-datasets.js
const DATASETS = [
  "Les Miserable",
  "Random (20, 40)",
  "Random (100, 200)",
  "Random (1000, 2000)",
  "Random (5000, 3000)",
  // Simulated phylogenetic
  "Phylo: Simulated 1K",
  "Phylo: Simulated 3K",
  "Phylo: Simulated 10K",
  "Phylo: Simulated 30K",
  "Phylo: Simulated 50K",
  "Phylo: Simulated 200K",
  // Enterobase
  "Phylo: Clostridium UPGMA",
  "Phylo: Clostridium goeBURST",
  "Phylo: Salmonella 100K",
  "Phylo: Vibrio UPGMA",
  "Phylo: Vibrio goeBURST",
  // PubMLST
  "Phylo: C. coli MLST",
  "Phylo: C. coli cgMLST",
  "Phylo: H. influenzae MLST",
  "Phylo: H. influenzae cgMLST (1)",
  "Phylo: H. influenzae cgMLST (2)",
  "Phylo: Neisseria MLST",
  "Phylo: Neisseria cgMLST 200K",
  "Phylo: S. aureus cgMLST",
  "Phylo: S. aureus NJ",
  "Phylo: S. aureus MLST",
  "Phylo: S. pneumoniae MLST",
  "Phylo: S. pneumoniae",
  // Other graph types
  "Ladder (10)",
  "BalancedBinTree (5)",
  "BalancedBinTree (8)",
  "Grid (10, 10)",
  "WattsStrogatz (100, 10, 0.06)",
];

// Helper: Calculate Median
const getMedian = (arr) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

(async () => {
  console.log("🚀 Starting Benchmark...");

  // Launch browser (headless: true makes it run in background, set false to watch it)
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Prepare CSV header
  const csvHeader =
    "Dataset,Nodes,Edges,Median Load (ms),Median Init (ms),Median Render (ms),Median Total (ms)\n";
  writeFileSync(CSV_FILENAME, csvHeader);

  for (const datasetName of DATASETS) {
    console.log(`\n📊 Benchmarking: ${datasetName}`);
    const runs = [];

    for (let i = 1; i <= RUNS_PER_DATASET; i++) {
      console.log(`   Run ${i}/${RUNS_PER_DATASET}...`);

      try {
        // 1. Reload page to ensure clean state (avoids React state caching issues)
        await page.goto(APP_URL);

        // 2. Select the dataset
        const currentSelection = await page.$eval("select", (el) => el.value);
        if (currentSelection !== datasetName) {
          await page.selectOption("select", datasetName);
        }

        // 3. Wait for Loading to disappear
        await page.waitForSelector("text=Loading...", {
          state: "detached",
          timeout: 1200000,
        });

        // 4. Wait for Metrics to appear
        await page.waitForSelector("text=Performance Metrics:");

        // 5. Waiting for "Total" to be calculated.
        await page.waitForFunction(
          () => {
            const el = document.querySelector("div");
            // Simple check: ensure we have text and Total is not 0
            return (
              el &&
              el.innerText.includes("Performance Metrics") &&
              !el.innerText.includes("Total: 0ms") &&
              !el.innerText.includes("Total: 0.00ms")
            );
          },
          { timeout: 10000 }
        );

        // 6. Extract Data
        // We scrape the entire text line: "Performance Metrics: | Nodes: 20 ... Total: 150ms"
        const text = await page
          .locator("div", { hasText: "Performance Metrics:" })
          .last()
          .innerText();

        // Parse numbers using Regex
        const parse = (key) => {
          const match = text.match(new RegExp(`${key}:\\s*([0-9.]+)`));
          return match ? parseFloat(match[1]) : 0;
        };

        const metrics = {
          nodes: parse("Nodes"),
          edges: parse("Edges"),
          load: parse("Load"),
          init: parse("Init"),
          render: parse("Render"),
          total: parse("Total"),
        };

        runs.push(metrics);
        console.log(`Done (${metrics.total}ms)`);
      } catch (err) {
        console.log(`❌ Error: ${err.message}`);
        // If a run fails (timeout), we continue to next run or next dataset
      }
    }

    // Calculate Medians
    if (runs.length > 0) {
      const summary = {
        dataset: datasetName,
        nodes: runs[0].nodes, // Nodes/Edges are constant per dataset
        edges: runs[0].edges,
        medianLoad: getMedian(runs.map((r) => r.load)).toFixed(2),
        medianInit: getMedian(runs.map((r) => r.init)).toFixed(2),
        medianRender: getMedian(runs.map((r) => r.render)).toFixed(2),
        medianTotal: getMedian(runs.map((r) => r.total)).toFixed(2),
      };

      console.log(`   👉 Median Total: ${summary.medianTotal}ms`);

      // Append to CSV
      const csvLine = `"${datasetName}",${summary.nodes},${summary.edges},${summary.medianLoad},${summary.medianInit},${summary.medianRender},${summary.medianTotal}\n`;
      appendFileSync(CSV_FILENAME, csvLine);
    }
  }

  console.log(`\n✅ Benchmarking Complete! Results saved to ${CSV_FILENAME}`);
  await browser.close();
})();
