// phylotree-benchmark.js - Radial render performance benchmark
// Requires: npm i -D playwright

import { chromium } from "playwright";
import { writeFileSync, appendFileSync } from "fs";

const APP_URL = "http://localhost:5173/"; // run `npm run dev`
const RUNS = 7;
const CSV = "phylotree_benchmark_results.csv";

const DATASETS = [
  //   { key: "sim-1k", label: "Phylo: Simulated 1K" },
  //   { key: "sim-3k", label: "Phylo: Simulated 3K" },
  //   { key: "sim-10k", label: "Phylo: Simulated 10K" },
  //   { key: "sim-30k", label: "Phylo: Simulated 30K" },
  //   { key: "sim-50k", label: "Phylo: Simulated 50K" },
  //   { key: "sim-200k", label: "Phylo: Simulated 200K" },
  { key: "sim-500k", label: "Phylo: Simulated 500k" },
  //   { key: "clostridium-upgma", label: "Phylo: Clostridium UPGMA" },
  //   { key: "clostridium-goe", label: "Phylo: Clostridium goeBURST" },
  //   { key: "salmonella-100k", label: "Phylo: Salmonella 100K" },
  //   { key: "vibrio-upgma", label: "Phylo: Vibrio UPGMA" },
  //   { key: "vibrio-goe", label: "Phylo: Vibrio goeBURST" },
  //   { key: "coli-mlst", label: "Phylo: C. coli MLST" },
  //   { key: "coli-cgmlst", label: "Phylo: C. coli cgMLST" },
  //   { key: "hinf-mlst", label: "Phylo: H. influenzae MLST" },
  //   { key: "hinf-cgmlst-1", label: "Phylo: H. influenzae cgMLST (1)" },
  //   { key: "hinf-cgmlst-2", label: "Phylo: H. influenzae cgMLST (2)" },
  //   { key: "neisseria-mlst", label: "Phylo: Neisseria MLST" },
  // { key: "neisseria-cgmlst", label: "Phylo: Neisseria cgMLST" },
  //   { key: "saureus-cgmlst", label: "Phylo: S. aureus cgMLST" },
  //   { key: "saureus-nj", label: "Phylo: S. aureus NJ" },
  //   { key: "saureus-mlst", label: "Phylo: S. aureus MLST" },
  //   { key: "spneu-mlst", label: "Phylo: S. pneumoniae MLST" },
  // { key: "spneu-full", label: "Phylo: S. pneumoniae" },
];

const getMedian = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

(async () => {
  console.log("🚀 Starting phylotree radial benchmark...");
  const header =
    "Dataset,Run,Nodes,Edges,Fetch (ms),Parse (ms),Render (ms),Total (ms)\n";
  writeFileSync(CSV, header);

  let browser = await chromium.launch({ headless: false, channel: "chrome" });

  const runs = [];

  for (const ds of DATASETS) {
    console.log(`\n📂 Dataset ${ds.label}`);
    const datasetRuns = [];
    for (let i = 1; i <= RUNS; i++) {
      console.log(`  Run ${i}/${RUNS}...`);
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        const cacheBuster = Date.now();
        await page.goto(`${APP_URL}?run=${cacheBuster}`, {
          waitUntil: "networkidle",
        });
        const metrics = await page.evaluate(async (key) => {
          if (typeof window.__runPhylotreeBenchmark !== "function") {
            throw new Error("__runPhylotreeBenchmark not found on window");
          }
          // Wait for initial render to complete before running benchmark
          if (window.__phylotreeReady) {
            await window.__phylotreeReady;
          }
          return window.__runPhylotreeBenchmark(key);
        }, ds.key);

        datasetRuns.push(metrics);
        const line = `${ds.label},${i},${metrics.nodes},${
          metrics.edges
        },${metrics.fetch.toFixed(2)},${metrics.parse.toFixed(
          2
        )},${metrics.render.toFixed(2)},${metrics.total.toFixed(2)}\n`;
        appendFileSync(CSV, line);
        console.log(
          `    ✓ total ${metrics.total.toFixed(
            2
          )} ms (fetch ${metrics.fetch.toFixed(
            2
          )}, parse ${metrics.parse.toFixed(
            2
          )}, render ${metrics.render.toFixed(2)})`
        );
      } catch (err) {
        console.error("    ❌", err.message);
        datasetRuns.push(null);
        console.log("    🔄 restarting browser...");
        try {
          await context.close();
          await browser.close();
        } catch {
          // ignore
        }
        browser = await chromium.launch({ headless: true });
        continue;
      }
      await context.close();
    }

    const valid = datasetRuns.filter(Boolean);
    if (valid.length) {
      const medFetch = getMedian(valid.map((r) => r.fetch)).toFixed(2);
      const medParse = getMedian(valid.map((r) => r.parse)).toFixed(2);
      const medRender = getMedian(valid.map((r) => r.render)).toFixed(2);
      const medTotal = getMedian(valid.map((r) => r.total)).toFixed(2);
      console.log(
        `  ✅ Median fetch ${medFetch} ms, parse ${medParse} ms, render ${medRender} ms, total ${medTotal} ms (${valid.length}/${RUNS} ok)`
      );
    } else {
      console.log("  ❌ All runs failed");
    }
    runs.push(...datasetRuns);
  }

  await browser.close();
})();
