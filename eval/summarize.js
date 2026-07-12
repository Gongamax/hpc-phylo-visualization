#!/usr/bin/env node
/*
 * Rebuild eval/results/summary.csv from eval/results/runs.csv.
 */

import fs from "node:fs";
import path from "node:path";
import { writeCsv } from "./lib/csv.js";
import { median, percentile, round } from "./lib/stats.js";

const RUNS_CSV = path.resolve(import.meta.dirname, "results", "runs.csv");
const SUMMARY_CSV = path.resolve(import.meta.dirname, "results", "summary.csv");

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

function parseCsv(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = splitCsvLine(headerLine);

  return lines.map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function splitCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      index++;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      values.push(value);
      value = "";
      continue;
    }

    value += char;
  }

  values.push(value);
  return values;
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

function main() {
  if (!fs.existsSync(RUNS_CSV)) {
    throw new Error(`No runs file found at ${RUNS_CSV}`);
  }

  const rows = parseCsv(fs.readFileSync(RUNS_CSV, "utf8"));
  const groups = new Map();

  for (const row of rows) {
    if (row.phase === "warmup") continue;
    const key = `${row.tool}\t${row.dataset}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const summary = [...groups.values()].map((groupRows) => {
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

  writeCsv(SUMMARY_CSV, summary, SUMMARY_COLUMNS);
  console.log(`Wrote ${SUMMARY_CSV}`);
}

main();
