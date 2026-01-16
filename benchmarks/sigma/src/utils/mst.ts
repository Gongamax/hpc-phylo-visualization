/**
 * Minimum Spanning Tree algorithms for graph processing
 */

export interface Edge {
  source: string;
  target: string;
  weight: number;
}

export interface Node {
  id: string;
  label: string;
  x?: number;
  y?: number;
  isLeaf?: boolean;
  depth?: number;
  branchLength?: number;
}

export interface PhyloNode {
  name: string;
  branchLength: number;
  children: PhyloNode[];
  id: string;
  depth: number;
  x?: number;
  y?: number;
}

/**
 * Union-Find data structure for Kruskal's algorithm
 */
class UnionFind {
  private parent: Map<string, string> = new Map();
  private rank: Map<string, number> = new Map();

  makeSet(x: string): void {
    this.parent.set(x, x);
    this.rank.set(x, 0);
  }

  find(x: string): string {
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!));
    }
    return this.parent.get(x)!;
  }

  union(x: string, y: string): boolean {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) return false;

    const rankX = this.rank.get(rootX)!;
    const rankY = this.rank.get(rootY)!;

    if (rankX < rankY) {
      this.parent.set(rootX, rootY);
    } else if (rankX > rankY) {
      this.parent.set(rootY, rootX);
    } else {
      this.parent.set(rootY, rootX);
      this.rank.set(rootX, rankX + 1);
    }

    return true;
  }
}

/**
 * Kruskal's algorithm to find Minimum Spanning Tree
 */
export function kruskalMST(nodes: Node[], edges: Edge[]): Edge[] {
  const uf = new UnionFind();
  const mstEdges: Edge[] = [];

  // Initialize union-find structure
  nodes.forEach((node) => uf.makeSet(node.id));

  // Sort edges by weight
  const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);

  // Process edges in order of increasing weight
  for (const edge of sortedEdges) {
    if (uf.union(edge.source, edge.target)) {
      mstEdges.push(edge);
      // Stop when we have n-1 edges (for n nodes)
      if (mstEdges.length === nodes.length - 1) {
        break;
      }
    }
  }

  return mstEdges;
}

/**
 * Generate a random connected graph with optimizations for large graphs
 */
export function generateRandomGraph(
  numNodes: number,
  numEdges: number
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Create nodes with optimized positioning for large graphs
  const layoutRadius = Math.min(800, Math.sqrt(numNodes) * 50);

  for (let i = 0; i < numNodes; i++) {
    if (numNodes <= 1000) {
      // Random positioning for smaller graphs
      nodes.push({
        id: `node-${i}`,
        label: numNodes <= 100 ? `N${i}` : `${i}`, // Shorter labels for large graphs
        x: Math.random() * 800,
        y: Math.random() * 600,
      });
    } else {
      // Circular/spiral layout for better performance with large graphs
      const angle = (i / numNodes) * 2 * Math.PI;
      const radius = layoutRadius * (0.3 + 0.7 * (i / numNodes));
      nodes.push({
        id: `node-${i}`,
        label: `${i}`,
        x: 400 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle),
      });
    }
  }

  // Generate edges ensuring connectivity with better performance
  const edges_set = new Set<string>();

  // Create spanning tree for connectivity (more efficient for large graphs)
  for (let i = 1; i < numNodes; i++) {
    const source = Math.floor(Math.random() * i);
    const target = i;
    const weight = Math.round((Math.random() * 100 + 1) * 100) / 100;

    const edgeKey =
      source < target ? `${source}-${target}` : `${target}-${source}`;
    edges.push({
      source: `node-${source}`,
      target: `node-${target}`,
      weight,
    });
    edges_set.add(edgeKey);
  }

  // Add remaining edges more efficiently
  const targetEdgeCount = Math.min(
    numEdges,
    Math.floor((numNodes * (numNodes - 1)) / 2)
  );
  let attempts = 0;
  const maxAttempts = Math.min(targetEdgeCount * 3, 100000); // Prevent infinite loops

  while (edges.length < targetEdgeCount && attempts < maxAttempts) {
    attempts++;

    const sourceIdx = Math.floor(Math.random() * numNodes);
    const targetIdx = Math.floor(Math.random() * numNodes);

    if (sourceIdx !== targetIdx) {
      const edgeKey =
        sourceIdx < targetIdx
          ? `${sourceIdx}-${targetIdx}`
          : `${targetIdx}-${sourceIdx}`;

      if (!edges_set.has(edgeKey)) {
        const weight = Math.round((Math.random() * 100 + 1) * 100) / 100;
        edges.push({
          source: `node-${sourceIdx}`,
          target: `node-${targetIdx}`,
          weight,
        });
        edges_set.add(edgeKey);
      }
    }
  }

  return { nodes, edges };
}

/**
 * Parse Newick format string into a phylogenetic tree
 */
export function parseNewick(newick: string): PhyloNode {
  let nodeId = 0;

  function getNextId(): string {
    return `phylo-${nodeId++}`;
  }

  function parseNode(
    str: string,
    depth: number = 0
  ): { node: PhyloNode; remaining: string } {
    str = str.trim();

    if (str[0] === "(") {
      // Internal node with children
      str = str.substring(1); // Remove opening '('
      const children: PhyloNode[] = [];

      while (str[0] !== ")") {
        const result = parseNode(str, depth + 1);
        children.push(result.node);
        str = result.remaining.trim();

        if (str[0] === ",") {
          str = str.substring(1).trim();
        }
      }

      str = str.substring(1); // Remove closing ')'

      // Parse name and branch length
      let name = "";
      let branchLength = 0;

      if (str[0] && str[0] !== "," && str[0] !== ")" && str[0] !== ";") {
        const match = str.match(/^([^:,);]*):?([0-9.]*)/);
        if (match) {
          name = match[1] || `internal_${depth}`;
          branchLength = parseFloat(match[2]) || 0;

          // Handle problematic branch lengths (common in some datasets)
          if (branchLength > 5 || isNaN(branchLength)) {
            branchLength = 0.1; // Default reasonable branch length
          }

          str = str.substring(match[0].length);
        }
      }

      return {
        node: {
          name: name || `internal_${depth}`,
          branchLength,
          children,
          id: getNextId(),
          depth,
        },
        remaining: str,
      };
    } else {
      // Leaf node
      const match = str.match(/^([^:,);]+):?([0-9.]*)/);
      if (!match) {
        throw new Error(`Invalid Newick format at: ${str.substring(0, 20)}`);
      }

      const name = match[1];
      let branchLength = parseFloat(match[2]) || 0;

      // Handle problematic branch lengths (common in some datasets)
      if (branchLength > 5 || isNaN(branchLength)) {
        branchLength = 0.1; // Default reasonable branch length
      }

      str = str.substring(match[0].length);

      return {
        node: {
          name,
          branchLength,
          children: [],
          id: getNextId(),
          depth,
        },
        remaining: str,
      };
    }
  }

  // Clean the newick string and optimize for large datasets
  const cleanNewick = newick.replace(/\s+/g, "").replace(/;$/, "");

  // Performance check - warn about very large datasets
  if (cleanNewick.length > 10000) {
    console.warn(
      `Large dataset detected (${cleanNewick.length} characters). This may take a moment...`
    );
  }

  const result = parseNode(cleanNewick);
  return result.node;
}

/**
 * Convert phylogenetic tree to graph format with proper cladogram layout
 */
export function phyloTreeToGraph(
  tree: PhyloNode,
  layoutType: "cladogram" | "phylogram" | "circular" = "cladogram"
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Calculate tree dimensions with performance optimization
  const leafCount = countLeaves(tree);
  const maxDepth = getMaxDepth(tree);

  // Performance optimization for very large trees
  const isLargeTree = leafCount > 100;
  const isExtremeTree = leafCount > 500;

  if (isLargeTree) {
    console.log(
      `Processing large phylogenetic tree: ${leafCount} species, depth ${maxDepth}`
    );
  }

  if (isExtremeTree) {
    console.warn(
      `⚠️ Extreme dataset detected (${leafCount} species). Using minimal processing for performance.`
    );
  }

  let leafIndex = 0;
  let nodeIdCounter = 0;

  function getNextNodeId(): string {
    return `cladogram-helper-${nodeIdCounter++}`;
  }

  function processNode(
    node: PhyloNode,
    parentId?: string,
    parentX?: number,
    parentY?: number
  ): void {
    if (layoutType === "cladogram") {
      // Proper cladogram layout with horizontal and vertical lines only
      if (node.children.length === 0) {
        // Leaf node
        node.x = 800 - node.depth * (800 / maxDepth);
        node.y = (leafIndex / (leafCount - 1)) * 500;
        leafIndex++;
      } else {
        // Internal node - process children first to get their positions
        node.children.forEach((child) => processNode(child, node.id));

        // Position internal node at the average Y of its children
        node.y =
          node.children.reduce((sum, child) => sum + (child.y || 0), 0) /
          node.children.length;
        node.x = 800 - node.depth * (800 / maxDepth);
      }

      // Add the main node
      nodes.push({
        id: node.id,
        label: node.children.length === 0 ? node.name : "", // Only show labels on leaves
        x: node.x,
        y: node.y,
        isLeaf: node.children.length === 0,
        depth: node.depth,
        branchLength: node.branchLength,
      });

      // Create L-shaped connections for cladogram (skip for extreme datasets for performance)
      if (
        parentId &&
        parentX !== undefined &&
        parentY !== undefined &&
        !isExtremeTree
      ) {
        // Create an intermediate node for the vertical connection
        const verticalNodeId = getNextNodeId();
        nodes.push({
          id: verticalNodeId,
          label: "",
          x: node.x,
          y: parentY,
          isLeaf: false,
          depth: node.depth,
          branchLength: 0,
        });

        // Horizontal line from parent to vertical helper
        edges.push({
          source: parentId,
          target: verticalNodeId,
          weight: 0,
        });

        // Vertical line from helper to current node
        edges.push({
          source: verticalNodeId,
          target: node.id,
          weight: node.branchLength,
        });
      } else if (parentId && isExtremeTree) {
        // Direct connection for extreme datasets (no L-shaped branches)
        edges.push({
          source: parentId,
          target: node.id,
          weight: node.branchLength,
        });
      }

      // Process children with L-shaped connections
      node.children.forEach((child) => {
        processNode(child, node.id, node.x, node.y);
      });
    } else if (layoutType === "phylogram") {
      // Phylogram layout (branch lengths represent evolutionary distance)
      const totalDistance = getTotalDistance(tree, node);
      if (node.children.length === 0) {
        // Leaf node
        node.x = 800 - totalDistance * 100; // Scale branch lengths
        node.y = (leafIndex / (leafCount - 1)) * 500;
        leafIndex++;
      } else {
        // Internal node
        node.children.forEach((child) => processNode(child, node.id));
        node.x = 800 - totalDistance * 100;
        node.y =
          node.children.reduce((sum, child) => sum + (child.y || 0), 0) /
          node.children.length;
      }

      // Add node to graph
      nodes.push({
        id: node.id,
        label: node.children.length === 0 ? node.name : "",
        x: node.x,
        y: node.y,
        isLeaf: node.children.length === 0,
        depth: node.depth,
        branchLength: node.branchLength,
      });

      // Add direct edges for phylogram
      if (parentId) {
        edges.push({
          source: parentId,
          target: node.id,
          weight: node.branchLength,
        });
      }
    } else if (layoutType === "circular") {
      // Circular layout
      if (node.children.length === 0) {
        const angle = (leafIndex / leafCount) * 2 * Math.PI;
        const radius = 200 + node.depth * 30;
        node.x = 400 + radius * Math.cos(angle);
        node.y = 300 + radius * Math.sin(angle);
        leafIndex++;
      } else {
        node.children.forEach((child) => processNode(child, node.id));
        node.x =
          node.children.reduce((sum, child) => sum + (child.x || 0), 0) /
          node.children.length;
        node.y =
          node.children.reduce((sum, child) => sum + (child.y || 0), 0) /
          node.children.length;
      }

      // Add node to graph
      nodes.push({
        id: node.id,
        label: node.name,
        x: node.x,
        y: node.y,
        isLeaf: node.children.length === 0,
        depth: node.depth,
        branchLength: node.branchLength,
      });

      // Add edges to children
      if (parentId) {
        edges.push({
          source: parentId,
          target: node.id,
          weight: node.branchLength,
        });
      }
    }
  }

  processNode(tree);

  // Performance summary for large trees
  if (isLargeTree) {
    console.log(
      `✅ Large tree processed: ${nodes.length} nodes, ${edges.length} edges`
    );
  }

  return { nodes, edges };
}

function countLeaves(node: PhyloNode): number {
  if (node.children.length === 0) return 1;
  return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
}

function getMaxDepth(node: PhyloNode): number {
  if (node.children.length === 0) return node.depth;
  return Math.max(...node.children.map((child) => getMaxDepth(child)));
}

function getTotalDistance(root: PhyloNode, target: PhyloNode): number {
  function findPath(
    current: PhyloNode,
    target: PhyloNode,
    distance: number = 0
  ): number | null {
    if (current.id === target.id) return distance;

    for (const child of current.children) {
      const result = findPath(child, target, distance + child.branchLength);
      if (result !== null) return result;
    }

    return null;
  }

  return findPath(root, target) || 0;
}

/**
 * Sample Newick format trees for testing - from small to massive scale
 */
export const sampleNewickTrees = {
  simple: "((A:0.1,B:0.2):0.05,C:0.3);",
  mammals: "((human:0.1,chimp:0.1):0.05,(mouse:0.2,rat:0.15):0.1);",

  // Medium scale - 15 species
  primates:
    "(((((human:0.002,chimp:0.002):0.001,bonobo:0.003):0.008,gorilla:0.011):0.015,orangutan:0.026):0.030,((gibbon_siamang:0.008,gibbon_lar:0.008):0.036,gibbon_agile:0.044):0.012):0.0;",

  // Large scale - 50+ species (realistic research dataset)
  vertebrates:
    "((((((human:0.1,chimp:0.1):0.05,(gorilla:0.15,orangutan:0.15):0.05):0.1,((mouse:0.2,rat:0.18):0.02,(rabbit:0.22,guinea_pig:0.20):0.02):0.15):0.2,(((dog:0.25,wolf:0.23):0.02,(fox:0.27,coyote:0.25):0.02):0.05,((cat:0.30,tiger:0.28):0.02,(lion:0.29,leopard:0.31):0.02):0.05):0.1):0.3,((((cow:0.35,sheep:0.33):0.03,(goat:0.34,pig:0.36):0.03):0.1,((horse:0.40,donkey:0.38):0.02,(zebra:0.39,rhino:0.45):0.05):0.08):0.2,(((elephant:0.50,mammoth:0.48):0.05,(manatee:0.55,dugong:0.53):0.05):0.15,((whale:0.60,dolphin:0.58):0.03,(porpoise:0.59,orca:0.61):0.03):0.12):0.1):0.1):0.4,(((((chicken:0.70,turkey:0.68):0.05,(duck:0.72,goose:0.71):0.05):0.1,((eagle:0.80,hawk:0.78):0.03,(falcon:0.79,vulture:0.82):0.03):0.08):0.2,((penguin:0.90,albatross:0.88):0.05,(pelican:0.89,cormorant:0.91):0.05):0.15):0.3,(((salmon:1.0,trout:0.98):0.05,(tuna:1.05,mackerel:1.03):0.05):0.2,((shark:1.2,ray:1.18):0.1,(cod:1.1,herring:1.08):0.08):0.15):0.25):0.1);",

  // Massive scale - 100+ species (cutting-edge research)
  massive: generateLargeTree(150),

  // Ultra scale - 500+ species (phylogenomics scale)
  phylogenomics: generateLargeTree(500),

  // Extreme scale - 1000+ species (tree of life scale)
  tree_of_life: generateLargeTree(1000),
};

/**
 * Generate a large balanced tree with specified number of leaves
 */
function generateLargeTree(numLeaves: number): string {
  if (numLeaves <= 2) {
    return numLeaves === 1
      ? "species_1:0.1;"
      : "(species_1:0.1,species_2:0.1):0.0;";
  }

  function buildSubtree(start: number, end: number, depth: number = 0): string {
    if (start === end) {
      return `species_${start}:${(Math.random() * 0.5 + 0.1).toFixed(3)}`;
    }

    if (end - start === 1) {
      const len1 = (Math.random() * 0.5 + 0.1).toFixed(3);
      const len2 = (Math.random() * 0.5 + 0.1).toFixed(3);
      const internal = (Math.random() * 0.3 + 0.05).toFixed(3);
      return `(species_${start}:${len1},species_${end}:${len2}):${internal}`;
    }

    const mid = Math.floor((start + end) / 2);
    const left = buildSubtree(start, mid, depth + 1);
    const right = buildSubtree(mid + 1, end, depth + 1);
    const branchLen = (Math.random() * 0.2 + 0.02).toFixed(3);

    return `(${left},${right}):${branchLen}`;
  }

  return buildSubtree(1, numLeaves) + ";";
}
