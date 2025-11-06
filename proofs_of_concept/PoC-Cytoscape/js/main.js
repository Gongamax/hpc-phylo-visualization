// Minimal Cytoscape.js demo to render a small phylogenetic tree
// Loads data from a bundled JSON file (data/sample-tree.json)

async function loadJSON(path) {
  const resp = await fetch(path);
  if (!resp.ok) throw new Error(`Failed to load ${path}: ${resp.status}`);
  return resp.json();
}

function makeStyles() {
  return [
    {
      selector: "node",
      style: {
        "background-color": "#1976d2",
        label: "data(label)",
        "text-valign": "center",
        color: "#fff",
        "text-outline-width": 2,
        "text-outline-color": "#1976d2",
        width: "label",
        padding: "6px",
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": "#999",
        "target-arrow-shape": "none",
        "curve-style": "bezier",
        label: "",
        "font-size": "10px",
        "text-background-color": "#fff",
        "text-background-opacity": 0.8,
        "text-background-padding": "2px",
      },
    },
    {
      selector: ".leaf",
      style: { "background-color": "#388e3c", "text-outline-color": "#388e3c" },
    },
    {
      selector: ".internal",
      style: { "background-color": "#1976d2", "text-outline-color": "#1976d2" },
    },
    {
      selector: ".internal-minimal",
      style: {
        width: 4,
        height: 4,
        "background-color": "#555",
        label: "",
        "text-outline-width": 0,
      },
    },
  ];
}

async function main() {
  // initial elements from example
  let elements = (await loadJSON("data/sample-tree.json")).elements;

  const cy = cytoscape({
    container: document.getElementById("cy"),
    elements: elements,
    style: makeStyles(),
    wheelSensitivity: 0.2,
    userZoomingEnabled: true,
    layout: {
      name: "cose",
      animate: true,
      animationDuration: 1000,
      nodeRepulsion: 400000,
      idealEdgeLength: (edge) => {
        const len = edge.data("length");
        return len != null && !isNaN(parseFloat(len))
          ? parseFloat(len) * 10
          : 80;
      },
      edgeElasticity: (edge) => {
        const len = edge.data("length");
        return len != null && !isNaN(parseFloat(len))
          ? 0.45 / parseFloat(len)
          : 0.45;
      },
      gravity: 0.25,
      numIter: 1000,
      initialTemp: 200,
      coolingFactor: 0.95,
      minTemp: 1.0,
    },
  });

  // Basic interactions: show info when MST is not active; when MST active node taps expand/collapse
  const expandedNodes = new Set();
  cy.on("tap", "node", (ev) => {
    const node = ev.target;
    if (mstActive) {
      // toggle expand/collapse of incident non-MST edges
      const nodeId = node.id();
      const incident = node.connectedEdges().filter((e) => !e.data("mst"));
      if (expandedNodes.has(nodeId)) {
        // collapse: hide incident non-MST edges
        incident.forEach((e) => {
          e.style("display", "none");
        });
        expandedNodes.delete(nodeId);
      } else {
        // expand: show incident non-MST edges
        incident.forEach((e) => {
          e.style("display", "element");
          e.style("line-color", "#999");
          e.style("opacity", 1);
          e.style("width", 2);
        });
        expandedNodes.add(nodeId);
      }
    } else {
      const info = `id=${node.id()}\nlabel=${node.data("label") || ""}`;
      alert(info);
    }
  });

  document.getElementById("fitBtn").addEventListener("click", () => cy.fit());
  document
    .getElementById("layoutBtn")
    .addEventListener("click", () =>
      cy
        .layout({ name: "breadthfirst", directed: true, spacingFactor: 1.6 })
        .run()
    );
  document.getElementById("resetBtn").addEventListener("click", () => {
    cy.zoom(1);
    cy.pan({ x: 0, y: 0 });
  });

  // Newick file input handling
  const newickFileInput = document.getElementById("newickFile");
  const renderModeSelect = document.getElementById("renderMode");

  newickFileInput.addEventListener("change", async (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    const text = await f.text();
    let tree;
    try {
      tree = parseNewick(text);
    } catch (err) {
      alert("Failed to parse Newick: " + err.message);
      return;
    }

    const elems = newickToCytoscapeElements(tree);
    // switch render mode
    const mode = renderModeSelect.value;
    cy.elements().remove();
    cy.add(elems);

    // apply edge labels and internal node styling after load
    applyEdgeLabels(showEdgeLabelsCheckbox.checked);
    applyMinimalInternalNodes(minimalInternalNodesCheckbox.checked);

    if (mode === "dendrogram") {
      // compute simple dendrogram positions (top-to-bottom) using DFS and x offsets
      const roots = cy.nodes().roots
        ? cy.nodes().roots()
        : cy.nodes().filter((n) => n.incomers().length === 0);
      // compute leaf order
      let x = 0;
      function layoutDendro(node) {
        const children = node.outgoers("node");
        if (children.length === 0) {
          node.position({ x: x * 120, y: 1000 });
          x++;
        } else {
          children.forEach((c) => layoutDendro(c));
          // set this node x to average of children
          const childXs = children.map((c) => c.position("x"));
          const avgX = childXs.reduce((a, b) => a + b, 0) / childXs.length;
          const minY = Math.min(...children.map((c) => c.position("y")));
          node.position({ x: avgX, y: minY - 120 });
        }
      }

      // run layout computation
      x = 0;
      // find root (node with no incoming edges)
      const root = cy
        .nodes()
        .filter((n) => n.incomers("edge").length === 0)
        .first();
      layoutDendro(root);
      cy.fit();
    } else if (mode === "cose") {
      // force-directed layout using edge lengths
      cy.layout({
        name: "cose",
        animate: true,
        animationDuration: 1000,
        nodeRepulsion: 400000,
        idealEdgeLength: (edge) => {
          const len = edge.data("length");
          return len != null && !isNaN(parseFloat(len))
            ? parseFloat(len) * 10
            : 80;
        },
        edgeElasticity: (edge) => {
          const len = edge.data("length");
          return len != null && !isNaN(parseFloat(len))
            ? 0.45 / parseFloat(len)
            : 0.45;
        },
        gravity: 0.25,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
      }).run();
    } else {
      // graph mode: run breadthfirst layout
      cy.layout({
        name: "breadthfirst",
        directed: true,
        spacingFactor: 1.6,
      }).run();
    }
  });

  // Edge labels and internal node styling
  const showEdgeLabelsCheckbox = document.getElementById("showEdgeLabels");
  const minimalInternalNodesCheckbox = document.getElementById(
    "minimalInternalNodes"
  );

  function applyEdgeLabels(show) {
    cy.edges().forEach((e) => {
      const len = e.data("length");
      if (show && len != null) {
        e.style("label", len.toFixed(2));
      } else {
        e.style("label", "");
      }
    });
  }

  function applyMinimalInternalNodes(minimal) {
    cy.nodes().forEach((n) => {
      if (n.hasClass("internal")) {
        if (minimal) {
          n.addClass("internal-minimal");
        } else {
          n.removeClass("internal-minimal");
        }
      }
    });
  }

  showEdgeLabelsCheckbox.addEventListener("change", (ev) => {
    applyEdgeLabels(ev.target.checked);
  });

  minimalInternalNodesCheckbox.addEventListener("change", (ev) => {
    applyMinimalInternalNodes(ev.target.checked);
  });

  // apply initial minimal internal nodes on load
  setTimeout(
    () => applyMinimalInternalNodes(minimalInternalNodesCheckbox.checked),
    300
  );

  // MST toggle and expand-on-click
  const mstToggle = document.getElementById("mstToggle");
  let mstActive = false;
  let originalEdges = [];
  // worker for MST
  let mstWorker = null;

  function getEdgeWeight(edge) {
    // prefer numeric weight on data.weight or data.length; fallback to 1
    const w = edge.data("weight");
    if (w != null && !isNaN(parseFloat(w))) return parseFloat(w);
    const l = edge.data("length");
    if (l != null && !isNaN(parseFloat(l))) return parseFloat(l);
    return 1;
  }

  function computeMST() {
    // compute MST in worker for large graphs; fallback to inline if worker unavailable
    if (mstWorker) {
      return new Promise((resolve, reject) => {
        const nodes = cy.nodes().map((n) => ({ id: n.id() }));
        const edges = cy.edges().map((e) => ({
          id: e.id(),
          source: e.source().id(),
          target: e.target().id(),
          weight: getEdgeWeight(e),
        }));
        function onMessage(ev) {
          mstWorker.removeEventListener("message", onMessage);
          const mstSet = new Set(ev.data.mstEdgeIds);
          resolve(mstSet);
        }
        mstWorker.addEventListener("message", onMessage);
        mstWorker.postMessage({ nodes, edges });
      });
    }

    // fallback to inline Kruskal
    const nodes = cy.nodes().toArray();
    const edges = cy.edges().toArray();
    const edgeList = edges.map((e) => [
      e.source().id(),
      e.target().id(),
      getEdgeWeight(e),
      e,
    ]);
    edgeList.sort((a, b) => a[2] - b[2]);
    const parent = {};
    function find(x) {
      parent[x] = parent[x] ?? x;
      return parent[x] === x ? x : (parent[x] = find(parent[x]));
    }
    function union(a, b) {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[ra] = rb;
    }
    const mstEdges = new Set();
    for (const [u, v, w, e] of edgeList) {
      if (find(u) !== find(v)) {
        union(u, v);
        mstEdges.add(e.id());
      }
    }
    return mstEdges;
  }

  function applyMSTView(mstEdges) {
    // hide non-MST edges and highlight MST edges
    cy.edges().forEach((e) => {
      if (mstEdges.has(e.id())) {
        e.style("display", "element");
        e.style("line-color", "#ff5722");
        e.style("width", 3);
        e.style("opacity", 1);
        e.data("mst", true);
      } else {
        e.style("display", "none");
        e.data("mst", false);
      }
    });
  }

  // click to expand node's non-MST neighbors when MST active
  cy.on("tap", "node", (ev) => {
    if (!mstActive) return;
    const node = ev.target;
    // reveal incident non-MST edges temporarily (toggle)
    const incident = node.connectedEdges().filter((e) => !e.data("mst"));
    const anyHidden = incident.some((e) => e.style("opacity") < 1);
    if (anyHidden) {
      incident.forEach((e) => {
        e.style("opacity", 1);
        e.style("line-color", "#999");
        e.style("width", 2);
      });
    } else {
      incident.forEach((e) => {
        e.style("opacity", 0.2);
        e.style("line-color", "#ddd");
        e.style("width", 1);
      });
    }
  });

  mstToggle.addEventListener("click", () => {
    mstActive = !mstActive;
    if (mstActive) {
      // initialize worker lazily
      if (!mstWorker && window.Worker) {
        mstWorker = new Worker("js/mstWorker.js");
      }
      // save original display/style for restoration
      originalEdges = cy.edges().map((e) => ({
        id: e.id(),
        style: {
          "line-color": e.style("line-color"),
          opacity: e.style("opacity"),
          width: e.style("width"),
          display: e.style("display"),
        },
        data: { ...e.data() },
      }));
      // compute MST (may return Promise if worker used)
      const maybePromise = computeMST();
      if (maybePromise instanceof Promise) {
        mstToggle.textContent = "MST: computing...";
        maybePromise
          .then((mst) => {
            applyMSTView(mst);
            expandedNodes.clear();
            mstToggle.textContent = "MST: ON";
          })
          .catch((err) => {
            alert("MST worker failed: " + err.message);
            mstActive = false;
            mstToggle.textContent = "Toggle MST";
          });
      } else {
        applyMSTView(maybePromise);
        expandedNodes.clear();
        mstToggle.textContent = "MST: ON";
      }
    } else {
      // restore styles and display
      originalEdges.forEach((orig) => {
        const e = cy.getElementById(orig.id);
        if (e) {
          if (orig.style["display"] && orig.style["display"] !== "element") {
            e.style("display", orig.style["display"]);
          } else {
            e.style("display", "element");
          }
          e.style("line-color", orig.style["line-color"]);
          e.style("opacity", orig.style["opacity"]);
          e.style("width", orig.style["width"]);
          e.data("mst", false);
        }
      });
      expandedNodes.clear();
      mstToggle.textContent = "Toggle MST";
    }
  });

  // Phylogram layout: positions nodes vertically by cumulative branch length from root
  function applyPhylogramLayout() {
    // build adjacency map and find root
    const nodes = cy.nodes();
    const edges = cy.edges();
    const adj = {};
    edges.forEach((e) => {
      const u = e.source().id();
      const v = e.target().id();
      const w = e.data("length") != null ? parseFloat(e.data("length")) : 1;
      adj[u] = adj[u] || [];
      adj[v] = adj[v] || [];
      // store both directions, preserve edge id
      adj[u].push({ id: e.id(), to: v, w });
      adj[v].push({ id: e.id(), to: u, w });
    });

    // find a root: node with no incoming edges according to original tree structure (in Newick we built edges parent->child)
    const root = cy
      .nodes()
      .filter((n) => n.incomers("edge").length === 0)
      .first();
    if (!root || root.empty()) return;

    // compute cumulative distance from root via BFS
    const dist = {};
    const parent = {};
    const q = [root.id()];
    dist[root.id()] = 0;
    parent[root.id()] = null;
    while (q.length) {
      const u = q.shift();
      const neigh = adj[u] || [];
      for (const e of neigh) {
        if (dist[e.to] === undefined) {
          dist[e.to] = dist[u] + e.w;
          parent[e.to] = u;
          q.push(e.to);
        }
      }
    }

    // collect leaves and sort for even horizontal spacing
    const leaves = cy
      .nodes()
      .filter((n) => n.outgoers("node").length === 0 || n.degree() === 1)
      .toArray();
    leaves.sort((a, b) =>
      (a.data("label") || a.id()).localeCompare(b.data("label") || b.id())
    );
    // assign x positions evenly
    const spacing = 120;
    leaves.forEach((leaf, i) => {
      leaf.position("x", i * spacing);
    });

    // assign y based on dist (scale distances to reasonable pixels)
    const maxDist = Math.max(...Object.values(dist));
    const scale = maxDist > 0 ? 800 / maxDist : 1;
    cy.nodes().forEach((n) => {
      const d = dist[n.id()] != null ? dist[n.id()] : 0;
      n.position("y", d * scale + 50);
    });

    // for internal nodes, set x to average of children
    function setInternalX(node) {
      const children = node.outgoers("node").toArray();
      if (children.length === 0) return;
      children.forEach((c) => setInternalX(c));
      const xs = children.map((c) => c.position("x"));
      const avg = xs.reduce((a, b) => a + b, 0) / xs.length;
      node.position("x", avg);
    }
    setInternalX(root);
    cy.fit();
  }

  // wire renderMode change to apply layout when selected
  renderModeSelect.addEventListener("change", (ev) => {
    const mode = ev.target.value;
    if (mode === "phylogram") {
      applyPhylogramLayout();
    } else if (mode === "cose") {
      cy.layout({
        name: "cose",
        animate: true,
        animationDuration: 1000,
        nodeRepulsion: 400000,
        idealEdgeLength: (edge) => {
          const len = edge.data("length");
          return len != null && !isNaN(parseFloat(len))
            ? parseFloat(len) * 10
            : 80;
        },
        edgeElasticity: (edge) => {
          const len = edge.data("length");
          return len != null && !isNaN(parseFloat(len))
            ? 0.45 / parseFloat(len)
            : 0.45;
        },
        gravity: 0.25,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
      }).run();
    } else if (mode === "graph") {
      cy.layout({
        name: "breadthfirst",
        directed: true,
        spacingFactor: 1.6,
      }).run();
    }
  });

  // initial fit after layout settles
  setTimeout(() => {
    cy.fit();
    applyMinimalInternalNodes(minimalInternalNodesCheckbox.checked);
  }, 200);
}

main().catch((err) => {
  console.error(err);
  alert("Failed to initialize demo: " + err.message);
});
