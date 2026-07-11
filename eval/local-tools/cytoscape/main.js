const metricsEl = document.getElementById("metrics");
const cyEl = document.getElementById("cy");

function parseEdgeList(text) {
  const parseStart = performance.now();
  const lines = text.trim().split(/\r?\n/);
  const elements = [];
  const nodes = new Set();

  for (const line of lines.slice(1)) {
    const [source, target] = line.split(",").map((value) => value.trim());
    if (!source || !target) continue;
    nodes.add(source);
    nodes.add(target);
    elements.push({ data: { id: `${source}->${target}`, source, target } });
  }

  for (const node of nodes) {
    elements.push({ data: { id: node } });
  }

  return {
    elements,
    nodeCount: nodes.size,
    edgeCount: elements.length - nodes.size,
    parseMs: performance.now() - parseStart,
  };
}

function renderMetrics(metrics) {
  metricsEl.textContent = [
    `Nodes: ${metrics.nodes}`,
    `Edges: ${metrics.edges}`,
    `Load: ${metrics.load_ms.toFixed(2)}ms`,
    `Parse: ${metrics.parse_ms.toFixed(2)}ms`,
    `Render: ${metrics.render_ms.toFixed(2)}ms`,
    `Total: ${metrics.total_ms.toFixed(2)}ms`,
  ].join(" | ");
}

window.__runCytoscapeBenchmark = async function runCytoscapeBenchmark(path) {
  const totalStart = performance.now();
  const loadStart = performance.now();
  const response = await fetch(path, { cache: "no-store" });
  const text = await response.text();
  const loadMs = performance.now() - loadStart;

  const parsed = parseEdgeList(text);
  const renderStart = performance.now();

  cyEl.innerHTML = "";
  const cy = cytoscape({
    container: cyEl,
    elements: parsed.elements,
    layout: { name: "preset" },
    style: [
      {
        selector: "node",
        style: {
          width: 2,
          height: 2,
          "background-color": "#3b82f6",
          label: "",
        },
      },
      {
        selector: "edge",
        style: {
          width: 0.5,
          "line-color": "#94a3b8",
          "curve-style": "haystack",
        },
      },
    ],
    userZoomingEnabled: false,
    userPanningEnabled: false,
    boxSelectionEnabled: false,
    autoungrabify: true,
  });

  const cols = Math.max(1, Math.ceil(Math.sqrt(parsed.nodeCount)));
  cy.nodes().forEach((node, index) => {
    node.position({ x: index % cols, y: Math.floor(index / cols) });
  });
  cy.fit(undefined, 16);

  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const metrics = {
    nodes: parsed.nodeCount,
    edges: parsed.edgeCount,
    load_ms: loadMs,
    parse_ms: parsed.parseMs,
    render_ms: performance.now() - renderStart,
    total_ms: performance.now() - totalStart,
  };

  window.__lastCytoscape = cy;
  window.__lastCytoscapeMetrics = metrics;
  renderMetrics(metrics);
  return metrics;
};
