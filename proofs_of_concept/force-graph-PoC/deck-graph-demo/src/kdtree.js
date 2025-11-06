/**
 * KD-Tree implementation for fast nearest-neighbor queries
 *
 * This spatial indexing structure enables O(log n) lookups for nearest neighbors,
 * which is essential for efficiently computing MSTs and other spatial algorithms
 * on large graphs without testing all O(n²) possible edges.
 */

// Node in the k-d tree
class KDTreeNode {
  constructor(point, axis, left = null, right = null) {
    this.point = point; // The point (node) stored at this node
    this.axis = axis; // The axis this node discriminates on (0 for x, 1 for y, etc)
    this.left = left; // Left subtree with points having smaller coordinate values on axis
    this.right = right; // Right subtree with points having larger coordinate values on axis
  }
}

export default class KDTree {
  /**
   * Construct a k-d tree from an array of points
   * @param {Array} points - Array of objects with x, y properties
   * @param {number} k - Number of dimensions (default: 2 for x,y)
   */
  constructor(points, k = 2) {
    this.root = null;
    this.k = k;
    this.dimensions = ["x", "y"]; // Default dimension names for 2D

    if (points && points.length > 0) {
      this.root = this.buildTree(points, 0);
    }
  }

  /**
   * Recursively build the k-d tree
   */
  buildTree(points, depth) {
    if (points.length === 0) return null;

    // Select axis based on depth (cycle through dimensions)
    const axis = depth % this.k;
    const dim = this.dimensions[axis];

    // Sort points along the chosen axis
    points.sort((a, b) => a[dim] - b[dim]);

    // Select median as pivot (middle point)
    const medianIdx = Math.floor(points.length / 2);
    const median = points[medianIdx];

    // Create node and construct subtrees
    const node = new KDTreeNode(
      median,
      axis,
      this.buildTree(points.slice(0, medianIdx), depth + 1),
      this.buildTree(points.slice(medianIdx + 1), depth + 1)
    );

    return node;
  }

  /**
   * Find the nearest neighbors to a query point within a given radius
   * @param {Object} queryPoint - Point to query (with x, y properties)
   * @param {number} radius - Search radius
   * @return {Array} Array of points within radius, sorted by distance
   */
  findNeighborsInRadius(queryPoint, radius) {
    const neighbors = [];

    // Helper to calculate squared distance between two points
    const distanceSquared = (a, b) => {
      let sum = 0;
      for (let i = 0; i < this.k; i++) {
        const dim = this.dimensions[i];
        const diff = a[dim] - b[dim];
        sum += diff * diff;
      }
      return sum;
    };

    // Recursively search the tree
    const searchNode = (node, depth) => {
      if (!node) return;

      const axis = depth % this.k;
      const dim = this.dimensions[axis];

      // Calculate distance to the current node
      const currentDistance = distanceSquared(queryPoint, node.point);

      // If this node is within radius, add to neighbors
      if (currentDistance <= radius * radius) {
        neighbors.push({
          point: node.point,
          distance: Math.sqrt(currentDistance),
        });
      }

      // Calculate distance to the splitting plane
      const planeDistance = queryPoint[dim] - node.point[dim];

      // Search the near side of the splitting plane
      if (planeDistance <= 0) {
        searchNode(node.left, depth + 1);
        // Only search the far side if it could contain points within radius
        if (Math.abs(planeDistance) <= radius) {
          searchNode(node.right, depth + 1);
        }
      } else {
        searchNode(node.right, depth + 1);
        // Only search the far side if it could contain points within radius
        if (Math.abs(planeDistance) <= radius) {
          searchNode(node.left, depth + 1);
        }
      }
    };

    // Start recursive search from the root
    searchNode(this.root, 0);

    // Sort neighbors by distance
    return neighbors.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Find the k nearest neighbors to a query point
   * @param {Object} queryPoint - Point to query (with x, y properties)
   * @param {number} k - Number of neighbors to find
   * @return {Array} k nearest neighbors, sorted by distance
   */
  findKNearestNeighbors(queryPoint, k) {
    if (!this.root) return [];

    // Priority queue implementation with fixed size k
    const queue = {
      items: [],
      maxSize: k,

      // Add item with priority (higher distance = lower priority)
      insert: function (item, distance) {
        // Binary search for insertion position
        let low = 0;
        let high = this.items.length;

        while (low < high) {
          const mid = Math.floor((low + high) / 2);
          if (this.items[mid].distance < distance) {
            low = mid + 1;
          } else {
            high = mid;
          }
        }

        // Insert at found position
        this.items.splice(low, 0, { point: item, distance });

        // Keep only maxSize elements
        if (this.items.length > this.maxSize) {
          this.items.shift();
        }
      },

      maxDistance: function () {
        return this.items.length >= this.maxSize
          ? this.items[0].distance
          : Infinity;
      },
    };

    // Helper to calculate squared distance between two points
    const distanceSquared = (a, b) => {
      let sum = 0;
      for (let i = 0; i < this.k; i++) {
        const dim = this.dimensions[i];
        const diff = a[dim] - b[dim];
        sum += diff * diff;
      }
      return sum;
    };

    // Recursively search the tree
    const searchNode = (node, depth) => {
      if (!node) return;

      const axis = depth % this.k;
      const dim = this.dimensions[axis];

      // Calculate squared distance to the current node
      const currentDistance = distanceSquared(queryPoint, node.point);

      // Skip the query point itself (zero distance)
      if (currentDistance > 0) {
        queue.insert(node.point, currentDistance);
      }

      // Calculate distance to the splitting plane
      const planeDistance = queryPoint[dim] - node.point[dim];

      // Determine near and far sides of the splitting plane
      const nearSide = planeDistance <= 0 ? node.left : node.right;
      const farSide = planeDistance <= 0 ? node.right : node.left;

      // Search near side first
      searchNode(nearSide, depth + 1);

      // Only search the far side if it could contain closer points
      const maxDistInQueue = queue.maxDistance();
      if (planeDistance * planeDistance < maxDistInQueue) {
        searchNode(farSide, depth + 1);
      }
    };

    // Start recursive search from the root
    searchNode(this.root, 0);

    // Convert to array and take sqrt to get actual distances
    return queue.items
      .map((item) => ({
        point: item.point,
        distance: Math.sqrt(item.distance),
      }))
      .reverse(); // Reverse to get nearest first
  }
}
