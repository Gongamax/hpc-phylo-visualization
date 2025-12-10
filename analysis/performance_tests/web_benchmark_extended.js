/**
 * web_benchmark_extended.js
 *
 * EXTENDED Automated benchmarking for web-based phylogenetic visualization tools.
 * Includes: PhyD3 (local), PhyloViz Online, GrapeTree (local)
 *
 * Uses Playwright + Chrome DevTools Protocol (CDP) for real rendering metrics.
 *
 * Usage:
 *   node web_benchmark_extended.js [--phyd3] [--phyloviz] [--grapetree] [--all]
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
import { join, dirname } from "path";
import { spawn, execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =============================================================================
// CONFIGURATION
// =============================================================================
const RUNS_PER_DATASET = 7;
const CSV_FILENAME = "web_benchmark_extended_results.csv";

// Paths
const DATA_DIR = join(__dirname, "../../data");
const PHYD3_DIR = join(__dirname, "../../proofs_of_concept/PoC-PhyD3");
const GRAPETREE_DIR = process.env.HOME + "/Developer/GrapeTree";

// Parse command line args
const args = process.argv.slice(2);
const runAll = args.includes("--all") || args.length === 0;
const SKIP_SERVERS = args.includes("--no-servers");
const TOOLS = {
  phyd3: runAll || args.includes("--phyd3"),
  phyloviz: runAll || args.includes("--phyloviz"),
  grapetree: runAll || args.includes("--grapetree"),
};

// Discover Newick datasets
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
3;
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// =============================================================================
// PERFORMANCE METRICS via CDP
// =============================================================================
async function collectPerformanceMetrics(page) {
  const client = await page.context().newCDPSession(page);
  await client.send("Performance.enable");
  const { metrics } = await client.send("Performance.getMetrics");

  const metricsObj = {};
  for (const metric of metrics) {
    metricsObj[metric.name] = metric.value;
  }

  const paintTiming = await page.evaluate(() => {
    const entries = performance.getEntriesByType("paint");
    const result = {};
    for (const entry of entries) {
      result[entry.name] = entry.startTime;
    }
    return result;
  });

  const lcp = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry ? lastEntry.startTime : 0);
      }).observe({ type: "largest-contentful-paint", buffered: true });
      setTimeout(() => resolve(0), 5000);
    });
  });

  const navTiming = await page.evaluate(() => {
    const timing = performance.getEntriesByType("navigation")[0];
    if (!timing) return null;
    return {
      domContentLoaded: timing.domContentLoadedEventEnd - timing.startTime,
      loadEvent: timing.loadEventEnd - timing.startTime,
      domInteractive: timing.domInteractive - timing.startTime,
    };
  });

  const longTasks = await page.evaluate(() => {
    return new Promise((resolve) => {
      const tasks = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            tasks.push({ blockingTime: entry.duration - 50 });
          }
        }
      });
      try {
        observer.observe({ type: "longtask", buffered: true });
      } catch (e) {}
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
    firstContentfulPaint: paintTiming["first-contentful-paint"] || 0,
    firstPaint: paintTiming["first-paint"] || 0,
    largestContentfulPaint: lcp,
    domContentLoaded: navTiming?.domContentLoaded || 0,
    loadEvent: navTiming?.loadEvent || 0,
    totalBlockingTime,
    scriptDuration: (metricsObj.ScriptDuration || 0) * 1000,
    layoutDuration: (metricsObj.LayoutDuration || 0) * 1000,
  };
}

// =============================================================================
// SERVER MANAGEMENT
// =============================================================================
let phyd3Server = null;
let grapetreeServer = null;

async function startPhyD3Server() {
  console.log(
    "   Starting PhyD3 dev server (npm run dev -> http-server on port 8080)..."
  );

  return new Promise((resolve, reject) => {
    // PhyD3 uses: npm run dev -> esbuild + http-server -p 8080
    phyd3Server = spawn("npm", ["run", "dev"], {
      cwd: PHYD3_DIR,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });

    let started = false;

    const checkOutput = (data) => {
      const output = data.toString();
      // http-server outputs "Available on:" when ready
      if (
        (output.includes("Available on") ||
          output.includes("127.0.0.1:8080")) &&
        !started
      ) {
        started = true;
        console.log("   ✓ PhyD3 server ready on http://localhost:8080");
        setTimeout(resolve, 2000);
      }
    };

    phyd3Server.stdout.on("data", checkOutput);
    phyd3Server.stderr.on("data", checkOutput);

    setTimeout(() => {
      if (!started) {
        started = true;
        console.log("   ⚠ PhyD3 server timeout, assuming started on port 8080");
        resolve();
      }
    }, 15000);
  });
}

async function startGrapeTreeServer() {
  console.log("   Starting GrapeTree server...");

  return new Promise((resolve, reject) => {
    // Activate venv and run
    grapetreeServer = spawn(
      "bash",
      ["-c", `source venv/bin/activate && python grapetree.py`],
      {
        cwd: GRAPETREE_DIR,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let started = false;
    grapetreeServer.stdout.on("data", (data) => {
      const output = data.toString();
      if (
        (output.includes("Running on") || output.includes("localhost")) &&
        !started
      ) {
        started = true;
        console.log("   ✓ GrapeTree server ready");
        setTimeout(resolve, 2000);
      }
    });

    grapetreeServer.stderr.on("data", (data) => {
      const output = data.toString();
      if (
        (output.includes("Running on") || output.includes("localhost")) &&
        !started
      ) {
        started = true;
        console.log("   ✓ GrapeTree server ready");
        setTimeout(resolve, 2000);
      }
    });

    setTimeout(() => {
      if (!started) {
        started = true;
        console.log("   ⚠ GrapeTree server timeout, assuming started");
        resolve();
      }
    }, 15000);
  });
}

function stopServers() {
  if (phyd3Server) {
    console.log("   Stopping PhyD3 server...");
    phyd3Server.kill();
    phyd3Server = null;
  }
  if (grapetreeServer) {
    console.log("   Stopping GrapeTree server...");
    grapetreeServer.kill();
    grapetreeServer = null;
  }
}

// =============================================================================
// PhyD3 BENCHMARKING (Local) - runs on port 8080 via http-server
// =============================================================================
async function benchmarkPhyD3(page, newickFile, datasetName) {
  console.log(`   [PhyD3] Testing ${datasetName}...`);
  const runs = [];
  const newickContent = readFileSync(newickFile, "utf-8");

  for (let i = 1; i <= RUNS_PER_DATASET; i++) {
    console.log(`      Run ${i}/${RUNS_PER_DATASET}...`);

    try {
      // Navigate to PhyD3 local server - use 'load' instead of 'networkidle' for faster response
      await page.goto("http://localhost:8080/", {
        waitUntil: "load",
        timeout: 60000,
      });

      // Wait for page to be ready
      await page.waitForSelector("#newick-input", { timeout: 10000 });

      const startTime = performance.now();

      // Fill textarea using JavaScript to avoid issues with large content
      await page.evaluate((content) => {
        document.getElementById("newick-input").value = content;
      }, newickContent);

      // Click load button using JavaScript (more reliable)
      await page.evaluate(() => {
        document.getElementById("load-tree").click();
      });

      // Wait for tree to render - PhyD3 uses phylio which is SLOW (~55s+ for parsing 1950 nodes)
      await page.waitForSelector("#tree-container svg", { timeout: 600000 });

      // Wait for rendering to complete (check debug output)
      await page.waitForFunction(
        () => {
          const debug = document.getElementById("debug-output");
          return (
            debug &&
            (debug.textContent.includes("Tree rendered") ||
              debug.textContent.includes("ERROR"))
          );
        },
        { timeout: 600000 }
      );

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Get render time from debug output
      const debugText = await page.locator("#debug-output").textContent();
      const renderMatch = debugText.match(/Render Time: ([\d.]+)ms/);
      const parseMatch = debugText.match(/Parse Time: ([\d.]+)ms/);

      const metrics = await collectPerformanceMetrics(page);

      runs.push({
        totalTime: Math.round(totalTime),
        parseTime: parseMatch ? parseFloat(parseMatch[1]) : 0,
        renderTime: renderMatch ? parseFloat(renderMatch[1]) : 0,
        ...metrics,
      });

      console.log(
        `      ✓ Done: Total=${Math.round(totalTime)}ms, Parse=${
          parseMatch ? parseMatch[1] : "N/A"
        }ms, Render=${renderMatch ? renderMatch[1] : "N/A"}ms`
      );

      // Wait a bit before next run to let things settle
      await page.waitForTimeout(2000);
    } catch (err) {
      console.log(`      ✗ Error: ${err.message}`);
      runs.push(null);
    }
  }

  return runs;
}

// =============================================================================
// PhyloViz Online BENCHMARKING
// Note: PhyloViz Online has a multi-step upload process for Newick files
// Path: Upload Data sets -> Select Newick -> Upload file -> Launch Tree
// =============================================================================
async function benchmarkPhyloViz(page, newickFile, datasetName) {
  console.log(`   [PhyloViz Online] Testing ${datasetName}...`);
  const runs = [];

  for (let i = 1; i <= RUNS_PER_DATASET; i++) {
    console.log(`      Run ${i}/${RUNS_PER_DATASET}...`);

    try {
      const startTime = performance.now();

      // Go to main page first
      await page.goto("https://online.phyloviz.net/index", {
        waitUntil: "networkidle",
        timeout: 60000,
      });

      // Click on "Upload Data sets" in the features menu
      await page.click('a[href*="upload"], :text("Upload Data sets")');
      await page.waitForTimeout(2000);

      // Select "Newick" as the input format
      const newickOption = await page
        .locator(
          'input[value="newick"], :text("Newick"), label:has-text("Newick")'
        )
        .first();
      if ((await newickOption.count()) > 0) {
        await newickOption.click();
      }
      await page.waitForTimeout(1000);

      // Upload the newick file
      const fileInput = await page.locator('input[type="file"]').first();
      if ((await fileInput.count()) > 0) {
        await fileInput.setInputFiles(newickFile);
      }
      await page.waitForTimeout(2000);

      // Fill in dataset name if required
      const nameInput = await page
        .locator('input[name="name"], input[placeholder*="name"]')
        .first();
      if ((await nameInput.count()) > 0) {
        await nameInput.fill(`benchmark_${Date.now()}`);
      }

      // Click Launch/Submit button
      const launchBtn = await page
        .locator(
          'button:has-text("Launch"), input[value="Launch"], button:has-text("Submit")'
        )
        .first();
      if ((await launchBtn.count()) > 0) {
        await launchBtn.click();
      }

      // Wait for tree visualization (canvas or SVG)
      await page.waitForSelector("canvas, svg, .tree-container", {
        timeout: 120000,
      });
      await page.waitForTimeout(3000);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const metrics = await collectPerformanceMetrics(page);

      runs.push({
        totalTime: Math.round(totalTime),
        ...metrics,
      });

      console.log(`      ✓ Done: Total=${Math.round(totalTime)}ms`);
      await page.waitForTimeout(2000);
    } catch (err) {
      console.log(`      ✗ Error: ${err.message}`);
      runs.push(null);
    }
  }

  return runs;
}

// =============================================================================
// GrapeTree BENCHMARKING (Local) - runs on port 8000
// Uses drag-and-drop file upload, captures console timing
// =============================================================================
async function benchmarkGrapeTree(page, newickFile, datasetName) {
  console.log(`   [GrapeTree] Testing ${datasetName}...`);
  const runs = [];
  const newickContent = readFileSync(newickFile, "utf-8");

  for (let i = 1; i <= RUNS_PER_DATASET; i++) {
    console.log(`      Run ${i}/${RUNS_PER_DATASET}...`);

    try {
      // Navigate to GrapeTree local server (default port is 8000)
      await page.goto("http://localhost:8000/", {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      const startTime = performance.now();

      // Use loadTreeText() function directly - more reliable than drag-drop
      await page.evaluate((content) => {
        if (typeof loadTreeText === "function") {
          loadTreeText(content);
        } else {
          throw new Error("loadTreeText not found");
        }
      }, newickContent);

      // Wait for "Complete" message in the modal
      await page.waitForFunction(
        () => {
          const waitingInfo = document.getElementById("waiting-information");
          return waitingInfo && waitingInfo.textContent.includes("Complete");
        },
        { timeout: 180000 }
      );

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Get node count
      const nodeCount = await page.evaluate(() => {
        return document.querySelectorAll(".node").length;
      });

      const metrics = await collectPerformanceMetrics(page);

      runs.push({
        totalTime: Math.round(totalTime),
        nodeCount,
        ...metrics,
      });

      console.log(
        `      ✓ Done: Total=${Math.round(totalTime)}ms, Nodes=${nodeCount}`
      );

      await page.waitForTimeout(1000);
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
      ...Array.from(
        { length: RUNS_PER_DATASET },
        (_, i) => `Run${i + 1}_Total(ms)`
      ),
      "Median_Total(ms)",
      "Mean_Total(ms)",
      "StdDev_Total(ms)",
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
    const failLine = [
      `"${toolName}"`,
      `"${datasetName}"`,
      nodeCount,
      ...Array(RUNS_PER_DATASET).fill("FAIL"),
      ...Array(10).fill("N/A"),
    ];
    return failLine.join(",") + "\n";
  }

  const runTotals = runs.map((r) => (r ? r.totalTime : "FAIL"));

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
  console.log("🚀 Starting EXTENDED Web Tool Benchmarks...");
  console.log("📊 Tools to benchmark:");
  if (TOOLS.phyd3) console.log("   - PhyD3 (local)");
  if (TOOLS.phyloviz) console.log("   - PhyloViz Online");
  if (TOOLS.grapetree) console.log("   - GrapeTree (local)");
  console.log(`\n📁 Found ${NEWICK_DATASETS.length} Newick datasets:\n`);

  for (const dataset of NEWICK_DATASETS) {
    const nodeCount = countNewickLeaves(dataset.file);
    console.log(`   - ${dataset.name} (~${nodeCount} leaves)`);
  }
  console.log("\n");

  const validDatasets = NEWICK_DATASETS.filter((d) => existsSync(d.file));

  // Start local servers as needed (skip if --no-servers flag is set)
  if (!SKIP_SERVERS) {
    if (TOOLS.phyd3) {
      await startPhyD3Server();
    }
    if (TOOLS.grapetree) {
      await startGrapeTreeServer();
    }
  } else {
    console.log("   Skipping server management (--no-servers flag set)");
    console.log("   Make sure servers are running manually:");
    if (TOOLS.phyd3) console.log("     - PhyD3: http://localhost:8080");
    if (TOOLS.grapetree) console.log("     - GrapeTree: http://localhost:8000");
    console.log("");
  }

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
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  });

  const page = await context.newPage();

  // Write CSV header
  writeFileSync(CSV_FILENAME, generateCSVHeader());

  try {
    // PhyD3
    if (TOOLS.phyd3) {
      console.log("\n📊 Benchmarking PhyD3 (local)...");
      console.log("=".repeat(60));

      for (const dataset of validDatasets) {
        const nodeCount = countNewickLeaves(dataset.file);
        const runs = await benchmarkPhyD3(page, dataset.file, dataset.name);
        appendFileSync(
          CSV_FILENAME,
          generateCSVLine("PhyD3", dataset.name, nodeCount, runs)
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

    // PhyloViz Online
    if (TOOLS.phyloviz) {
      console.log("\n📊 Benchmarking PhyloViz Online...");
      console.log("=".repeat(60));

      for (const dataset of validDatasets) {
        const nodeCount = countNewickLeaves(dataset.file);
        const runs = await benchmarkPhyloViz(page, dataset.file, dataset.name);
        appendFileSync(
          CSV_FILENAME,
          generateCSVLine("PhyloViz Online", dataset.name, nodeCount, runs)
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

    // GrapeTree
    if (TOOLS.grapetree) {
      console.log("\n📊 Benchmarking GrapeTree (local)...");
      console.log("=".repeat(60));

      for (const dataset of validDatasets) {
        const nodeCount = countNewickLeaves(dataset.file);
        const runs = await benchmarkGrapeTree(page, dataset.file, dataset.name);
        appendFileSync(
          CSV_FILENAME,
          generateCSVLine("GrapeTree", dataset.name, nodeCount, runs)
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
  } finally {
    await browser.close();
    stopServers();
  }
}

// Handle cleanup on exit
process.on("SIGINT", () => {
  stopServers();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopServers();
  process.exit(0);
});

runBenchmarks().catch((err) => {
  console.error("Benchmark failed:", err);
  stopServers();
  process.exit(1);
});
