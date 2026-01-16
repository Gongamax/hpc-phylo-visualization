// benchmark.js - Force Graph (2D/3D) Performance Benchmark
import { chromium } from "playwright";
import { writeFileSync, appendFileSync } from "fs";

// CONFIGURATION
const APP_URL = "http://localhost:5173/"; // Adjust if different
const RUNS_PER_DATASET = 7;
const CSV_FILENAME = "force_graph_benchmark_results.csv";

// All phylogenetic datasets (matches App.jsx)
const DATASETS = [
  // Simulated
  "Phylo: Simulated 1K",
  "Phylo: Simulated 3K",
  "Phylo: Simulated 10K",
  "Phylo: Simulated 30K",
  "Phylo: Simulated 50K",
  "Phylo: Simulated 200K",
  "Phylo: Simulated 500k",
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
  "Phylo: H. influenzae cgMLST",
  "Phylo: Neisseria MLST",
  "Phylo: Neisseria cgMLST",
  "Phylo: S. aureus cgMLST",
  "Phylo: S. aureus NJ",
  "Phylo: S. aureus MLST",
  "Phylo: S. pneumoniae MLST",
  "Phylo: S. pneumoniae cgMLST",
];

// Test both 2D and 3D modes - comment out 3D if not needed
const MODES = ["2D"]; // ["2D", "3D"]

const getMedian = (arr) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

(async () => {
  console.log("🚀 Starting Force Graph Benchmark...");

  let browser = await chromium.launch({ headless: false });
  let page = await browser.newPage();

  // CSV Header
  const csvHeader =
    "Mode,Dataset,Nodes,Edges,Median Load (ms),Median Parse (ms),Median Render (ms),Median Total (ms)\n";
  writeFileSync(CSV_FILENAME, csvHeader);

  for (const mode of MODES) {
    console.log(`\n📊 Benchmarking ${mode} Mode...`);
    console.log("=".repeat(60));

    for (const datasetName of DATASETS) {
      console.log(`\n   Testing: ${datasetName}`);
      const runs = [];

      for (let i = 1; i <= RUNS_PER_DATASET; i++) {
        console.log(`      Run ${i}/${RUNS_PER_DATASET}...`);

        try {
          // 1. Navigate to app
          await page.goto(APP_URL, { waitUntil: "networkidle" });

          // 2. Select mode (2D or 3D)
          await page.selectOption("select >> nth=1", mode);

          // 3. Select dataset
          await page.selectOption("select >> nth=0", datasetName);

          // 4. Wait for "Total:" text to appear with a value
          await page.waitForFunction(
            () => {
              const text = document.body.innerText;
              return /Total:\s*\d+\.\d+ms/.test(text);
            },
            { timeout: 180000 }
          );

          // 5. Wait a tiny bit for final update
          await page.waitForTimeout(500);

          // 6. Extract metrics
          const metricsText = await page.textContent("body");

          // Parse metrics
          const parse = (key) => {
            const match = metricsText.match(new RegExp(`${key}:\\s*([0-9.]+)`));
            return match ? parseFloat(match[1]) : 0;
          };

          const metrics = {
            nodes: parse("Nodes"),
            edges: parse("Edges"),
            load: parse("Load"),
            parse: parse("parse"),
            render: parse("Render"),
            total: parse("Total"),
          };

          runs.push(metrics);
          console.log(`         ✓ Done (${metrics.total}ms)`);
        } catch (err) {
          console.log(`         ❌ Error: ${err.message}`);
          runs.push(null); // Mark failed run

          // Always restart browser after any error
          console.log("         🔄 Restarting browser...");
          try {
            await browser.close();
          } catch {
            console.log("Something went wrong closing the browser");
          }
          browser = await chromium.launch({ headless: false });
          page = await browser.newPage();
          await page.waitForTimeout(2000); // Give it time to stabilize
        }
      }

      // Calculate medians (filter out null/failed runs)
      const validRuns = runs.filter((r) => r !== null);
      if (validRuns.length > 0) {
        const summary = {
          mode,
          dataset: datasetName,
          nodes: validRuns[0].nodes,
          edges: validRuns[0].edges,
          medianLoad: getMedian(validRuns.map((r) => r.load)).toFixed(2),
          medianParse: getMedian(validRuns.map((r) => r.parse)).toFixed(2),
          medianRender: getMedian(validRuns.map((r) => r.render)).toFixed(2),
          medianTotal: getMedian(validRuns.map((r) => r.total)).toFixed(2),
        };

        console.log(
          `      👉 Median Total: ${summary.medianTotal}ms (${validRuns.length}/${RUNS_PER_DATASET} successful)`
        );

        // Append to CSV
        const csvLine = `"${mode}","${datasetName}",${summary.nodes},${summary.edges},${summary.medianLoad},${summary.medianParse},${summary.medianRender},${summary.medianTotal}\n`;
        appendFileSync(CSV_FILENAME, csvLine);
      } else {
        console.log(`      ❌ All runs failed for ${datasetName}`);
      }
    }
  }

  console.log(`\n✅ Benchmark Complete! Results saved to ${CSV_FILENAME}`);
  await browser.close();
})();
