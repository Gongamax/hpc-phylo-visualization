// PhyD3 Clean Demo - Newick Support via Phylio
import { build } from "@vibbioinfocore/phyd3";
import { parse as parseNewick } from "@vibbioinfocore/phylio";

// Global state
let currentSvg = null;

// Example Newick trees
const examples = {
  simple: "(A,B,(C,D));",
  withBranchLengths: "((Human:0.2,Chimp:0.3):0.3,(Mouse:0.5,Rat:0.4):0.2);",
  complex: "(((A:0.2,B:0.3):0.3,(C:0.5,D:0.3):0.2):0.3,E:0.7):0.0;",
};

window.loadExample = function (exampleName) {
  const input = document.getElementById("newick-input");
  input.value = examples[exampleName];
  showError("");
};

function showError(message) {
  const errorDiv = document.getElementById("error-message");
  if (message) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
  } else {
    errorDiv.style.display = "none";
  }
}

function updateDebugOutput(text) {
  const debugOutput = document.getElementById("debug-output");
  if (debugOutput) {
    debugOutput.textContent = text;
  }
}

function renderTree(newickString) {
  const treeContainer = document.getElementById("tree-container");
  const debugInfo = [];
  const startTotal = performance.now();

  treeContainer.innerHTML = "";

  try {
    debugInfo.push(`Parsing Newick...`);

    // Parse Newick with Phylio
    const startParse = performance.now();
    const phylioData = parseNewick(newickString);
    const parseTime = (performance.now() - startParse).toFixed(2);

    debugInfo.push(`Nodes: ${phylioData.nodes.length}`);
    debugInfo.push(`Edges: ${phylioData.edges.length}`);
    debugInfo.push(`Parse Time: ${parseTime}ms`);

    // Transform Phylio output to PhyD3 format
    debugInfo.push(`Transforming data for PhyD3...`);
    const phyd3Data = {
      metadata: phylioData.metadata,
      nodes: phylioData.nodes.map((node) => ({
        name: node.name,
        event: node.event,
        ref: node.ref,
        length: node.branchLength || 0,
        attributes: new Map(Object.entries(node.attributes || {})),
      })),
      edges: phylioData.edges,
    };

    // PhyD3 build with performance options for large trees
    debugInfo.push(`Building PhyD3 visualization...`);

    // Get user options
    const autoPerformance =
      document.getElementById("opt-auto-performance")?.checked ?? true;
    const showLabels =
      document.getElementById("opt-show-labels")?.checked ?? true;
    const showLengths =
      document.getElementById("opt-show-lengths")?.checked ?? true;

    // For large trees (>1000 nodes), use performance-optimized settings
    const isLargeTree = phyd3Data.nodes.length > 1000;
    const usePerformanceMode = autoPerformance && isLargeTree;

    const options = {
      width: isLargeTree ? 1400 : 800,
      height: isLargeTree ? 1200 : 600,
      dynamicHide: usePerformanceMode,
      showLabels: usePerformanceMode ? false : showLabels,
      showNodeNames: usePerformanceMode ? false : showLabels,
      showLengthValues: showLengths,
      showSupportValues: showLengths,
      showDomains: !usePerformanceMode,
      showGraphs: !usePerformanceMode,
      showTaxonomy: !usePerformanceMode,
      showPhylogram: true,
    };

    if (usePerformanceMode) {
      debugInfo.push(
        `⚡ PERFORMANCE MODE ENABLED (${phyd3Data.nodes.length} nodes)`
      );
      debugInfo.push(`- Labels disabled for performance`);
      debugInfo.push(`- Dynamic hiding enabled`);
      debugInfo.push(`- Extra features disabled`);
    } else {
      debugInfo.push(`Normal rendering mode (${phyd3Data.nodes.length} nodes)`);
    }

    const startRender = performance.now();
    const svg = build(phyd3Data, options);
    const renderTime = (performance.now() - startRender).toFixed(2);

    // Append to container
    currentSvg = svg.node();
    treeContainer.appendChild(currentSvg);

    // Apply custom styles
    styleTree(currentSvg);

    const totalTime = (performance.now() - startTotal).toFixed(2);

    // Enable export button
    document.getElementById("export-svg").disabled = false;

    // Update debug output with performance metrics
    debugInfo.push(``);
    debugInfo.push(`=== Performance Metrics ===`);
    debugInfo.push(`Parse Time: ${parseTime}ms`);
    debugInfo.push(`Render Time: ${renderTime}ms`);
    debugInfo.push(`Total Time: ${totalTime}ms`);
    debugInfo.push(`Tree rendered successfully!`);

    updateDebugOutput(debugInfo.join("\n"));
    showError("");
  } catch (error) {
    console.error("Error rendering tree:", error);
    showError(`Error: ${error.message}`);
    debugInfo.push(`ERROR: ${error.message}`);
    updateDebugOutput(debugInfo.join("\n"));
  }
}

function styleTree(svgNode) {
  try {
    // Style circles
    svgNode.querySelectorAll("circle").forEach((circle) => {
      circle.setAttribute("r", 4);
      circle.setAttribute("fill", "#4CAF50");
      circle.setAttribute("stroke", "#2E7D32");
      circle.setAttribute("stroke-width", "2");
    });

    // Style text labels
    svgNode.querySelectorAll("text").forEach((text) => {
      text.style.fontSize = "13px";
      text.style.fontFamily = "'Segoe UI', sans-serif";
      text.style.fill = "#333";
    });

    // Style paths (branches)
    svgNode.querySelectorAll("path").forEach((path) => {
      path.setAttribute("stroke", "#666");
      path.setAttribute("stroke-width", "2");
      path.setAttribute("fill", "none");
    });

    svgNode.querySelectorAll("line").forEach((line) => {
      line.setAttribute("stroke", "#666");
      line.setAttribute("stroke-width", "2");
    });
  } catch (e) {
    console.warn("Could not apply custom styles:", e);
  }
}

// Event handlers
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing PhyD3 demo...");

  const loadBtn = document.getElementById("load-tree");
  const exportBtn = document.getElementById("export-svg");
  const clearBtn = document.getElementById("clear-tree");

  if (!loadBtn || !exportBtn || !clearBtn) {
    console.error("Required buttons not found in DOM!");
    return;
  }

  loadBtn.addEventListener("click", () => {
    console.log("Load button clicked");
    const newickString = document.getElementById("newick-input").value.trim();
    if (!newickString) {
      showError("Please enter a Newick format tree");
      return;
    }
    renderTree(newickString);
  });

  exportBtn.addEventListener("click", () => {
    if (!currentSvg) return;

    try {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(currentSvg);

      const blob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "phylogenetic-tree.svg";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      showError(`Export failed: ${error.message}`);
    }
  });

  clearBtn.addEventListener("click", () => {
    document.getElementById("tree-container").innerHTML = "";
    currentSvg = null;
    exportBtn.disabled = true;
    showError("");
    updateDebugOutput("");
  });

  // Load default example on page load
  console.log("Loading default tree...");
  const defaultNewick = document.getElementById("newick-input").value;
  if (defaultNewick) {
    renderTree(defaultNewick);
  }
});
