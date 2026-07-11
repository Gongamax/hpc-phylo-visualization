#!/usr/bin/env node
/*
 * eval/run-itol.js - iTOL batch upload/export benchmark adapter.
 *
 * Required:
 *   ITOL_API_KEY=<key>
 *
 * Optional:
 *   ITOL_PROJECT=phylolens-eval
 *   ITOL_EXPORT=0|1
 *   ITOL_FORMAT=svg|png|pdf|eps|newick|nexus|phyloxml
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { DATASETS, selectDatasets } from "./config/datasets.js";
import { appendCsv, readCsv, writeCsv } from "./lib/csv.js";
import { collectEnvironment } from "./lib/env.js";
import { classifyFailure } from "./lib/failures.js";
import { newickToEdgeList, readNewick } from "./lib/newick.js";
import { median, round } from "./lib/stats.js";

const RUNS = Number(process.env.RUNS ?? 1);
const APPEND_RESULTS = process.env.APPEND_RESULTS === "1";
const OUT_DIR = path.resolve(import.meta.dirname, "results");
const ARTIFACT_DIR = path.resolve(import.meta.dirname, "artifacts", "itol");
const RUNS_CSV = path.join(OUT_DIR, "runs.csv");
const SUMMARY_CSV = path.join(OUT_DIR, "summary.csv");
const ENVIRONMENT_CSV = path.join(OUT_DIR, "environment.csv");
const ENVIRONMENT_JSON = path.join(OUT_DIR, "environment.json");
const API_KEY = process.env.ITOL_API_KEY ?? "";
const PROJECT = process.env.ITOL_PROJECT ?? "phylolens-eval";
const EXPORT = process.env.ITOL_EXPORT === "1";
const FORMAT = process.env.ITOL_FORMAT ?? "svg";

const RUN_COLUMNS = [
  "iso",
  "tool_id",
  "tool",
  "tool_category",
  "input_format",
  "dataset_id",
  "dataset",
  "dataset_group",
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
  "median_load_ms",
  "median_parse_ms",
  "median_render_ms",
  "median_total_ms",
  "median_heap_delta_mb",
];

function splitEnv(name) {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function numeric(value) {
  if (value === "" || value === null || value === undefined) return NaN;
  return Number(value);
}

function summarize(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.tool}\t${row.dataset}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  return [...groups.values()].map((groupRows) => {
    const successful = groupRows.filter((row) => row.success === "true");
    const first = successful[0] ?? groupRows[0];
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
      median_load_ms: round(median(successful.map((row) => numeric(row.load_ms)))),
      median_parse_ms: round(median(successful.map((row) => numeric(row.parse_ms)))),
      median_render_ms: round(median(successful.map((row) => numeric(row.render_ms)))),
      median_total_ms: round(median(successful.map((row) => numeric(row.total_ms)))),
      median_heap_delta_mb: "",
    };
  });
}

function assertApiKey() {
  if (!API_KEY) {
    throw new Error("ITOL_API_KEY is required for iTOL batch benchmarking");
  }
}

function makeZip(dataset, run) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "phylolens-itol-"));
  const treePath = path.join(tmpDir, `${dataset.id}.tree`);
  const zipPath = path.join(tmpDir, `${dataset.id}-${run}.zip`);
  fs.copyFileSync(dataset.newickPath, treePath);
  execFileSync("zip", ["-q", "-j", zipPath, treePath]);
  return { tmpDir, zipPath };
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

async function uploadToItol(dataset, run) {
  const { tmpDir, zipPath } = makeZip(dataset, run);
  try {
    const form = new FormData();
    const zip = new Blob([fs.readFileSync(zipPath)], { type: "application/zip" });
    form.set("zipFile", zip, path.basename(zipPath));
    form.set("APIkey", API_KEY);
    form.set("projectName", PROJECT);
    form.set("treeName", `${dataset.id}-run-${run + 1}`);

    const started = performance.now();
    const response = await fetch("https://itol.embl.de/batch_uploader.cgi", {
      method: "POST",
      body: form,
    });
    const text = await response.text();
    const uploadMs = performance.now() - started;
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);

    const match = text.match(/SUCCESS:\s*([0-9]+)/);
    if (!match) throw new Error(text.replace(/\s+/g, " ").trim());
    return { treeId: match[1], uploadMs, uploadText: text.trim() };
  } finally {
    cleanup(tmpDir);
  }
}

async function exportFromItol(treeId, dataset, run) {
  if (!EXPORT) return { exportMs: "", artifact: "itol-tree-id", detail: `tree_id=${treeId}` };

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const form = new FormData();
  form.set("tree", treeId);
  form.set("format", FORMAT);
  form.set("display_mode", "1");
  form.set("export_area", "0");

  const started = performance.now();
  const response = await fetch("https://itol.embl.de/batch_downloader.cgi", {
    method: "POST",
    body: form,
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  const exportMs = performance.now() - started;
  if (!response.ok) throw new Error(`iTOL export failed with HTTP ${response.status}`);

  const artifactPath = path.join(ARTIFACT_DIR, `${dataset.id}-run-${run + 1}.${FORMAT}`);
  fs.writeFileSync(artifactPath, bytes);
  return {
    exportMs,
    artifact: FORMAT,
    detail: `tree_id=${treeId}; artifact=${artifactPath}; bytes=${bytes.length}`,
  };
}

async function runOne(dataset, run) {
  const newick = readNewick(dataset.newickPath);
  const edges = newickToEdgeList(newick);
  const nodes = new Set(edges.flat()).size;
  const uploaded = await uploadToItol(dataset, run);
  const exported = await exportFromItol(uploaded.treeId, dataset, run);
  return {
    nodes,
    edges: edges.length,
    load_ms: uploaded.uploadMs,
    parse_ms: "",
    render_ms: exported.exportMs,
    total_ms: Number(uploaded.uploadMs) + Number(exported.exportMs || 0),
    render_artifact: exported.artifact,
    validation_detail: exported.detail,
  };
}

async function main() {
  assertApiKey();

  const datasets = selectDatasets(splitEnv("DATASETS"));
  const environment = await collectEnvironment(null, {
    headless: "",
    viewport: { width: "", height: "" },
    deviceScaleFactor: "",
    runs: RUNS,
  });
  writeCsv(ENVIRONMENT_CSV, [environment], Object.keys(environment));
  fs.writeFileSync(ENVIRONMENT_JSON, JSON.stringify(environment, null, 2) + "\n");
  if (!APPEND_RESULTS) writeCsv(RUNS_CSV, [], RUN_COLUMNS);

  const rows = APPEND_RESULTS ? readCsv(RUNS_CSV) : [];
  console.log(`runs=${RUNS}`);
  console.log(`tool=itol`);
  console.log(`datasets=${datasets.map((dataset) => dataset.id).join(", ")}`);

  for (const dataset of datasets) {
    console.log(`  [dataset] ${dataset.label}`);
    for (let run = 0; run < RUNS; run++) {
      const base = {
        iso: new Date().toISOString(),
        tool_id: "itol",
        tool: "iTOL",
        tool_category: "web-service",
        input_format: "Newick batch upload",
        dataset_id: dataset.id,
        dataset: dataset.label,
        dataset_group: dataset.group,
        run,
        browser: "",
        node_version: environment.node_version,
        git_commit: environment.git_commit,
        viewport_width: "",
        viewport_height: "",
      };

      try {
        const metrics = await runOne(dataset, run);
        const row = {
          ...base,
          success: "true",
          failure_kind: "",
          rendered: "true",
          render_artifact: metrics.render_artifact,
          nodes: round(metrics.nodes, 0),
          edges: round(metrics.edges, 0),
          load_ms: round(metrics.load_ms),
          parse_ms: metrics.parse_ms,
          render_ms: round(metrics.render_ms),
          total_ms: round(metrics.total_ms),
          heap_before_mb: "",
          heap_after_mb: "",
          heap_delta_mb: "",
          metric_source: "itol-batch-api",
          validation_detail: metrics.validation_detail,
          error: "",
        };
        rows.push(row);
        appendCsv(RUNS_CSV, row, RUN_COLUMNS);
        console.log(`    run ${run + 1}/${RUNS}: ${row.total_ms} ms`);
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
          metric_source: "itol-batch-api",
          validation_detail: "",
          error: error.message,
        };
        rows.push(row);
        appendCsv(RUNS_CSV, row, RUN_COLUMNS);
        console.warn(`    run ${run + 1}/${RUNS}: failed - ${error.message}`);
      }
    }
  }

  writeCsv(SUMMARY_CSV, summarize(rows), SUMMARY_COLUMNS);
  console.log(`\nDone -> ${RUNS_CSV}`);
  console.log(`Summary -> ${SUMMARY_CSV}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
