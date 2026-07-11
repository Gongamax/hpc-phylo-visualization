#!/usr/bin/env node
/*
 * Rebuild eval/results/summary.csv from eval/results/runs.csv.
 */

import fs from "node:fs";
import path from "node:path";
import { writeCsv } from "./lib/csv.js";
import { median, round } from "./lib/stats.js";

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
  "median_load_ms",
  "median_parse_ms",
  "median_render_ms",
  "median_total_ms",
  "median_heap_delta_mb",
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

function main() {
  if (!fs.existsSync(RUNS_CSV)) {
    throw new Error(`No runs file found at ${RUNS_CSV}`);
  }

  const rows = parseCsv(fs.readFileSync(RUNS_CSV, "utf8"));
  const groups = new Map();

  for (const row of rows) {
    const key = `${row.tool}\t${row.dataset}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const summary = [...groups.values()].map((groupRows) => {
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
      median_heap_delta_mb: round(median(successful.map((row) => numeric(row.heap_delta_mb)))),
    };
  });

  writeCsv(SUMMARY_CSV, summary, SUMMARY_COLUMNS);
  console.log(`Wrote ${SUMMARY_CSV}`);
}

main();
