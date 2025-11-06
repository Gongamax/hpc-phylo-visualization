/**
 * Graph algorithms for network analysis
 * Includes optimized MST calculation and graph analysis functions
 */

import KDTree from "./kdtree.js";

/**
 * Compute Minimum Spanning Tree (MST) from graph nodes using Prim's algorithm
 * Optimized with KD-Tree for spatial nearest-neighbor queries
 *
 * @param {Array} nodes - Array of node objects with x, y coordinates
 * @returns {Array} - Array of [i, j] edge index pairs forming the MST
 */
export function computeMST(nodes) {
  if (!nodes || nodes.length <= 1) return [];

  const n = nodes.length;
  const inMST = new Array(n).fill(false);
  const parent = new Array(n).fill(-1);

  // Build a KD-tree for efficient nearest neighbor queries
  const kdtree = new KDTree(nodes);

  // Start with vertex 0
  inMST[0] = true;
  let mstEdgeCount = 0;

  // Build edge adjacency structure
  const edges = [];

  // We need n-1 edges for MST
  while (mstEdgeCount < n - 1) {
    let bestEdge = null;
    let bestDist = Infinity;

    // For each vertex in the MST
    for (let i = 0; i < n; i++) {
      if (!inMST[i]) continue; // Skip vertices not in MST

      // Find nearest non-MST neighbor using the KD-tree
      const candidates = kdtree
        .findNeighborsInRadius(nodes[i], Infinity)
        .filter((neighbor) => {
          // Find the index of this neighbor in our original nodes array
          const neighborIdx = nodes.indexOf(neighbor.point);
          // Only consider nodes not already in MST
          return neighborIdx !== -1 && !inMST[neighborIdx];
        });

      // Find the closest candidate
      if (candidates.length > 0) {
        const nearest = candidates[0]; // Already sorted by distance
        const neighborIdx = nodes.indexOf(nearest.point);

        if (nearest.distance < bestDist) {
          bestDist = nearest.distance;
          bestEdge = [i, neighborIdx];
        }
      }
    }

    // If we found a valid edge, add it to MST
    if (bestEdge) {
      edges.push(bestEdge);
      inMST[bestEdge[1]] = true; // Add the new vertex to MST
      mstEdgeCount++;
    } else {
      // No valid edge found - graph might be disconnected
      break;
    }
  }

  return edges;
}

/**
 * Compute MST using optimized Prim's algorithm with KD-tree
 * This version is more scalable for large graphs
 *
 * @param {Array} nodes - Array of node objects with x, y, id coordinates
 * @param {number} kNeighbors - Number of nearest neighbors to consider (default: 10)
 * @returns {Array} - Array of [source, target] edge objects forming the MST
 */
export function computeOptimizedMST(nodes, kNeighbors = 10) {
  if (!nodes || nodes.length <= 1) return [];

  const n = nodes.length;

  // Step 1: Build KD-tree for fast spatial queries
  const kdtree = new KDTree(nodes);

  // Step 2: Find k nearest neighbors for each node to create edge candidates
  // This avoids examining all n² possible edges
  const edgeCandidates = [];
  for (let i = 0; i < n; i++) {
    const neighbors = kdtree.findKNearestNeighbors(nodes[i], kNeighbors + 1);

    // Skip the first result (itself) and take the next k
    for (let j = 1; j < neighbors.length; j++) {
      const neighborIdx = nodes.indexOf(neighbors[j].point);
      if (neighborIdx !== -1 && neighborIdx !== i) {
        edgeCandidates.push({
          source: i,
          target: neighborIdx,
          weight: neighbors[j].distance,
        });
      }
    }
  }

  // Step 3: Sort edge candidates by weight (distance)
  edgeCandidates.sort((a, b) => a.weight - b.weight);

  // Step 4: Apply Kruskal's algorithm to find MST
  const parent = new Array(n).fill(-1);

  // Find root of the set containing x (with path compression)
  function find(x) {
    if (parent[x] === -1) return x;
    parent[x] = find(parent[x]);
    return parent[x];
  }

  // Union two sets
  function union(x, y) {
    const rootX = find(x);
    const rootY = find(y);
    if (rootX !== rootY) {
      parent[rootX] = rootY;
      return true;
    }
    return false;
  }

  const mstEdges = [];
  for (const edge of edgeCandidates) {
    if (mstEdges.length === n - 1) break; // MST has n-1 edges

    if (union(edge.source, edge.target)) {
      mstEdges.push([edge.source, edge.target]);
    }
  }

  return mstEdges;
}
