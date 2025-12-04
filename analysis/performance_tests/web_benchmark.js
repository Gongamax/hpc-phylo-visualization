/**
 * web_benchmark.js
 *
 * RIGOROUS Automated benchmarking for web-based phylogenetic visualization tools.
 * Uses Playwright + Chrome DevTools Protocol (CDP) to capture REAL rendering metrics.
 *
 * Metrics Captured:
 * - First Contentful Paint (FCP): When first content appears
 * - Largest Contentful Paint (LCP): When main content is rendered
 * - DOM Content Loaded: When HTML is fully parsed
 * - Load Event: When all resources are loaded
 * - Total Blocking Time (TBT): JS blocking main thread
 * - Custom Render Time: Time from navigation to tree visible
 *
 * Supported Tools:
 * - iTOL (itol.embl.de) - Newick format
 * - Phylotree.js (phylotree.hyphy.org) - Newick format
 * - PhyloScape (darwintree.cn/PhyloScape) - Newick format
 */

import { chromium } from "playwright";
import {
  writeFileSync,
  appendFileSync,
  readFileSync,
  existsSync,
  readdirSync,
  statSync,
} from "fs";
import { join } from "path";

// =============================================================================
// CONFIGURATION
// =============================================================================
const RUNS_PER_DATASET = 7;
const CSV_FILENAME = "web_benchmark_results.csv";

// Data paths (relative to this script)
const DATA_DIR = join(import.meta.dirname, "../../data");

// Dynamically discover all .newick files under data/
function discoverNewickDatasets(baseDir) {
  const datasets = [];

  function walkDir(dir) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.endsWith(".newick")) {
        const relativePath = fullPath.replace(baseDir + "/", "");
        const name = relativePath
          .replace(".newick", "")
          .replace(/_/g, " ")
          .replace(/\//g, " - ");
        datasets.push({ name, file: fullPath });
      }
    }
  }

  walkDir(baseDir);
  return datasets;
}

const NEWICK_DATASETS = discoverNewickDatasets(DATA_DIR);

// Which tools to benchmark
const TOOLS = {
  itol: true,
  phylotree: true,
  phyloscape: true,
};

// =============================================================================
// HELPERS
// =============================================================================
const getMedian = (arr) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

const getMean = (arr) => {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
};

const getStdDev = (arr) => {
  if (arr.length === 0) return 0;
  const mean = getMean(arr);
  const squaredDiffs = arr.map((x) => Math.pow(x - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / arr.length);
};

const countNewickLeaves = (filePath) => {
  try {
    const content = readFileSync(filePath, "utf-8");
    const commas = (content.match(/,/g) || []).length;
    return commas + 1;
  } catch {
    return 0;
  }
};

// =============================================================================
// PERFORMANCE METRICS COLLECTION via CDP
// =============================================================================

/**
 * Collect real browser performance metrics using Chrome DevTools Protocol
 */
async function collectPerformanceMetrics(page) {
  const client = await page.context().newCDPSession(page);

  // Enable Performance domain
  await client.send("Performance.enable");

  // Get performance metrics
  const { metrics } = await client.send("Performance.getMetrics");

  // Convert to object for easier access
  const metricsObj = {};
  for (const metric of metrics) {
    metricsObj[metric.name] = metric.value;
  }

  // Get paint timing from Performance API
  const paintTiming = await page.evaluate(() => {
    const entries = performance.getEntriesByType("paint");
    const result = {};
    for (const entry of entries) {
      result[entry.name] = entry.startTime;
    }
    return result;
  });

  // Get Largest Contentful Paint
  const lcp = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry ? lastEntry.startTime : 0);
      }).observe({ type: "largest-contentful-paint", buffered: true });

      // Fallback timeout
      setTimeout(() => resolve(0), 5000);
    });
  });

  // Get navigation timing
  const navTiming = await page.evaluate(() => {
    const timing = performance.getEntriesByType("navigation")[0];
    if (!timing) return null;
    return {
      domContentLoaded: timing.domContentLoadedEventEnd - timing.startTime,
      loadEvent: timing.loadEventEnd - timing.startTime,
      domInteractive: timing.domInteractive - timing.startTime,
      responseEnd: timing.responseEnd - timing.startTime,
      transferSize: timing.transferSize,
    };
  });

  // Get Long Tasks (for Total Blocking Time calculation)
  const longTasks = await page.evaluate(() => {
    return new Promise((resolve) => {
      const tasks = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Long task = anything over 50ms
          if (entry.duration > 50) {
            tasks.push({
              duration: entry.duration,
              blockingTime: entry.duration - 50, // TBT = duration - 50ms
            });
          }
        }
      });

      try {
        observer.observe({ type: "longtask", buffered: true });
      } catch (e) {
        // longtask not supported in all browsers
      }

      setTimeout(() => {
        observer.disconnect();
        resolve(tasks);
      }, 1000);
    });
  });

  const totalBlockingTime = longTasks.reduce(
    (sum, task) => sum + task.blockingTime,
    0
  );

  await client.detach();

  return {
    // Paint metrics
    firstContentfulPaint: paintTiming["first-contentful-paint"] || 0,
    firstPaint: paintTiming["first-paint"] || 0,
    largestContentfulPaint: lcp,

    // Navigation metrics
    domContentLoaded: navTiming?.domContentLoaded || 0,
    loadEvent: navTiming?.loadEvent || 0,
    domInteractive: navTiming?.domInteractive || 0,

    // Blocking time
    totalBlockingTime,
    longTaskCount: longTasks.length,

    // CDP metrics (in seconds, convert to ms)
    jsHeapUsedSize: metricsObj.JSHeapUsedSize || 0,
    layoutCount: metricsObj.LayoutCount || 0,
    scriptDuration: (metricsObj.ScriptDuration || 0) * 1000,
    layoutDuration: (metricsObj.LayoutDuration || 0) * 1000,
    taskDuration: (metricsObj.TaskDuration || 0) * 1000,
  };
}

// =============================================================================
// iTOL BENCHMARKING
// =============================================================================
async function benchmarkITOL(page, newickFile, datasetName) {
  console.log(`   [iTOL] Testing ${datasetName}...`);
  const runs = [];

  for (let i = 1; i <= RUNS_PER_DATASET; i++) {
    console.log(`      Run ${i}/${RUNS_PER_DATASET}...`);

    try {
      // 1. Go to upload page
      await page.goto("https://itol.embl.de/upload.cgi", {
        waitUntil: "domcontentloaded",
      });

      // 2. Set file
      await page.setInputFiles('input[type="file"]', newickFile);

      // 3. Start timer and upload
      const startTime = performance.now();
      await page.click('input[type="submit"]');

      // 4. Wait for redirect to tree page
      await page.waitForURL(/.*itol\.embl\.de\/tree\/.*/, { timeout: 300000 });

      // 5. Wait for loading indicator to disappear (tree is rendered)
      await page.waitForSelector("#loading", {
        state: "detached",
        timeout: 120000,
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 6. Collect performance metrics
      const metrics = await collectPerformanceMetrics(page);

      runs.push({
        totalTime: Math.round(totalTime),
        ...metrics,
      });

      console.log(
        `      ✓ Done: Total=${Math.round(totalTime)}ms, FCP=${Math.round(
          metrics.firstContentfulPaint
        )}ms, LCP=${Math.round(metrics.largestContentfulPaint)}ms`
      );

      // Cooldown
      await page.waitForTimeout(3000);
    } catch (err) {
      console.log(`      ✗ Error: ${err.message}`);
      runs.push(null);
    }
  }

  return runs;
}

// =============================================================================
// PHYLOTREE.JS BENCHMARKING
// =============================================================================
async function benchmarkPhylotree(page, newickFile, datasetName) {
  console.log(`   [Phylotree.js] Testing ${datasetName}...`);
  const runs = [];
  const newickContent = readFileSync(newickFile, "utf-8");

  for (let i = 1; i <= RUNS_PER_DATASET; i++) {
    console.log(`      Run ${i}/${RUNS_PER_DATASET}...`);

    try {
      const startTime = performance.now();

      // Navigate to Phylotree.js
      await page.goto("https://phylotree.hyphy.org/", {
        waitUntil: "networkidle",
      });

      // Try file upload or paste
      const hasFileInput = await page.locator('input[type="file"]').count();
      if (hasFileInput > 0) {
        await page
          .locator('input[type="file"]')
          .first()
          .setInputFiles(newickFile);
      }

      // Wait for SVG rendering
      await page.waitForSelector("svg", { timeout: 60000 });
      await page.waitForTimeout(1000); // Let rendering settle

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Collect metrics
      const metrics = await collectPerformanceMetrics(page);

      runs.push({
        totalTime: Math.round(totalTime),
        ...metrics,
      });

      console.log(
        `      ✓ Done: Total=${Math.round(totalTime)}ms, FCP=${Math.round(
          metrics.firstContentfulPaint
        )}ms`
      );

      await page.waitForTimeout(2000);
    } catch (err) {
      console.log(`      ✗ Error: ${err.message}`);
      runs.push(null);
    }
  }

  return runs;
}

// =============================================================================
// PHYLOSCAPE BENCHMARKING
// =============================================================================
async function benchmarkPhyloScape(page, newickFile, datasetName) {
  console.log(`   [PhyloScape] Testing ${datasetName}...`);
  const runs = [];

  for (let i = 1; i <= RUNS_PER_DATASET; i++) {
    console.log(`      Run ${i}/${RUNS_PER_DATASET}...`);

    try {
      const startTime = performance.now();

      // Navigate to PhyloScape
      await page.goto("http://darwintree.cn/PhyloScape/#/applicationone", {
        waitUntil: "networkidle",
        timeout: 60000,
      });

      await page.waitForTimeout(2000);

      // Upload file
      const fileInput = await page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(newickFile);

      // Wait for canvas/SVG to appear (tree rendered)
      await page.waitForSelector("canvas, svg", { timeout: 120000 });
      await page.waitForTimeout(2000); // Let rendering settle

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Collect metrics
      const metrics = await collectPerformanceMetrics(page);

      runs.push({
        totalTime: Math.round(totalTime),
        ...metrics,
      });

      console.log(
        `      ✓ Done: Total=${Math.round(totalTime)}ms, LCP=${Math.round(
          metrics.largestContentfulPaint
        )}ms`
      );

      await page.waitForTimeout(2000);
    } catch (err) {
      console.log(`      ✗ Error: ${err.message}`);
      runs.push(null);
    }
  }

  return runs;
}

// =============================================================================
// CSV OUTPUT
// =============================================================================
function generateCSVHeader() {
  return (
    [
      "Tool",
      "Dataset",
      "Nodes",
      // Individual runs
      ...Array.from(
        { length: RUNS_PER_DATASET },
        (_, i) => `Run${i + 1}_Total(ms)`
      ),
      // Aggregated metrics
      "Median_Total(ms)",
      "Mean_Total(ms)",
      "StdDev_Total(ms)",
      // Performance API metrics (median)
      "Median_FCP(ms)",
      "Median_LCP(ms)",
      "Median_DOMContentLoaded(ms)",
      "Median_LoadEvent(ms)",
      "Median_TBT(ms)",
      "Median_ScriptDuration(ms)",
      "Median_LayoutDuration(ms)",
    ].join(",") + "\n"
  );
}

function generateCSVLine(toolName, datasetName, nodeCount, runs) {
  const validRuns = runs.filter((r) => r !== null);

  if (validRuns.length === 0) {
    // All runs failed
    const failLine = [
      `"${toolName}"`,
      `"${datasetName}"`,
      nodeCount,
      ...Array(RUNS_PER_DATASET).fill("FAIL"),
      ...Array(10).fill("N/A"),
    ];
    return failLine.join(",") + "\n";
  }

  // Extract totals for individual run columns
  const runTotals = runs.map((r) => (r ? r.totalTime : "FAIL"));

  // Calculate aggregates
  const totals = validRuns.map((r) => r.totalTime);
  const fcps = validRuns.map((r) => r.firstContentfulPaint);
  const lcps = validRuns.map((r) => r.largestContentfulPaint);
  const dcls = validRuns.map((r) => r.domContentLoaded);
  const loads = validRuns.map((r) => r.loadEvent);
  const tbts = validRuns.map((r) => r.totalBlockingTime);
  const scripts = validRuns.map((r) => r.scriptDuration);
  const layouts = validRuns.map((r) => r.layoutDuration);

  const line = [
    `"${toolName}"`,
    `"${datasetName}"`,
    nodeCount,
    ...runTotals,
    getMedian(totals).toFixed(2),
    getMean(totals).toFixed(2),
    getStdDev(totals).toFixed(2),
    getMedian(fcps).toFixed(2),
    getMedian(lcps).toFixed(2),
    getMedian(dcls).toFixed(2),
    getMedian(loads).toFixed(2),
    getMedian(tbts).toFixed(2),
    getMedian(scripts).toFixed(2),
    getMedian(layouts).toFixed(2),
  ];

  return line.join(",") + "\n";
}

// =============================================================================
// MAIN
// =============================================================================
async function runBenchmarks() {
  console.log("🚀 Starting RIGOROUS Web Tool Benchmarks...");
  console.log(
    "📊 Using Chrome DevTools Protocol for real performance metrics\n"
  );
  console.log(`📁 Found ${NEWICK_DATASETS.length} Newick datasets:\n`);

  for (const dataset of NEWICK_DATASETS) {
    const nodeCount = countNewickLeaves(dataset.file);
    console.log(`   - ${dataset.name} (~${nodeCount} leaves)`);
  }
  console.log("\n");

  const validDatasets = NEWICK_DATASETS.filter((d) => existsSync(d.file));

  const browser = await chromium.launch({
    headless: false,
    args: [
      "--enable-precise-memory-info",
      "--enable-webgl",
      "--use-gl=desktop",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  // Write CSV header
  writeFileSync(CSV_FILENAME, generateCSVHeader());

  // Benchmark each tool
  if (TOOLS.itol) {
    console.log("\n📊 Benchmarking iTOL (itol.embl.de)...");
    console.log("=".repeat(60));

    for (const dataset of validDatasets) {
      const nodeCount = countNewickLeaves(dataset.file);
      const runs = await benchmarkITOL(page, dataset.file, dataset.name);
      appendFileSync(
        CSV_FILENAME,
        generateCSVLine("iTOL", dataset.name, nodeCount, runs)
      );

      const validRuns = runs.filter((r) => r !== null);
      if (validRuns.length > 0) {
        const medianTotal = getMedian(validRuns.map((r) => r.totalTime));
        console.log(
          `   👉 Median Total: ${medianTotal.toFixed(0)}ms (${
            validRuns.length
          }/${RUNS_PER_DATASET} successful)\n`
        );
      }
    }
  }

  if (TOOLS.phylotree) {
    console.log("\n📊 Benchmarking Phylotree.js (phylotree.hyphy.org)...");
    console.log("=".repeat(60));

    for (const dataset of validDatasets) {
      const nodeCount = countNewickLeaves(dataset.file);
      const runs = await benchmarkPhylotree(page, dataset.file, dataset.name);
      appendFileSync(
        CSV_FILENAME,
        generateCSVLine("Phylotree.js", dataset.name, nodeCount, runs)
      );

      const validRuns = runs.filter((r) => r !== null);
      if (validRuns.length > 0) {
        const medianTotal = getMedian(validRuns.map((r) => r.totalTime));
        console.log(
          `   👉 Median Total: ${medianTotal.toFixed(0)}ms (${
            validRuns.length
          }/${RUNS_PER_DATASET} successful)\n`
        );
      }
    }
  }

  if (TOOLS.phyloscape) {
    console.log("\n📊 Benchmarking PhyloScape (darwintree.cn/PhyloScape)...");
    console.log("=".repeat(60));

    for (const dataset of validDatasets) {
      const nodeCount = countNewickLeaves(dataset.file);
      const runs = await benchmarkPhyloScape(page, dataset.file, dataset.name);
      appendFileSync(
        CSV_FILENAME,
        generateCSVLine("PhyloScape", dataset.name, nodeCount, runs)
      );

      const validRuns = runs.filter((r) => r !== null);
      if (validRuns.length > 0) {
        const medianTotal = getMedian(validRuns.map((r) => r.totalTime));
        console.log(
          `   👉 Median Total: ${medianTotal.toFixed(0)}ms (${
            validRuns.length
          }/${RUNS_PER_DATASET} successful)\n`
        );
      }
    }
  }

  console.log(`\n✅ Benchmarking Complete!`);
  console.log(`📄 Results saved to ${CSV_FILENAME}`);
  console.log(`\n📊 Metrics captured:`);
  console.log(`   - Total Time (upload + processing + render)`);
  console.log(`   - First Contentful Paint (FCP)`);
  console.log(`   - Largest Contentful Paint (LCP)`);
  console.log(`   - DOM Content Loaded`);
  console.log(`   - Total Blocking Time (TBT)`);
  console.log(`   - Script Duration (JS execution)`);
  console.log(`   - Layout Duration (CSS/layout)`);

  await browser.close();
}

runBenchmarks().catch(console.error);
