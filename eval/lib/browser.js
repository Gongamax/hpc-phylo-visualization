import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { newickToEdgeCsv, readNewick } from "./newick.js";

const browserArgs = ["--js-flags=--expose-gc"];

export async function openBrowser(headless) {
  return chromium.launch({ headless, args: browserArgs });
}

export async function installDatasetRoutes(page, datasets, activeDataset = null) {
  const byFileName = new Map();
  const proxyStems = new Set((activeDataset?.proxyRequestStems ?? []).map((stem) => stem.toLowerCase()));

  for (const dataset of datasets) {
    const baseName = path.basename(dataset.newickPath).replace(/\.(newick|nwk)$/i, "");
    byFileName.set(baseName.toLowerCase(), dataset);
    for (const stem of dataset.requestStems ?? []) {
      byFileName.set(stem.toLowerCase(), dataset);
    }
  }

  await page.route("**/data/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = decodeURIComponent(url.pathname);
    const filename = path.basename(pathname);
    const wantsEdgeList = filename.endsWith("_edgelist.csv");
    const stem = filename
      .replace(/_edgelist\.csv$/i, "")
      .replace(/\.(newick|nwk)$/i, "")
      .toLowerCase();

    const dataset = proxyStems.has(stem) ? activeDataset : byFileName.get(stem);
    if (!dataset) return route.continue();

    const newick = readNewick(dataset.newickPath);
    if (wantsEdgeList) {
      return route.fulfill({
        status: 200,
        contentType: "text/csv",
        body: newickToEdgeCsv(newick),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: newick,
    });
  });
}

export async function measureHeap(page) {
  return page.evaluate(() => {
    if (window.gc) window.gc();
    if (!performance.memory) return null;
    return performance.memory.usedJSHeapSize / 1024 / 1024;
  });
}

export function datasetExists(dataset) {
  return fs.existsSync(dataset.newickPath);
}
