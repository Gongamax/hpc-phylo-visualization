#!/usr/bin/env node
/*
 * eval/datasets.js - dataset metadata table for thesis reporting.
 *
 * Output:
 *   eval/tables/dataset_metadata.csv
 *   eval/tables/dataset_metadata.tex
 */

import fs from "node:fs";
import path from "node:path";
import { DATASETS, selectDatasets } from "./config/datasets.js";
import { writeCsv } from "./lib/csv.js";
import { newickToEdgeList, readNewick } from "./lib/newick.js";

const ROOT = import.meta.dirname;
const TABLE_DIR = path.join(ROOT, "tables");
const COLUMNS = [
  "dataset_id",
  "label",
  "group",
  "benchmark_default",
  "tips",
  "nodes",
  "edges",
  "file_size_kb",
  "format",
  "source_path",
];

function splitEnv(name) {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function relativePath(filePath) {
  return path.relative(path.resolve(ROOT, ".."), filePath);
}

function countTips(edges) {
  const sources = new Set(edges.map(([source]) => source));
  const targets = new Set(edges.map(([, target]) => target));
  return [...targets].filter((target) => !sources.has(target)).length;
}

function metadataRow(dataset) {
  const newick = readNewick(dataset.newickPath);
  const edges = newickToEdgeList(newick);
  const file = fs.statSync(dataset.newickPath);

  return {
    dataset_id: dataset.id,
    label: dataset.label,
    group: dataset.group,
    benchmark_default: String(Boolean(dataset.benchmarkDefault)),
    tips: countTips(edges),
    nodes: new Set(edges.flat()).size,
    edges: edges.length,
    file_size_kb: Number((file.size / 1024).toFixed(1)),
    format: path.extname(dataset.newickPath).replace(".", "") || "newick",
    source_path: relativePath(dataset.newickPath),
  };
}

function latexEscape(value) {
  return String(value)
    .replaceAll("\\", String.raw`\textbackslash{}`)
    .replaceAll("&", String.raw`\&`)
    .replaceAll("%", String.raw`\%`)
    .replaceAll("$", String.raw`\$`)
    .replaceAll("#", String.raw`\#`)
    .replaceAll("_", String.raw`\_`)
    .replaceAll("{", String.raw`\{`)
    .replaceAll("}", String.raw`\}`)
    .replaceAll("~", String.raw`\textasciitilde{}`)
    .replaceAll("^", String.raw`\textasciicircum{}`);
}

function writeLatex(filePath, rows) {
  const headers = [
    "Dataset",
    "Group",
    "Default",
    "Tips",
    "Nodes",
    "Edges",
    "Size KB",
    "Format",
  ];
  const bodyColumns = [
    "label",
    "group",
    "benchmark_default",
    "tips",
    "nodes",
    "edges",
    "file_size_kb",
    "format",
  ];

  const lines = [
    String.raw`\begin{tabular}{lllrrrrl}`,
    String.raw`\hline`,
    headers.map(latexEscape).join(" & ") + String.raw` \\`,
    String.raw`\hline`,
  ];

  for (const row of rows) {
    lines.push(bodyColumns.map((column) => latexEscape(row[column])).join(" & ") + String.raw` \\`);
  }

  lines.push(String.raw`\hline`, String.raw`\end{tabular}`, "");
  fs.writeFileSync(filePath, lines.join("\n"));
}

function main() {
  const datasets = selectDatasets(splitEnv("DATASETS"));
  const rows = datasets.map(metadataRow);

  fs.mkdirSync(TABLE_DIR, { recursive: true });
  writeCsv(path.join(TABLE_DIR, "dataset_metadata.csv"), rows, COLUMNS);
  writeLatex(path.join(TABLE_DIR, "dataset_metadata.tex"), rows);
  console.log(`Wrote dataset metadata to ${TABLE_DIR}`);
}

main();
