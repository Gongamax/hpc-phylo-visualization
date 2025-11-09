// PhyD3 Clean Demo - Direct PhyloXML Support
import { makeCompatTable, phyloxml } from "@vibbioinfocore/phyd3-parser-compat";
import { build } from "@vibbioinfocore/phyd3";

// Global state
let currentSvg = null;

// Example PhyloXML trees
const examples = {
  simple: `<?xml version="1.0" encoding="UTF-8"?>
<phyloxml xmlns="http://www.phyloxml.org">
  <phylogeny rooted="true">
    <clade>
      <name>Root</name>
      <clade><name>A</name></clade>
      <clade><name>B</name></clade>
    </clade>
  </phylogeny>
</phyloxml>`,
  
  withBranchLengths: `<?xml version="1.0" encoding="UTF-8"?>
<phyloxml xmlns="http://www.phyloxml.org">
  <phylogeny rooted="true">
    <clade>
      <clade>
        <name>Human</name>
        <branch_length>0.2</branch_length>
      </clade>
      <clade>
        <name>Chimp</name>
        <branch_length>0.3</branch_length>
      </clade>
    </clade>
  </phylogeny>
</phyloxml>`,
};

window.loadExample = function (exampleName) {
  const input = document.getElementById("phyloxml-input");
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

function renderTree(phyloXMLString) {
  let debugInfo = [];

  try {
    showError("");
    debugInfo.push(`Parsing PhyloXML...\n`);

    // Parse the PhyloXML
    const parser = new DOMParser();
    const doc = parser.parseFromString(phyloXMLString, "text/xml");

    // Check for XML parsing errors
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      throw new Error("Invalid XML format");
    }
    debugInfo.push(`✓ XML parsed successfully\n`);

    // Build the tree using PhyD3
    const svg = build(makeCompatTable(phyloxml.parse(doc)));
    debugInfo.push(`✓ Tree built\n`);

    const svgNode = svg && (typeof svg.node === "function" ? svg.node() : svg);
    if (!svgNode) {
      throw new Error("Failed to build tree visualization");
    }

    // Clear container and append new tree
    const container = document.getElementById("tree-container");
    container.innerHTML = "";
    container.appendChild(svgNode);
    currentSvg = svgNode;
    document.getElementById("export-svg").disabled = false;

    // Style the SVG for better visibility
    styleTree(svgNode);
    debugInfo.push(`✓ Tree rendered successfully!`);

    updateDebugOutput(debugInfo.join("\n"));
  } catch (error) {
    console.error("Error rendering tree:", error);
    debugInfo.push(`\n❌ ERROR: ${error.message}`);
    updateDebugOutput(debugInfo.join("\n"));
    showError(`Error: ${error.message}`);
    document.getElementById("export-svg").disabled = true;
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
    const phyloXMLString = document.getElementById("phyloxml-input").value.trim();
    if (!phyloXMLString) {
      showError("Please enter a PhyloXML tree");
      return;
    }
    renderTree(phyloXMLString);
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
  const defaultXML = document.getElementById("phyloxml-input").value;
  if (defaultXML) {
    renderTree(defaultXML);
  }
});
