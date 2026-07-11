import { build } from "@vibbioinfocore/phyd3";
import { parse as parseNewick } from "@vibbioinfocore/phylio";

const inputEl = document.getElementById("newick-input");
const renderButton = document.getElementById("load-tree");
const treeEl = document.getElementById("tree-container");
const outputEl = document.getElementById("debug-output");
const errorEl = document.getElementById("error-message");

function toPhyD3Tree(parsedTree) {
  return {
    metadata: parsedTree.metadata,
    nodes: parsedTree.nodes.map((node) => ({
      name: node.name,
      event: node.event,
      ref: node.ref,
      length: node.branchLength || 0,
      attributes: new Map(Object.entries(node.attributes || {})),
    })),
    edges: parsedTree.edges,
  };
}

function renderMetrics(metrics) {
  outputEl.textContent = [
    `Nodes: ${metrics.nodes}`,
    `Edges: ${metrics.edges}`,
    `Parse Time: ${metrics.parse_ms.toFixed(2)}ms`,
    `Render Time: ${metrics.render_ms.toFixed(2)}ms`,
    `Total Time: ${metrics.total_ms.toFixed(2)}ms`,
    "Tree rendered successfully",
  ].join(" | ");
}

function renderError(error) {
  errorEl.textContent = error.message;
  outputEl.textContent = `ERROR: ${error.message}`;
}

async function waitForPaint() {
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

export async function renderTree(newick) {
  const totalStart = performance.now();
  treeEl.innerHTML = "";
  outputEl.textContent = "Rendering...";
  errorEl.textContent = "";

  const parseStart = performance.now();
  const parsedTree = parseNewick(newick);
  const tree = toPhyD3Tree(parsedTree);
  const parseMs = performance.now() - parseStart;

  const renderStart = performance.now();
  const svg = build(tree, {
    width: 1400,
    height: 1000,
    dynamicHide: tree.nodes.length > 1000,
    showLabels: tree.nodes.length <= 1000,
    showNodeNames: tree.nodes.length <= 1000,
    showLengthValues: false,
    showSupportValues: false,
    showDomains: false,
    showGraphs: false,
    showTaxonomy: false,
    showPhylogram: true,
  });

  treeEl.appendChild(svg.node());
  await waitForPaint();

  const metrics = {
    nodes: tree.nodes.length,
    edges: tree.edges.length,
    parse_ms: parseMs,
    render_ms: performance.now() - renderStart,
    total_ms: performance.now() - totalStart,
  };

  window.__lastPhyD3Metrics = metrics;
  renderMetrics(metrics);
  return metrics;
}

renderButton.addEventListener("click", () => {
  renderTree(inputEl.value.trim()).catch(renderError);
});

window.__runPhyD3Benchmark = renderTree;

renderTree(inputEl.value.trim()).catch(renderError);
