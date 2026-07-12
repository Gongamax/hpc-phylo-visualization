#!/usr/bin/env node
/*
 * eval/run-static.js - CLI/static renderer benchmarks for ETE3 and ggtree.
 *
 * Examples:
 *   TOOLS=ete3 DATASETS=sim-1k RUNS=1 npm run benchmark:static
 *   TOOLS=ete3,ggtree DATASETS=salmonella-10k RUNS=7 npm run benchmark:static
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DATASETS, selectDatasets } from "./config/datasets.js";
import { selectStaticTools } from "./config/tools.js";
import { appendCsv, readCsv, writeCsv } from "./lib/csv.js";
import { classifyFailure } from "./lib/failures.js";
import { median, percentile, round } from "./lib/stats.js";

const RUNS = Number(process.env.RUNS ?? 7);
const WARMUP_RUNS = Number(process.env.WARMUP_RUNS ?? 1);
const APPEND_RESULTS = process.env.APPEND_RESULTS === "1";
const OUT_DIR = path.resolve(import.meta.dirname, "results");
const ARTIFACT_DIR = path.resolve(import.meta.dirname, "artifacts");
const RUNS_CSV = path.join(OUT_DIR, "runs.csv");
const SUMMARY_CSV = path.join(OUT_DIR, "summary.csv");

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

function gitCommit() {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
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

function runTool(tool, dataset, run) {
  const artifact = path.join(
    ARTIFACT_DIR,
    tool.id,
    `${dataset.id}-run-${run}.${tool.outputExtension}`
  );
  fs.mkdirSync(path.dirname(artifact), { recursive: true });

  const [bin, baseArgs] = tool.command;
  const result = spawnSync(bin, [...baseArgs, dataset.newickPath, artifact], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `${bin} exited with ${result.status}`).trim());
  }

  return JSON.parse(result.stdout.trim());
}

function main() {
  const tools = selectStaticTools(splitEnv("TOOLS"));
  const datasets = selectDatasets(splitEnv("DATASETS"));
  const commit = gitCommit();
  const rows = APPEND_RESULTS ? readCsv(RUNS_CSV) : [];

  console.log(`runs=${RUNS} warmup_runs=${WARMUP_RUNS}`);
  console.log(`platform=${os.type()} ${os.release()} ${os.arch()}`);
  console.log(`tools=${tools.map((tool) => tool.id).join(", ")}`);
  console.log(`datasets=${datasets.map((dataset) => dataset.id).join(", ")}`);

  if (!APPEND_RESULTS) writeCsv(RUNS_CSV, [], RUN_COLUMNS);

  for (const tool of tools) {
    console.log(`\n[tool] ${tool.name}`);
    for (const dataset of datasets) {
      console.log(`  [dataset] ${dataset.label}`);

      for (let iteration = 0; iteration < WARMUP_RUNS + RUNS; iteration++) {
        const phase = iteration < WARMUP_RUNS ? "warmup" : "measured";
        const run = phase === "warmup" ? iteration : iteration - WARMUP_RUNS;
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
          browser: "",
          node_version: process.version,
          git_commit: commit,
          viewport_width: "",
          viewport_height: "",
        };

        try {
          const metrics = runTool(tool, dataset, run);
          const row = {
            ...base,
            success: "true",
            failure_kind: "",
            rendered: String(metrics.rendered),
            render_artifact: metrics.render_artifact,
            nodes: round(metrics.nodes, 0),
            edges: round(metrics.edges, 0),
            load_ms: round(metrics.load_ms),
            parse_ms: round(metrics.parse_ms),
            render_ms: round(metrics.render_ms),
            total_ms: round(metrics.total_ms),
            heap_before_mb: "",
            heap_after_mb: "",
            heap_delta_mb: round(metrics.memory_mb),
            metric_source: tool.type,
            validation_detail: metrics.rendered ? "output file exists" : "output file missing",
            error: "",
          };

          rows.push(row);
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
            error: error.message,
          };

          rows.push(row);
          appendCsv(RUNS_CSV, row, RUN_COLUMNS);
          const label = phase === "warmup" ? `warmup ${run + 1}/${WARMUP_RUNS}` : `run ${run + 1}/${RUNS}`;
          console.warn(`    ${label}: failed - ${error.message}`);
        }
      }
    }
  }

  writeCsv(SUMMARY_CSV, summarize(rows), SUMMARY_COLUMNS);
  console.log(`\nDone -> ${RUNS_CSV}`);
  console.log(`Summary -> ${SUMMARY_CSV}`);
}

main();
