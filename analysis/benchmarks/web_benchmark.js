/**
 * web_benchmark.js
 *
 * COMPREHENSIVE Automated benchmarking for web-based phylogenetic visualization tools.
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
 * - iTOL (itol.embl.de) - Online, Newick format
 * - Phylotree.js (phylotree.hyphy.org) - Online, Newick format
 * - PhyloScape (darwintree.cn/PhyloScape) - Online, Newick format
 * - PhyD3 (localhost:8080) - Local server, Newick format
 * - PhyloViz (online.phyloviz.net) - Online, Newick format
 * - GrapeTree (localhost:8000) - Local server, Newick format
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
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =============================================================================
// CONFIGURATION - ENABLE/DISABLE TOOLS HERE
// =============================================================================
const RUNS_PER_DATASET = 7;
const CSV_FILENAME = "web_benchmark_results.csv";

// ⚙️ ENABLE/DISABLE TOOLS - Set to true/false to control which tools to benchmark
const TOOLS = {
  itol: true,
  phylotree: false,
  phyloscape: false,
  taxonium: false,
  phyloviz: false,
  phyd3: false,
  grapetree: true,
};

// Paths for local servers
const DATA_DIR = join(__dirname, "../../data/pubmlst/neisseria");
const PHYD3_DIR = join(__dirname, "../../proofs_of_concept/PoC-PhyD3");
const GRAPETREE_DIR = process.env.HOME + "/Developer/GrapeTree";

// Server management
let phyd3Server = null;
let grapetreeServer = null;

// Dynamically discover all .newick and .nwk files under data/
function discoverNewickDatasets(baseDir) {
  const datasets = [];

  function walkDir(dir) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.endsWith(".newick") || entry.endsWith(".nwk")) {
        const relativePath = fullPath.replace(baseDir + "/", "");
        const name = relativePath
          .replace(".newick", "")
          .replace(".nwk", "")
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
  const nwkFile = newickFile.replace(".newick", ".nwk");

  for (let i = 1; i <= RUNS_PER_DATASET; i++) {
    console.log(`      Run ${i}/${RUNS_PER_DATASET}...`);

    try {
      // 1. Clean Refresh
      await page.goto("about:blank"); // Clear GPU memory
      await page.goto("http://darwintree.cn/PhyloScape/#/applicationone", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      // 2. Click "Large Tree" Tab
      await page.getByRole("button", { name: "Large Tree" }).first().click();
      await page.waitForTimeout(1000); // Wait for tab switch animation

      console.log(`      → Waiting for file chooser...`);

      const fileChooserPromise = page.waitForEvent("filechooser");

      // B. Click the button explicitly
      await page
        .locator(".el-upload-dragger, .el-upload")
        .filter({ hasText: /Tree|Upload/i })
        .filter({ hasNot: page.locator("[hidden]") })
        .first()
        .click();

      // C. Intercept the dialog and hand it the file
      const fileChooser = await fileChooserPromise;

      const startTime = performance.now();
      await fileChooser.setFiles(nwkFile);

      // --------------------------------

      // 4. Verification (The Spinner Check)
      // If the spinner doesn't show up in 5s, the upload didn't register.
      try {
        await page.waitForSelector(".el-loading-mask", {
          state: "visible",
          timeout: 5000,
        });
      } catch (e) {
        throw new Error("Spinner never appeared - Upload failed to trigger.");
      }

      // 5. Wait for Completion
      await page.waitForSelector(".el-loading-mask", {
        state: "hidden",
        timeout: 300000,
      });

      // 6. Verify Canvas
      await page.waitForFunction(
        () => {
          const canvas = document.querySelector("canvas");
          return canvas && canvas.width > 50;
        },
        { timeout: 30000 }
      );

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const metrics = await collectPerformanceMetrics(page);

      runs.push({
        totalTime: Math.round(totalTime),
        ...metrics,
      });

      console.log(`      ✓ Done: Total=${Math.round(totalTime)}ms`);
    } catch (err) {
      console.log(`      ✗ Error: ${err.message}`);
      try {
        await page.screenshot({ path: `error_phyloscape_run${i}.png` });
      } catch (e) {}
      runs.push(null);
    }
  }

  return runs;
}
// =============================================================================
// TAXONIUM BENCHMARKING
// =============================================================================
async function benchmarkTaxonium(page, newickFile, datasetName) {
  console.log(`   [Taxonium] Testing ${datasetName}...`);
  const runs = [];

  for (let i = 1; i <= RUNS_PER_DATASET; i++) {
    console.log(`      Run ${i}/${RUNS_PER_DATASET}...`);

    try {
      // 1. FRESH LOAD & RESET
      await page.goto("https://taxonium.org/", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      // 2. UPLOAD
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(newickFile);

      // --- FIX: WAIT FOR FILE RECOGNITION ---
      // Don't click Launch yet. Wait until the UI shows the filename
      // or the generic "Drag and drop" text changes.
      // This ensures the file is parsed by the React state.
      // (We wait for the Launch button to be strictly visible/enabled)
      const launchBtn = page
        .getByRole("button", { name: /Start|Launch|Go/i })
        .first();
      await launchBtn.waitFor({ state: "visible", timeout: 5000 });

      // Small safety pause for React to settle
      await page.waitForTimeout(500);

      // 3. LAUNCH
      console.log("      → Clicking Launch...");
      const startTime = performance.now();
      await launchBtn.click();

      // 4. SMART WAITS (The Fix for "Connecting")

      // A. If "Connecting" appears, wait for it to vanish.
      // We use .catch() because for small files it might vanish instantly before we check.
      const connectingSpinner = page.getByText(/Connecting|Loading/i);
      if (await connectingSpinner.isVisible()) {
        await connectingSpinner.waitFor({ state: "hidden", timeout: 120000 });
      }

      // B. Wait for the Tree Canvas
      // We wait for the canvas to not just exist, but have dimensions.
      await page.waitForFunction(
        () => {
          const canvas = document.querySelector("canvas");
          // Ensure canvas exists and is actually drawn (width > 0)
          return canvas && canvas.clientWidth > 0;
        },
        { timeout: 60000 }
      );

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const metrics = await collectPerformanceMetrics(page);

      runs.push({
        totalTime: Math.round(totalTime),
        ...metrics,
      });

      console.log(`      ✓ Done: ${Math.round(totalTime)} ms`);
    } catch (err) {
      console.log(`      ✗ Error: ${err.message}`);
      await page.screenshot({ path: `error_taxonium_${i}.png` });
      runs.push(null);
    }
  }

  return runs;
}
// =============================================================================
// SERVER MANAGEMENT (for PhyD3 and GrapeTree)
// =============================================================================
async function startPhyD3Server() {
  console.log("   Starting PhyD3 dev server (http://localhost:8080)...");

  return new Promise((resolve) => {
    phyd3Server = spawn("npm", ["run", "dev"], {
      cwd: PHYD3_DIR,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });

    let started = false;
    const checkOutput = (data) => {
      const output = data.toString();
      if (
        (output.includes("Available on") ||
          output.includes("127.0.0.1:8080")) &&
        !started
      ) {
        started = true;
        console.log("   ✓ PhyD3 server ready");
        setTimeout(resolve, 2000);
      }
    };

    phyd3Server.stdout.on("data", checkOutput);
    phyd3Server.stderr.on("data", checkOutput);

    setTimeout(() => {
      if (!started) {
        started = true;
        console.log("   ⚠ PhyD3 server timeout, assuming started");
        resolve();
      }
    }, 15000);
  });
}

async function startGrapeTreeServer() {
  console.log("   Starting GrapeTree server (http://localhost:8000)...");

  return new Promise((resolve) => {
    grapetreeServer = spawn(
      "bash",
      ["-c", `source venv/bin/activate && python grapetree.py`],
      {
        cwd: GRAPETREE_DIR,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let started = false;
    const checkOutput = (data) => {
      const output = data.toString();
      if (
        (output.includes("Running on") || output.includes("localhost")) &&
        !started
      ) {
        started = true;
        console.log("   ✓ GrapeTree server ready");
        setTimeout(resolve, 2000);
      }
    };

    grapetreeServer.stdout.on("data", checkOutput);
    grapetreeServer.stderr.on("data", checkOutput);

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
// PhyD3 BENCHMARKING (Local) - http://localhost:8080
// =============================================================================
async function benchmarkPhyD3(page, newickFile, datasetName) {
  console.log(`   [PhyD3] Testing ${datasetName}...`);
  const runs = [];
  const newickContent = readFileSync(newickFile, "utf-8");

  for (let i = 1; i <= RUNS_PER_DATASET; i++) {
    console.log(`      Run ${i}/${RUNS_PER_DATASET}...`);

    try {
      // Hard timeout wrapper - if test takes longer than 90 seconds, kill it
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Test timeout after 90 seconds")),
          90000
        );
      });

      const testPromise = (async () => {
        await page.goto("http://localhost:8080/", {
          waitUntil: "load",
          timeout: 30000,
        });

        await page.waitForSelector("#newick-input", { timeout: 10000 });
        const startTime = performance.now();

        await page.evaluate((content) => {
          document.getElementById("newick-input").value = content;
        }, newickContent);

        await page.evaluate(() => {
          document.getElementById("load-tree").click();
        });

        await page.waitForSelector("#tree-container svg", { timeout: 60000 });
        await page.waitForFunction(
          () => {
            const debug = document.getElementById("debug-output");
            return (
              debug &&
              (debug.textContent.includes("Tree rendered") ||
                debug.textContent.includes("ERROR"))
            );
          },
          { timeout: 60000 }
        );

        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const metrics = await collectPerformanceMetrics(page);

        return {
          totalTime: Math.round(totalTime),
          ...metrics,
        };
      })();

      const result = await Promise.race([testPromise, timeoutPromise]);
      runs.push(result);

      console.log(`      ✓ Done: Total=${Math.round(result.totalTime)}ms`);
      await page.waitForTimeout(2000);
    } catch (err) {
      console.log(`      ✗ Error: ${err.message}`);
      runs.push(null);
      // Force reload to clear any stuck state
      try {
        await page.goto("about:blank", { timeout: 5000 });
      } catch {}
    }
  }

  return runs;
}

// =============================================================================
// PhyloViz Online BENCHMARKING - https://online.phyloviz.net
// =============================================================================
async function benchmarkPhyloViz(page, newickFile, datasetName) {
  console.log(`   [PhyloViz Online] Testing ${datasetName}...`);
  const runs = [];

  for (let i = 1; i <= RUNS_PER_DATASET; i++) {
    console.log(`      Run ${i}/${RUNS_PER_DATASET}...`);

    try {
      const startTime = performance.now();

      await page.goto("https://online.phyloviz.net/index", {
        waitUntil: "networkidle",
        timeout: 60000,
      });

      await page.click('a[href*="upload"], :text("Upload Data sets")');
      await page.waitForTimeout(2000);

      const newickOption = await page
        .locator(
          'input[value="newick"], :text("Newick"), label:has-text("Newick")'
        )
        .first();
      if ((await newickOption.count()) > 0) {
        await newickOption.click();
      }
      await page.waitForTimeout(1000);

      const fileInput = await page.locator('input[type="file"]').first();
      if ((await fileInput.count()) > 0) {
        await fileInput.setInputFiles(newickFile);
      }
      await page.waitForTimeout(2000);

      const nameInput = await page
        .locator('input[name="name"], input[placeholder*="name"]')
        .first();
      if ((await nameInput.count()) > 0) {
        await nameInput.fill(`benchmark_${Date.now()}`);
      }

      const launchBtn = await page
        .locator(
          'button:has-text("Launch"), input[value="Launch"], button:has-text("Submit")'
        )
        .first();
      if ((await launchBtn.count()) > 0) {
        await launchBtn.click();
      }

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
// GrapeTree BENCHMARKING (Local) - http://localhost:8000
// =============================================================================
async function benchmarkGrapeTree(page, newickFile, datasetName) {
  console.log(`   [GrapeTree] Testing ${datasetName}...`);
  const runs = [];
  const newickContent = readFileSync(newickFile, "utf-8");

  for (let i = 1; i <= RUNS_PER_DATASET; i++) {
    console.log(`      Run ${i}/${RUNS_PER_DATASET}...`);

    try {
      await page.goto("http://localhost:8000/", {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      const startTime = performance.now();

      await page.evaluate((content) => {
        if (typeof loadTreeText === "function") {
          loadTreeText(content);
        } else {
          throw new Error("loadTreeText not found");
        }
      }, newickContent);

      await page.waitForFunction(
        () => {
          const waitingInfo = document.getElementById("waiting-information");
          return waitingInfo && waitingInfo.textContent.includes("Complete");
        },
        { timeout: 180000 }
      );

      const endTime = performance.now();
      const totalTime = endTime - startTime;
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
  console.log("🚀 Starting Comprehensive Web Tool Benchmarks...");
  console.log(
    "📊 Using Chrome DevTools Protocol for real performance metrics\n"
  );

  console.log("🔧 Enabled tools:");
  Object.entries(TOOLS).forEach(([tool, enabled]) => {
    if (enabled) console.log(`   ✓ ${tool}`);
  });
  console.log();

  console.log(`📁 Found ${NEWICK_DATASETS.length} Newick datasets:\n`);
  for (const dataset of NEWICK_DATASETS) {
    const nodeCount = countNewickLeaves(dataset.file);
    console.log(`   - ${dataset.name} (~${nodeCount} leaves)`);
  }
  console.log("\n");

  const validDatasets = NEWICK_DATASETS.filter((d) => existsSync(d.file));

  // Start local servers if needed
  if (TOOLS.phyd3) {
    await startPhyD3Server();
  }
  if (TOOLS.grapetree) {
    await startGrapeTreeServer();
  }

  const browser = await chromium.launch({
    headless: false,
    args: [
      "--enable-precise-memory-info",
      "--use-gl=egl", // Forces hardware acceleration
      "--ignore-gpu-blocklist",
      "--enable-webgl",
      "--enable-webgl2",
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

  try {
    // Benchmark each enabled tool
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

    if (TOOLS.taxonium) {
      console.log("\n📊 Benchmarking Taxonium (taxonium.org)...");
      console.log("=".repeat(60));

      for (const dataset of validDatasets) {
        const nodeCount = countNewickLeaves(dataset.file);
        const runs = await benchmarkTaxonium(page, dataset.file, dataset.name);
        appendFileSync(
          CSV_FILENAME,
          generateCSVLine("Taxonium", dataset.name, nodeCount, runs)
        );

        const validRuns = runs.filter((r) => r !== null);
        if (validRuns.length > 0) {
          const medianTotal = getMedian(validRuns.map((r) => r.totalTime));
          const medianLCP = getMedian(
            validRuns.map((r) => r.largestContentfulPaint)
          );
          console.log(
            `   Summary: Median=${Math.round(medianTotal)}ms, LCP=${Math.round(
              medianLCP
            )}ms\n`
          );
        }
      }
    }

    if (TOOLS.phyloscape) {
      console.log("\n📊 Benchmarking PhyloScape (darwintree.cn/PhyloScape)...");
      console.log("=".repeat(60));

      for (const dataset of validDatasets) {
        const nodeCount = countNewickLeaves(dataset.file);
        const runs = await benchmarkPhyloScape(
          page,
          dataset.file,
          dataset.name
        );
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

    if (TOOLS.phyd3) {
      console.log("\n📊 Benchmarking PhyD3 (localhost:8080)...");
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

    if (TOOLS.phyloviz) {
      console.log("\n📊 Benchmarking PhyloViz Online (online.phyloviz.net)...");
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

    if (TOOLS.grapetree) {
      console.log("\n📊 Benchmarking GrapeTree (localhost:8000)...");
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
    console.log(`\n📊 Metrics captured:`);
    console.log(`   - Total Time (upload + processing + render)`);
    console.log(`   - First Contentful Paint (FCP)`);
    console.log(`   - Largest Contentful Paint (LCP)`);
    console.log(`   - DOM Content Loaded`);
    console.log(`   - Total Blocking Time (TBT)`);
    console.log(`   - Script Duration (JS execution)`);
    console.log(`   - Layout Duration (CSS/layout)`);
  } finally {
    await browser.close();
    stopServers();
  }
}

// Handle cleanup on exit
process.on("SIGINT", () => {
  console.log("\n\n⚠️  Interrupted! Cleaning up...");
  stopServers();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopServers();
  process.exit(0);
});

runBenchmarks().catch((err) => {
  console.error("❌ Benchmark failed:", err);
  stopServers();
  process.exit(1);
});
