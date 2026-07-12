#!/usr/bin/env node
/*
 * eval/run.js - browser benchmark harness for Phylo-Lens visualization PoCs.
 *
 * Examples:
 *   npm --prefix eval install
 *   RUNS=7 npm --prefix eval run benchmark
 *   TOOLS=phylotree,force-graph DATASETS=sim-1k,sim-3k RUNS=5 npm --prefix eval run benchmark
 *
 * Output:
 *   eval/results/runs.csv     one row per run
 *   eval/results/summary.csv  median row per tool x dataset
 */

import os from "node:os";
import path from "node:path";
import { DATASETS, selectDatasets } from "./config/datasets.js";
import { TOOLS, selectTools } from "./config/tools.js";
import { appendCsv, readCsv, writeCsv } from "./lib/csv.js";
import { datasetExists, installDatasetRoutes, measureHeap, openBrowser } from "./lib/browser.js";
import { classifyFailure } from "./lib/failures.js";
import { collectEnvironment } from "./lib/env.js";
import { newickToEdgeList, readNewick } from "./lib/newick.js";
import { startToolServer } from "./lib/server.js";
import { median, percentile, round } from "./lib/stats.js";
import { validateRender } from "./lib/validation.js";

const RUNS = Number(process.env.RUNS ?? 7);
const WARMUP_RUNS = Number(process.env.WARMUP_RUNS ?? 1);
const HEADLESS = process.env.HEADLESS !== "0";
const APPEND_RESULTS = process.env.APPEND_RESULTS === "1";
const OUT_DIR = path.resolve(import.meta.dirname, "results");
const RUNS_CSV = path.join(OUT_DIR, "runs.csv");
const SUMMARY_CSV = path.join(OUT_DIR, "summary.csv");
const ENVIRONMENT_CSV = path.join(OUT_DIR, "environment.csv");
const ENVIRONMENT_JSON = path.join(OUT_DIR, "environment.json");
const VIEWPORT = { width: Number(process.env.VIEWPORT_WIDTH ?? 1440), height: Number(process.env.VIEWPORT_HEIGHT ?? 900) };
const DEVICE_SCALE_FACTOR = Number(process.env.DEVICE_SCALE_FACTOR ?? 1);

const RUN_COLUMNS = [
  "iso",
  "tool_id",
  "tool",
  "tool_category",
  "input_format",
  "dataset_id",
  "dataset",
  "dataset_group",
  "phase",
  "run",
  "success",
  "failure_kind",
  "rendered",
  "render_artifact",
  "nodes",
  "edges",
  "load_ms",
  "parse_ms",
  "render_ms",
  "total_ms",
  "heap_before_mb",
  "heap_after_mb",
  "heap_delta_mb",
  "metric_source",
  "browser",
  "node_version",
  "git_commit",
  "viewport_width",
  "viewport_height",
  "validation_detail",
  "error",
];

const SUMMARY_COLUMNS = [
  "tool",
  "tool_category",
  "input_format",
  "dataset",
  "dataset_group",
  "runs",
  "successful_runs",
  "validated_runs",
  "failed_runs",
  "failure_kinds",
  "nodes",
  "edges",
  "p25_load_ms",
  "median_load_ms",
  "p75_load_ms",
  "iqr_load_ms",
  "p25_parse_ms",
  "median_parse_ms",
  "p75_parse_ms",
  "iqr_parse_ms",
  "p25_render_ms",
  "median_render_ms",
  "p75_render_ms",
  "iqr_render_ms",
  "p25_total_ms",
  "median_total_ms",
  "p75_total_ms",
  "iqr_total_ms",
  "p25_heap_delta_mb",
  "median_heap_delta_mb",
  "p75_heap_delta_mb",
  "iqr_heap_delta_mb",
];

function splitEnv(name) {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function environmentNote() {
  return {
    platform: `${os.type()} ${os.release()} ${os.arch()}`,
    cpu: os.cpus()[0]?.model ?? "unknown",
    memoryGb: round(os.totalmem() / 1024 ** 3, 1),
  };
}

function parseMetricText(text) {
  const numberAfter = (patterns) => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return Number(match[1]);
    }
    return NaN;
  };

  return {
    nodes: numberAfter([/Nodes:\s*([0-9.]+)/i]),
    edges: numberAfter([/Edges:\s*([0-9.]+)/i]),
    load_ms: numberAfter([/Load:\s*([0-9.]+)ms/i, /Fetch:\s*([0-9.]+)ms/i]),
    parse_ms: numberAfter([/Parse(?: Time)?:\s*([0-9.]+)ms/i]),
    render_ms: numberAfter([/Render(?: Time)?:\s*([0-9.]+)ms/i]),
    total_ms: numberAfter([/Total(?: Time)?:\s*([0-9.]+)ms/i]),
  };
}

function numeric(value) {
  if (value === "" || value === null || value === undefined) return NaN;
  return Number(value);
}

function spread(values) {
  const p25 = percentile(values, 25);
  const p75 = percentile(values, 75);
  return {
    p25: round(p25),
    median: round(median(values)),
    p75: round(p75),
    iqr: round(p75 - p25),
  };
}

async function runPhylotree(page, tool, dataset) {
  const key = dataset.appLabels.phylotree;
  if (!key) throw new Error(`Dataset ${dataset.id} is not configured for ${tool.name}`);

  const result = await page.evaluate(async (datasetKey) => {
    if (!window.__runPhylotreeBenchmark) {
      throw new Error("window.__runPhylotreeBenchmark is not available");
    }
    return window.__runPhylotreeBenchmark(datasetKey);
  }, key);

  return {
    nodes: result.nodes,
    edges: result.edges,
    load_ms: result.fetch,
    parse_ms: result.parse,
    render_ms: result.render,
    total_ms: result.total,
  };
}

async function runSelectBasedTool(page, tool, dataset) {
  const label = dataset.appLabels[tool.type];
  if (!label) throw new Error(`Dataset ${dataset.id} is not configured for ${tool.name}`);

  const selects = await page.locator("select").count();
  if (selects === 0) throw new Error("No dataset selector found");

  await page.locator("select").first().selectOption({ label });

  if (tool.mode && selects > 1) {
    await page.locator("select").nth(1).selectOption({ label: tool.mode });
  }

  await page.waitForFunction(() => /Total(?: Time)?:\s*[0-9.]+ms/i.test(document.body.innerText), {
    timeout: 180_000,
  });
  await page.waitForTimeout(250);

  const text = await page.locator("body").innerText();
  return parseMetricText(text);
}

async function runPhyD3(page, dataset) {
  const newick = readNewick(dataset.newickPath);
  await page.locator("#newick-input").fill(newick);
  await page.locator("#load-tree").click();

  await page.waitForFunction(() => /Tree rendered successfully|ERROR:/i.test(document.querySelector("#debug-output")?.textContent ?? ""), {
    timeout: 180_000,
  });

  const text = await page.locator("#debug-output").evaluate((node) => node.textContent ?? "");
  if (/ERROR:/i.test(text)) throw new Error(text.replace(/\s+/g, " ").trim());

  const metrics = parseMetricText(text);
  if (!Number.isFinite(metrics.nodes) || !Number.isFinite(metrics.edges)) {
    const edges = newickToEdgeList(newick);
    metrics.edges = edges.length;
    metrics.nodes = new Set(edges.flat()).size;
  }

  return metrics;
}

async function runOne(page, tool, dataset) {
  switch (tool.type) {
    case "phylotree":
      return runPhylotree(page, tool, dataset);
    case "phyd3":
      return runPhyD3(page, dataset);
    case "forceGraph":
    case "graphgl":
      return runSelectBasedTool(page, tool, dataset);
    case "cytoscape":
      return runCytoscape(page, dataset);
    case "grapetree":
      return runGrapeTree(page, dataset);
    case "taxonium":
      return runTaxonium(page, dataset);
    case "archaeopteryx":
      return runArchaeopteryx(page, dataset);
    default:
      throw new Error(`No runner implemented for ${tool.type}`);
  }
}

function datasetStem(dataset) {
  return dataset.requestStems?.[0] ?? path.basename(dataset.newickPath).replace(/\.(newick|nwk)$/i, "");
}

function navigationUrl(server, tool, dataset) {
  return `${server.url}${tool.basePath ?? ""}`;
}

async function runCytoscape(page, dataset) {
  const stem = datasetStem(dataset);
  const result = await page.evaluate(async (datasetPath) => {
    if (!window.__runCytoscapeBenchmark) {
      throw new Error("window.__runCytoscapeBenchmark is not available");
    }
    return window.__runCytoscapeBenchmark(datasetPath);
  }, `/data/${stem}_edgelist.csv`);

  return {
    nodes: result.nodes,
    edges: result.edges,
    load_ms: result.load_ms,
    parse_ms: result.parse_ms,
    render_ms: result.render_ms,
    total_ms: result.total_ms,
  };
}

async function runTaxonium(page, dataset) {
  const newick = readNewick(dataset.newickPath);
  const edges = newickToEdgeList(newick);
  const result = await page.evaluate(async (datasetPath) => {
    if (!window.__runTaxoniumBenchmark) {
      throw new Error("window.__runTaxoniumBenchmark is not available");
    }
    return window.__runTaxoniumBenchmark(datasetPath);
  }, `/data/${datasetStem(dataset)}.nwk`);

  return {
    nodes: new Set(edges.flat()).size,
    edges: edges.length,
    load_ms: result.load_ms,
    parse_ms: result.parse_ms,
    render_ms: result.render_ms,
    total_ms: result.total_ms,
  };
}

async function runArchaeopteryx(page, dataset) {
  const result = await page.evaluate(async (datasetPath) => {
    if (!window.__runArchaeopteryxBenchmark) {
      throw new Error("window.__runArchaeopteryxBenchmark is not available");
    }
    return window.__runArchaeopteryxBenchmark(datasetPath);
  }, `/data/${datasetStem(dataset)}.nwk`);

  return {
    nodes: result.nodes,
    edges: result.edges,
    load_ms: result.load_ms,
    parse_ms: result.parse_ms,
    render_ms: result.render_ms,
    total_ms: result.total_ms,
  };
}

async function runGrapeTree(page, dataset) {
  const newick = readNewick(dataset.newickPath);
  const edges = newickToEdgeList(newick);
  const result = await page.evaluate(async (content) => {
    if (typeof window.loadTreeText !== "function") {
      const globals = Object.keys(window).filter((key) => /load|tree/i.test(key)).slice(0, 50);
      const scripts = [...document.scripts].map((script) => script.getAttribute("src") || "inline").slice(-10);
      const body = document.body?.innerText?.slice(0, 300)?.replace(/\s+/g, " ") ?? "";
      throw new Error(
        `loadTreeText not found; url=${location.href}; title=${document.title}; body=${body}; scripts=${scripts.join(";")}; globals=${globals.join(",")}`
      );
    }

    const start = performance.now();
    window.loadTreeText(content);

    await new Promise((resolve, reject) => {
      const deadline = performance.now() + 180_000;
      const timer = setInterval(() => {
        const text = document.getElementById("waiting-information")?.textContent ?? "";
        if (/Complete/i.test(text)) {
          clearInterval(timer);
          resolve(text);
        } else if (performance.now() > deadline) {
          clearInterval(timer);
          reject(new Error(`GrapeTree timed out: ${text}`));
        }
      }, 250);
    });

    return {
      total_ms: performance.now() - start,
      rendered_nodes: document.querySelectorAll(".node").length,
      status: document.getElementById("waiting-information")?.textContent ?? "",
    };
  }, newick);

  return {
    nodes: result.rendered_nodes || new Set(edges.flat()).size,
    edges: edges.length,
    load_ms: 0,
    parse_ms: "",
    render_ms: result.total_ms,
    total_ms: result.total_ms,
  };
}

function summarize(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (row.phase === "warmup") continue;
    const key = `${row.tool}\t${row.dataset}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  return [...groups.values()].map((groupRows) => {
    const successful = groupRows.filter((row) => row.success === "true");
    const first = successful[0] ?? groupRows[0];
    const load = spread(successful.map((row) => numeric(row.load_ms)));
    const parse = spread(successful.map((row) => numeric(row.parse_ms)));
    const render = spread(successful.map((row) => numeric(row.render_ms)));
    const total = spread(successful.map((row) => numeric(row.total_ms)));
    const heap = spread(successful.map((row) => numeric(row.heap_delta_mb)));

    return {
      tool: first.tool,
      tool_category: first.tool_category,
      input_format: first.input_format,
      dataset: first.dataset,
      dataset_group: first.dataset_group,
      runs: groupRows.length,
      successful_runs: successful.length,
      validated_runs: successful.filter((row) => row.rendered === "true").length,
      failed_runs: groupRows.length - successful.length,
      failure_kinds: [...new Set(groupRows.filter((row) => row.failure_kind).map((row) => row.failure_kind))].join("|"),
      nodes: round(median(successful.map((row) => numeric(row.nodes))), 0),
      edges: round(median(successful.map((row) => numeric(row.edges))), 0),
      p25_load_ms: load.p25,
      median_load_ms: load.median,
      p75_load_ms: load.p75,
      iqr_load_ms: load.iqr,
      p25_parse_ms: parse.p25,
      median_parse_ms: parse.median,
      p75_parse_ms: parse.p75,
      iqr_parse_ms: parse.iqr,
      p25_render_ms: render.p25,
      median_render_ms: render.median,
      p75_render_ms: render.p75,
      iqr_render_ms: render.iqr,
      p25_total_ms: total.p25,
      median_total_ms: total.median,
      p75_total_ms: total.p75,
      iqr_total_ms: total.iqr,
      p25_heap_delta_mb: heap.p25,
      median_heap_delta_mb: heap.median,
      p75_heap_delta_mb: heap.p75,
      iqr_heap_delta_mb: heap.iqr,
    };
  });
}

async function main() {
  const tools = selectTools(splitEnv("TOOLS"));
  const datasets = selectDatasets(splitEnv("DATASETS"));

  const missing = datasets.filter((dataset) => !datasetExists(dataset));
  if (missing.length) {
    throw new Error(`Missing dataset files: ${missing.map((dataset) => dataset.newickPath).join(", ")}`);
  }

  console.log(`runs=${RUNS} warmup_runs=${WARMUP_RUNS} headless=${HEADLESS}`);
  console.log(`tools=${tools.map((tool) => tool.id).join(", ")}`);
  console.log(`datasets=${datasets.map((dataset) => dataset.id).join(", ")}`);

  if (!APPEND_RESULTS) writeCsv(RUNS_CSV, [], RUN_COLUMNS);
  const allRows = APPEND_RESULTS ? readCsv(RUNS_CSV) : [];
  const browser = await openBrowser(HEADLESS);
  const environment = await collectEnvironment(browser, {
    headless: HEADLESS,
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    runs: RUNS,
    warmupRuns: WARMUP_RUNS,
  });
  console.log(`environment=${JSON.stringify(environmentNote())}`);
  writeCsv(ENVIRONMENT_CSV, [environment], Object.keys(environment));
  await import("node:fs").then((fs) => fs.writeFileSync(ENVIRONMENT_JSON, JSON.stringify(environment, null, 2) + "\n"));

  try {
    for (const tool of tools) {
      console.log(`\n[tool] ${tool.name}`);
      const server = await startToolServer(tool);

      try {
        for (const dataset of datasets) {
          console.log(`  [dataset] ${dataset.label}`);

          for (let iteration = 0; iteration < WARMUP_RUNS + RUNS; iteration++) {
            const phase = iteration < WARMUP_RUNS ? "warmup" : "measured";
            const run = phase === "warmup" ? iteration : iteration - WARMUP_RUNS;
            const context = await browser.newContext({
              viewport: VIEWPORT,
              deviceScaleFactor: DEVICE_SCALE_FACTOR,
            });
            const page = await context.newPage();
            const pageDiagnostics = [];
            page.on("console", (message) => {
              if (["error", "warning"].includes(message.type())) {
                pageDiagnostics.push(`${message.type()}: ${message.text()}`);
              }
            });
            page.on("pageerror", (error) => {
              pageDiagnostics.push(`pageerror: ${error.message}`);
            });
            await installDatasetRoutes(page, DATASETS, dataset);

            const base = {
              iso: new Date().toISOString(),
              tool_id: tool.id,
              tool: tool.name,
              tool_category: tool.category,
              input_format: tool.input,
              dataset_id: dataset.id,
              dataset: dataset.label,
              dataset_group: dataset.group,
              phase,
              run,
              browser: environment.browser,
              node_version: environment.node_version,
              git_commit: environment.git_commit,
              viewport_width: VIEWPORT.width,
              viewport_height: VIEWPORT.height,
            };

            try {
              const response = await page.goto(navigationUrl(server, tool, dataset), { waitUntil: "networkidle", timeout: 60_000 });
              if (!response || response.status() >= 400) {
                throw new Error(`Navigation failed: status=${response?.status() ?? "none"} url=${page.url()}`);
              }
              const heapBefore = await measureHeap(page);
              const metrics = await runOne(page, tool, dataset);
              const validation = await validateRender(page, tool);
              if (validation.rendered === "false") {
                throw new Error(`Render validation failed: ${validation.validation_detail}`);
              }
              const heapAfter = await measureHeap(page);

              const row = {
                ...base,
                success: "true",
                failure_kind: "",
                ...validation,
                nodes: round(metrics.nodes, 0),
                edges: round(metrics.edges, 0),
                load_ms: round(metrics.load_ms),
                parse_ms: round(metrics.parse_ms),
                render_ms: round(metrics.render_ms),
                total_ms: round(metrics.total_ms),
                heap_before_mb: round(heapBefore),
                heap_after_mb: round(heapAfter),
                heap_delta_mb: round(heapAfter !== null && heapBefore !== null ? heapAfter - heapBefore : NaN),
                metric_source: tool.type,
                error: "",
              };

              allRows.push(row);
              appendCsv(RUNS_CSV, row, RUN_COLUMNS);
              const label = phase === "warmup" ? `warmup ${run + 1}/${WARMUP_RUNS}` : `run ${run + 1}/${RUNS}`;
              console.log(`    ${label}: ${row.total_ms} ms`);
            } catch (error) {
              const row = {
                ...base,
                success: "false",
                failure_kind: classifyFailure(error),
                rendered: "false",
                render_artifact: "",
                nodes: "",
                edges: "",
                load_ms: "",
                parse_ms: "",
                render_ms: "",
                total_ms: "",
                heap_before_mb: "",
                heap_after_mb: "",
                heap_delta_mb: "",
                metric_source: tool.type,
                validation_detail: "",
                error: [error.message, ...pageDiagnostics].filter(Boolean).join(" | "),
              };

              allRows.push(row);
              appendCsv(RUNS_CSV, row, RUN_COLUMNS);
              const label = phase === "warmup" ? `warmup ${run + 1}/${WARMUP_RUNS}` : `run ${run + 1}/${RUNS}`;
              console.warn(`    ${label}: failed - ${error.message}`);
            } finally {
              await context.close();
            }
          }
        }
      } finally {
        server.stop();
      }
    }
  } finally {
    await browser.close();
  }

  writeCsv(SUMMARY_CSV, summarize(allRows), SUMMARY_COLUMNS);
  console.log(`\nDone -> ${RUNS_CSV}`);
  console.log(`Summary -> ${SUMMARY_CSV}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
