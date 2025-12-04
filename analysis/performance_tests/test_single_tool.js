/**
 * test_single_tool.js
 * Quick test for a single tool to verify benchmarking works
 *
 * Usage: node test_single_tool.js [phyd3|grapetree|phyloviz]
 */

import { chromium } from "playwright";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, "../../data");

// Find a small test file
function findSmallNewickFile(baseDir) {
  function walkDir(dir) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        const result = walkDir(fullPath);
        if (result) return result;
      } else if (entry.endsWith(".newick") && stat.size < 50000) {
        return fullPath;
      }
    }
    return null;
  }
  return walkDir(baseDir);
}

// Try GrapeTree's own example file first for testing
const grapeTreeExampleFile =
  "/Users/goncalofrutuoso/Developer/GrapeTree/examples/ebola.nwk";
const ete3File =
  "/Users/goncalofrutuoso/Developer/Thesis/data/simulated/ete3/tree_1k.newick";
const testFile =
  process.argv[3] === "grapetree-example"
    ? grapeTreeExampleFile
    : process.argv[3] === "ete3"
    ? ete3File
    : findSmallNewickFile(DATA_DIR);
console.log(`Using test file: ${testFile}`);

const tool = process.argv[2] || "phyd3";

async function testPhyD3(page) {
  const newickContent = readFileSync(testFile, "utf-8");

  console.log("Testing PhyD3 at http://localhost:8080");
  console.log(`Newick file size: ${newickContent.length} characters`);

  await page.goto("http://localhost:8080/", {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  const startTime = performance.now();

  // Fill textarea using JavaScript to avoid issues with large content
  await page.evaluate((content) => {
    document.getElementById("newick-input").value = content;
  }, newickContent);

  // Give it a moment to process
  await page.waitForTimeout(500);

  // Click load button using JavaScript
  console.log("Clicking load button...");
  await page.evaluate(() => {
    document.getElementById("load-tree").click();
  });

  // Wait for tree - increase timeout for large trees
  console.log("Waiting for tree to render...");
  try {
    await page.waitForSelector("#tree-container svg", { timeout: 120000 });

    // Wait for completion message
    await page.waitForFunction(
      () => {
        const debug = document.getElementById("debug-output");
        return (
          debug &&
          (debug.textContent.includes("Tree rendered") ||
            debug.textContent.includes("ERROR"))
        );
      },
      { timeout: 120000 }
    );
  } catch (e) {
    console.log("Timeout waiting for render, checking debug...");
  }

  const endTime = performance.now();
  console.log(
    `✓ PhyD3 test completed in ${(endTime - startTime).toFixed(0)}ms`
  );

  const debugText = await page.locator("#debug-output").textContent();
  console.log("Debug output:", debugText);
}

async function testGrapeTree(page) {
  const newickContent = readFileSync(testFile, "utf-8");

  console.log("Testing GrapeTree at http://localhost:8000");
  console.log(`Newick file size: ${newickContent.length} characters`);

  // Listen for console messages and errors
  page.on("console", (msg) => {
    const text = msg.text();
    if (
      msg.type() === "error" ||
      text.includes("error") ||
      text.includes("Error")
    ) {
      console.log(`GrapeTree [${msg.type()}]: ${text}`);
    }
  });

  page.on("pageerror", (err) => {
    console.log("Page JS error:", err.message);
    console.log("Stack:", err.stack);
  });

  await page.goto("http://localhost:8000/", {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  const startTime = performance.now();

  // GrapeTree's loadTreeText parses newick and then calls loadMSTree
  // Set layout algorithm to 'force' which might be more robust
  console.log("Calling loadTreeText() with greedy layout (default)...");

  try {
    await page.evaluate((content) => {
      // loadTreeText handles newick parsing and calls loadMSTree internally
      if (typeof loadTreeText === "function") {
        loadTreeText(content);
      } else {
        throw new Error("loadTreeText not found");
      }
    }, newickContent);
  } catch (e) {
    console.log("Error during loadTreeText:", e.message);
  }

  // GrapeTree uses a loading dialog, then creates SVG with nodes
  // Wait for the modal to close and nodes to appear
  console.log("Waiting for tree to render...");
  try {
    // Wait for "Complete" message in the modal
    await page.waitForFunction(
      () => {
        const waitingInfo = document.getElementById("waiting-information");
        return waitingInfo && waitingInfo.textContent.includes("Complete");
      },
      { timeout: 180000 }
    );
    console.log("Tree loading complete!");

    // Get the node count
    const nodeCount = await page.evaluate(() => {
      return document.querySelectorAll(".node").length;
    });
    console.log(`Nodes rendered: ${nodeCount}`);

    // Additional wait for layout to stabilize
    await page.waitForTimeout(1000);
  } catch (e) {
    console.log("Timeout:", e.message);
    // Take screenshot to debug
    await page.screenshot({ path: "grapetree_debug.png" });

    // Check what's on the page
    const pageContent = await page.evaluate(() => {
      const svg = document.getElementById("mst-svg");
      const nodes = document.querySelectorAll(".node");
      const modal = document.getElementById("information-div");
      const waitingInfo = document.getElementById("waiting-information");
      return {
        hasSvg: !!svg,
        nodeCount: nodes.length,
        modalClass: modal ? modal.className : "not found",
        modalDisplay: modal ? modal.style.display : "not found",
        waitingText: waitingInfo ? waitingInfo.textContent : "not found",
      };
    });
    console.log("Page state:", pageContent);
  }

  const endTime = performance.now();
  console.log(
    `✓ GrapeTree test completed in ${(endTime - startTime).toFixed(0)}ms`
  );
}

async function testPhyloViz(page) {
  const newickContent = readFileSync(testFile, "utf-8");

  console.log("Testing PhyloViz Online at https://online.phyloviz.net");
  console.log(`Newick file size: ${newickContent.length} characters`);

  await page.goto("https://online.phyloviz.net/index", {
    waitUntil: "networkidle",
    timeout: 60000,
  });

  // Click upload link
  const uploadLink = await page.locator('a:has-text("Upload")').first();
  if ((await uploadLink.count()) > 0) {
    console.log("Clicking Upload link...");
    await uploadLink.click();
    await page.waitForTimeout(2000);
  }

  // Select "Newick Data" from the inputFormats dropdown
  console.log("Selecting Newick Data format...");
  const formatSelect = await page.locator("#inputFormats");
  await formatSelect.selectOption({ label: "Newick Data" });
  await page.waitForTimeout(1000);

  // FIRST: Fill dataset name (required before upload starts)
  console.log("Filling dataset name FIRST...");
  const nameInput = await page
    .locator(
      'input[placeholder*="Select a name"], input[placeholder*="dataset"]'
    )
    .first();
  if ((await nameInput.count()) > 0) {
    await nameInput.fill(`benchmark_${Date.now()}`);
    console.log("Dataset name filled");
  } else {
    // Try any text input in the form area
    const anyTextInput = await page
      .locator('#simpleForm input[type="text"], .form-control[type="text"]')
      .first();
    if ((await anyTextInput.count()) > 0) {
      await anyTextInput.fill(`benchmark_${Date.now()}`);
      console.log("Dataset name filled (fallback)");
    }
  }
  await page.waitForTimeout(500);

  // NOW: Upload the newick file
  // PhyloViz has a Browse button that triggers a hidden file input
  console.log("Looking for file input...");

  // Method 1: Try to find the file input and set files directly (works with some hidden inputs)
  const fileInputs = await page.locator('input[type="file"]').all();
  console.log(`Found ${fileInputs.length} file inputs`);

  let uploaded = false;
  for (let i = 0; i < fileInputs.length; i++) {
    try {
      await fileInputs[i].setInputFiles(testFile);
      console.log(`Uploaded via file input ${i}`);
      uploaded = true;
      break;
    } catch (e) {
      console.log(`File input ${i} failed: ${e.message}`);
    }
  }

  // Method 2: If direct upload didn't work, click Browse button and use file chooser
  if (!uploaded) {
    console.log("Trying Browse button approach...");
    const browseBtn = await page
      .locator(
        'button:has-text("Browse"), input[value="Browse"], label:has-text("Browse"), .btn:has-text("Browse")'
      )
      .first();
    if ((await browseBtn.count()) > 0) {
      // Set up file chooser listener before clicking
      const [fileChooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        browseBtn.click(),
      ]);
      await fileChooser.setFiles(testFile);
      console.log("Uploaded via file chooser");
      uploaded = true;
    }
  }

  if (!uploaded) {
    console.log("WARNING: Could not upload file!");
  }

  // Wait for upload to complete (spinner to disappear or success message)
  console.log("Waiting for upload to complete...");
  await page.waitForTimeout(3000); // Give it time to upload

  // Check for any loading spinner and wait for it to disappear
  try {
    const spinner = page.locator(
      '.loading, .spinner, [class*="loading"], [class*="spinner"]'
    );
    if ((await spinner.count()) > 0 && (await spinner.isVisible())) {
      console.log("Waiting for spinner to disappear...");
      await spinner.waitFor({ state: "hidden", timeout: 60000 });
    }
  } catch (e) {
    // No spinner found or already hidden
  }

  await page.screenshot({ path: "phyloviz_after_upload.png" });
  console.log("Screenshot saved after upload");

  // Scroll to and click submit button
  const submitBtn = await page.locator("#submitForm");
  if ((await submitBtn.count()) > 0) {
    console.log("Scrolling to submit button...");
    await submitBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const isVisible = await submitBtn.isVisible();
    const isDisabled = await submitBtn.isDisabled();
    console.log(`Submit button: visible=${isVisible}, disabled=${isDisabled}`);

    if (isVisible && !isDisabled) {
      console.log("Clicking Launch Tree...");
      const startTime = performance.now();
      await submitBtn.click();

      // Wait for navigation or visualization
      console.log("Waiting for tree visualization...");
      try {
        await page.waitForSelector("canvas, svg, .graph-container, #cy", {
          timeout: 120000,
        });
        const endTime = performance.now();
        console.log(`✓ Tree loaded in ${(endTime - startTime).toFixed(0)}ms`);
        await page.screenshot({ path: "phyloviz_tree.png" });
      } catch (e) {
        console.log("Timeout or error:", e.message);
        await page.screenshot({ path: "phyloviz_error.png" });

        // Check current URL and page content
        const url = page.url();
        console.log("Current URL:", url);
      }
    } else {
      console.log("Submit button not ready");
      await page.screenshot({ path: "phyloviz_form_state.png" });
    }
  }

  console.log("\nDone with PhyloViz test");
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  try {
    switch (tool) {
      case "phyd3":
        await testPhyD3(page);
        break;
      case "grapetree":
        await testGrapeTree(page);
        break;
      case "phyloviz":
        await testPhyloViz(page);
        break;
      default:
        console.log(`Unknown tool: ${tool}. Use phyd3, grapetree, or phyloviz`);
    }
  } catch (err) {
    console.error("Error:", err.message);
  }

  console.log("\nKeeping browser open for 10 seconds...");
  await page.waitForTimeout(10000);
  await browser.close();
}

main();
