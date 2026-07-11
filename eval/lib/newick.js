import fs from "node:fs";

function stripBranchLength(label) {
  return label.trim().split(":")[0].trim();
}

export function readNewick(filePath) {
  return fs.readFileSync(filePath, "utf8").trim();
}

export function newickToEdgeList(newick) {
  const edges = [];
  const stack = [];
  let nodeId = 0;
  let token = "";
  let previousClosedInternal = false;

  const nextInternal = () => `internal_${nodeId++}`;
  const nextLeaf = (label) => label || `leaf_${nodeId++}`;

  function currentParent() {
    return stack.at(-1);
  }

  function addEdge(parent, child) {
    if (parent && child) edges.push([parent, child]);
  }

  function flushLeaf() {
    const label = stripBranchLength(token);
    token = "";

    if (!label || previousClosedInternal) return;
    addEdge(currentParent(), nextLeaf(label));
  }

  for (const char of newick) {
    if (char === "(") {
      const node = nextInternal();
      addEdge(currentParent(), node);
      stack.push(node);
      token = "";
      previousClosedInternal = false;
      continue;
    }

    if (char === ",") {
      flushLeaf();
      previousClosedInternal = false;
      continue;
    }

    if (char === ")") {
      flushLeaf();
      stack.pop();
      previousClosedInternal = true;
      continue;
    }

    if (char === ";") {
      flushLeaf();
      break;
    }

    token += char;
  }

  return edges;
}

export function newickToEdgeCsv(newick) {
  const rows = newickToEdgeList(newick).map(([source, target]) => `${source},${target}`);
  return ["source,target", ...rows].join("\n") + "\n";
}
