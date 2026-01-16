// benchmark.js - Sigma.js Performance Benchmark
// Note: This script assumes Sigma app is updated to load CSV edgelists
import { chromium } from "playwright";
import { writeFileSync, appendFileSync, readFileSync } from "fs";

// CONFIGURATION
const APP_URL = "http://localhost:5173/"; // Adjust if different
const RUNS_PER_DATASET = 7;
const CSV_FILENAME = "sigma_benchmark_results.csv";
const DATA_DIR = "./public/data";

// Find all edgelist CSV files
import { readdirSync, statSync } from "fs";
import { join, relative } from "path";

function discoverDatasets(baseDir) {
  const datasets = [];

  function walkDir(dir) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.endsWith(".newick") || entry.endsWith(".nwk")) {
        // Get path relative to baseDir
        const relativePath = relative(baseDir, fullPath);
        const name = relativePath
          .replace(/\.(newick|nwk)$/, "")
          .replace(/-/g, " ")
          .replace(/_/g, " ")
          .replace(/\//g, " - ");
        datasets.push({ name, file: relativePath });
      }
    }
  }

  walkDir(baseDir);
  return datasets;
}

const DATASETS = discoverDatasets(DATA_DIR);

const getMedian = (arr) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

(async () => {
  console.log("🚀 Starting Sigma.js Benchmark...");

  // Filter out extremely large datasets that crash Sigma
  const filteredDatasets = DATASETS.filter(
    (d) => !d.name.includes("200k") && !d.name.includes("100k")
  );
  console.log(
    `📁 Found ${filteredDatasets.length} datasets (skipping 200K and 100K datasets)\n`
  );

  let browser = await chromium.launch({ headless: false });
  let page = await browser.newPage();

  // CSV Header
  const csvHeader =
    "Dataset,Nodes,Edges,Median Load (ms),Median Parse (ms),Median Render (ms),Median Total (ms)\n";
  writeFileSync(CSV_FILENAME, csvHeader);

  for (const dataset of filteredDatasets) {
    console.log(`\n📊 Testing: ${dataset.name}`);
    const runs = [];

    for (let i = 1; i <= RUNS_PER_DATASET; i++) {
      console.log(`   Run ${i}/${RUNS_PER_DATASET}...`);

      try {
        // Check if page is still connected, restart if needed
        try {
          await page.evaluate(() => 1);
        } catch {
          console.log("   🔄 Browser disconnected, restarting...");
          try {
            await browser.close();
          } catch {}
          browser = await chromium.launch({ headless: false });
          page = await browser.newPage();
          await page.waitForTimeout(2000);
        }

        // Navigate to app
        await page.goto(APP_URL, { waitUntil: "networkidle", timeout: 60000 });

        // Load the NEWICK file
        const newickPath = join(DATA_DIR, dataset.file);
        const newickContent = readFileSync(newickPath, "utf-8").trim();

        // Select phylogenetic graph type
        await page.selectOption("#graph-type", "phylogenetic");
        await page.waitForTimeout(300);

        // Fill textarea with Newick content
        await page.fill("textarea.newick-input", newickContent);

        // Trigger blur to load the tree
        await page.evaluate(() => {
          const textarea = document.querySelector("textarea.newick-input");
          if (textarea) textarea.blur();
        });

        // Wait for metrics to show with non-zero total
        await page.waitForFunction(
          () => {
            const text = document.body.innerText;
            const match = text.match(/Total:\s*(\d+\.?\d*)ms/);
            return match && parseFloat(match[1]) > 0;
          },
          { timeout: 180000 }
        );

        await page.waitForTimeout(500);

        // Extract metrics
        const metricsText = await page.locator(".metrics").innerText();

        const parse = (key) => {
          const match = metricsText.match(new RegExp(`${key}:\\s*([0-9.]+)`));
          return match ? parseFloat(match[1]) : 0;
        };

        const metrics = {
          nodes: nodes.size,
          edges: edgeCount,
          total: endTime - startTime,
          // Sigma may have different metric names, adjust as needed
          graphGen: parse("Graph Gen") || parse("Generation"),
          mst: parse("MST"),
          render: parse("Render"),
        };

        runs.push(metrics);
        console.log(`      ✓ Done (${metrics.total.toFixed(0)}ms)`);
      } catch (err) {
        console.log(`      ❌ Error: ${err.message}`);
      }
    }

    // Calculate medians
    if (runs.length > 0) {
      const summary = {
        dataset: dataset.name,
        nodes: runs[0].nodes,
        edges: runs[0].edges,
        medianLoad: 0, // Not applicable for Sigma
        medianParse: getMedian(runs.map((r) => r.graphGen)).toFixed(2),
        medianRender: getMedian(runs.map((r) => r.render)).toFixed(2),
        medianTotal: getMedian(runs.map((r) => r.total)).toFixed(2),
      };

      console.log(`   👉 Median Total: ${summary.medianTotal}ms`);

      const csvLine = `"${dataset.name}",${summary.nodes},${summary.edges},${summary.medianLoad},${summary.medianParse},${summary.medianRender},${summary.medianTotal}\n`;
      appendFileSync(CSV_FILENAME, csvLine);
    }
  }

  console.log(`\n✅ Benchmark Complete! Results saved to ${CSV_FILENAME}`);
  await browser.close();
})();
