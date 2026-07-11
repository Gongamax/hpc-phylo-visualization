(function () {
  function countTree(tree) {
    var root = window.forester.getTreeRoot(tree);
    var nodes = 0;
    window.forester.preOrderTraversalAll(root, function () {
      nodes += 1;
    });
    return { nodes: nodes, edges: Math.max(nodes - 1, 0) };
  }

  window.__runArchaeopteryxBenchmark = async function (datasetPath) {
    var totalStart = performance.now();
    var loadStart = performance.now();
    var response = await fetch(datasetPath);
    if (!response.ok) {
      throw new Error("Failed to load dataset: " + response.status);
    }
    var newick = await response.text();
    var loadMs = performance.now() - loadStart;

    var parseStart = performance.now();
    var tree = window.archaeopteryx.parseNewHampshire(newick, false, false);
    var parseMs = performance.now() - parseStart;
    var counts = countTree(tree);

    var renderStart = performance.now();
    document.getElementById("phylogram").replaceChildren();
    window.archaeopteryx.launch(
      "#phylogram",
      tree,
      {
        backgroundColorDefault: "#ffffff",
        displayWidth: window.innerWidth,
        displayHeight: window.innerHeight,
        controls0Left: 0,
        controls0Top: 0,
        controls1Left: 0,
        controls1Top: 0,
      },
      {
        enableNodeVisualizations: false,
        enableMsaResidueVisualizations: false,
      }
    );

    await new Promise(function (resolve, reject) {
      var deadline = performance.now() + 180000;
      var timer = setInterval(function () {
        var svg = document.querySelector("#phylogram svg");
        var marks = svg ? svg.querySelectorAll("path,line,circle,text,g").length : 0;
        if (svg && marks > 0) {
          clearInterval(timer);
          resolve();
        } else if (performance.now() > deadline) {
          clearInterval(timer);
          reject(new Error("Timed out waiting for Archaeopteryx SVG"));
        }
      }, 100);
    });

    var renderMs = performance.now() - renderStart;
    return {
      nodes: counts.nodes,
      edges: counts.edges,
      load_ms: loadMs,
      parse_ms: parseMs,
      render_ms: renderMs,
      total_ms: performance.now() - totalStart,
    };
  };
})();
