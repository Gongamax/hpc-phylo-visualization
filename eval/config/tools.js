import path from "node:path";

const root = (...parts) => path.resolve(import.meta.dirname, "..", "..", ...parts);
const python = process.env.PYTHON ?? "/opt/homebrew/Caskroom/miniconda/base/bin/python3";

export const TOOLS = [
  {
    id: "phylotree",
    name: "Phylotree.js",
    category: "browser-library",
    input: "Newick",
    cwd: root("eval", "local-tools", "phylotree"),
    port: 5173,
    command: ["npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"]],
    type: "phylotree",
    validation: "svg",
  },
  {
    id: "phyd3",
    name: "PhyD3",
    category: "browser-library",
    input: "Newick",
    cwd: root("eval", "local-tools", "phyd3"),
    port: 8080,
    buildCommand: ["npm", ["run", "build"]],
    command: ["./node_modules/.bin/http-server", ["-p", "8080"]],
    type: "phyd3",
    validation: "svg",
  },
  {
    id: "force-graph",
    name: "3d-force-graph",
    category: "browser-library",
    input: "edge-list graph",
    cwd: root("eval", "local-tools", "force-graph"),
    port: 5174,
    command: ["npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5174"]],
    type: "forceGraph",
    mode: "2D",
    validation: "canvas",
  },
  {
    id: "graphgl",
    name: "GraphGL",
    category: "browser-library",
    input: "edge-list graph",
    cwd: root("eval", "local-tools", "graphgl"),
    port: 5175,
    command: ["npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5175"]],
    type: "graphgl",
    validation: "canvas",
  },
  {
    id: "cytoscape",
    name: "Cytoscape.js",
    category: "browser-library",
    input: "edge-list graph",
    cwd: root("eval"),
    port: 5180,
    command: ["./node_modules/.bin/http-server", ["-p", "5180"]],
    type: "cytoscape",
    basePath: "/local-tools/cytoscape/",
    validation: "cytoscape",
  },
  {
    id: "grapetree",
    name: "GrapeTree",
    category: "domain-tool",
    input: "Newick",
    cwd: "/Users/goncalofrutuoso/Developer/GrapeTree",
    port: 5800,
    command: [
      "/Users/goncalofrutuoso/Developer/GrapeTree/venv/bin/python",
      ["-c", "from module import app; app.run(host='127.0.0.1', port=5800, use_reloader=False)"],
    ],
    type: "grapetree",
    basePath: "/",
    validation: "grapetree",
  },
  {
    id: "taxonium",
    name: "Taxonium",
    category: "domain-tool",
    input: "Newick",
    cwd: root("eval", "local-tools", "taxonium"),
    port: 5810,
    command: ["npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5810"]],
    type: "taxonium",
    validation: "canvas",
  },
  {
    id: "archaeopteryx",
    name: "Archaeopteryx.js",
    category: "browser-library",
    input: "Newick",
    cwd: root("eval"),
    port: 5181,
    command: ["./node_modules/.bin/http-server", ["-p", "5181"]],
    type: "archaeopteryx",
    basePath: "/local-tools/archaeopteryx/",
    validation: "svg",
  },
];

export const TOOL_CATALOG = [
  {
    id: "phylotree",
    name: "Phylotree.js",
    category: "browser-library",
    input: "Newick",
    automation: "playwright",
    status: "implemented",
  },
  {
    id: "phyd3",
    name: "PhyD3",
    category: "browser-library",
    input: "Newick",
    automation: "playwright",
    status: "implemented",
  },
  {
    id: "phyloviz",
    name: "PHYLOViZ",
    category: "domain-tool",
    input: "profile data / goeBURST / tree export",
    automation: "adapter-needed",
    status: "candidate",
  },
  {
    id: "phyloscape",
    name: "Phyloscape",
    category: "browser-library",
    input: "tree / graph",
    automation: "adapter-needed",
    status: "candidate",
  },
  {
    id: "grapetree",
    name: "GrapeTree",
    category: "domain-tool",
    input: "Newick or profile data",
    automation: "playwright",
    status: "implemented",
  },
  {
    id: "itol",
    name: "iTOL",
    category: "web-service",
    input: "Newick upload",
    automation: "manual-or-api",
    status: "candidate",
  },
  {
    id: "archaeopteryx",
    name: "Archaeopteryx.js",
    category: "browser-library",
    input: "Newick / phyloXML",
    automation: "playwright",
    status: "implemented",
  },
  {
    id: "taxonium",
    name: "Taxonium",
    category: "domain-tool",
    input: "Newick",
    automation: "playwright",
    status: "implemented",
  },
  {
    id: "ggtree",
    name: "ggtree",
    category: "r-static-renderer",
    input: "Newick",
    automation: "cli",
    status: "implemented",
  },
  {
    id: "ete3",
    name: "ETE3",
    category: "python-static-renderer",
    input: "Newick",
    automation: "cli",
    status: "implemented",
  },
  {
    id: "graphgl",
    name: "GraphGL",
    category: "browser-library",
    input: "edge-list graph",
    automation: "playwright",
    status: "implemented",
  },
  {
    id: "force-graph",
    name: "React Force Graph",
    category: "browser-library",
    input: "edge-list graph",
    automation: "playwright",
    status: "implemented",
  },
  {
    id: "cytoscape",
    name: "Cytoscape.js",
    category: "browser-library",
    input: "edge-list graph",
    automation: "playwright",
    status: "implemented",
  },
];

export const STATIC_TOOLS = [
  {
    id: "ete3",
    name: "ETE3",
    category: "python-static-renderer",
    input: "Newick",
    command: [python, [root("eval", "static", "ete3_render.py")]],
    outputExtension: "svg",
    type: "ete3",
  },
  {
    id: "ggtree",
    name: "ggtree",
    category: "r-static-renderer",
    input: "Newick",
    command: ["Rscript", [root("eval", "static", "ggtree_render.R")]],
    outputExtension: "pdf",
    type: "ggtree",
  },
];

export function selectTools(ids) {
  if (!ids.length) return TOOLS;

  const requested = new Set(ids);
  return TOOLS.filter((tool) => requested.has(tool.id));
}

export function selectStaticTools(ids) {
  if (!ids.length) return STATIC_TOOLS;

  const requested = new Set(ids);
  return STATIC_TOOLS.filter((tool) => requested.has(tool.id));
}
