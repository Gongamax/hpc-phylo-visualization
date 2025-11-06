import { BaseLayout } from "./BaseLayout";
import * as d3 from "d3-force-3d";

/**
 * Default options for the force layout
 */
const defaultOptions = {
  strength: -30, // Node repulsion strength
  distance: 30, // Link distance
  iterations: 300, // Maximum iterations to run
  alpha: 0.3, // Initial alpha (temperature)
  alphaDecay: 0.02, // Alpha decay rate
  alphaMin: 0.001, // Stop simulation when alpha reaches this value
  velocityDecay: 0.4, // Velocity decay factor (friction)
  dimensions: 3, // 2D or 3D layout
};

/**
 * ForceLayout class for 3D force-directed graph layout using d3-force-3d
 */
export class ForceLayout extends BaseLayout {
  /**
   * Create a new ForceLayout instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    super(options);
    this._name = "ForceLayout";
    this._options = {
      ...defaultOptions,
      ...options,
    };

    // Internal state
    this._graph = null;
    this._simulation = null;
    this._nodeMap = new Map();
    this._lockedNodes = new Map();
    this._running = false;
  }

  /**
   * Initialize the graph data
   * @param {Object} graph - Graph data with nodes and links
   */
  initializeGraph(graph) {
    this._graph = graph;
    this._setupSimulation();
  }

  /**
   * Update the graph data
   * @param {Object} graph - Updated graph data
   */
  updateGraph(graph) {
    this._graph = graph;
    this._setupSimulation();
  }

  /**
   * Set up the force simulation
   * @private
   */
  _setupSimulation() {
    if (!this._graph) return;

    // Create a map of nodes for quick access
    this._nodeMap.clear();
    this._graph.nodes.forEach((node) => {
      this._nodeMap.set(node.id, node);
    });

    // If we had a previous simulation, stop it
    if (this._simulation) {
      this._simulation.stop();
    }

    // Create a new simulation
    this._simulation = d3
      .forceSimulation(this._graph.nodes)
      .force(
        "link",
        d3
          .forceLink(this._graph.links)
          .id((d) => d.id)
          .distance(this._options.distance)
      )
      .force("charge", d3.forceManyBody().strength(this._options.strength))
      .force("center", d3.forceCenter(0, 0, 0))
      .velocityDecay(this._options.velocityDecay);

    // Configure simulation parameters
    this._simulation
      .alpha(this._options.alpha)
      .alphaDecay(this._options.alphaDecay)
      .alphaMin(this._options.alphaMin)
      .stop();

    // Apply any locked nodes
    this._lockedNodes.forEach((position, nodeId) => {
      const node = this._nodeMap.get(nodeId);
      if (node) {
        node.fx = position.x;
        node.fy = position.y;
        node.fz = this._options.dimensions === 3 ? position.z || 0 : undefined;
      }
    });
  }

  /**
   * Start the layout calculation
   */
  start() {
    if (!this._simulation || this._running) return;

    this._running = true;
    // Run the simulation for a fixed number of iterations
    const iterations = this._options.iterations;

    console.log(`Running force layout for ${iterations} iterations`);

    // Run in batches for better UI responsiveness
    const batchSize = 50;
    let currentIteration = 0;

    const runBatch = () => {
      if (!this._running) return;

      const iterationsInBatch = Math.min(
        batchSize,
        iterations - currentIteration
      );

      // Run a batch of iterations
      for (let i = 0; i < iterationsInBatch; i++) {
        this._simulation.tick();
        currentIteration++;
      }

      // Notify that layout has changed
      this._callbacks.onLayoutChange();

      // Continue if there are more iterations
      if (currentIteration < iterations && this._running) {
        setTimeout(runBatch, 0);
      } else {
        console.log("Force layout completed");
        this._running = false;
        this._callbacks.onLayoutDone();
      }
    };

    // Start the first batch
    runBatch();
  }

  /**
   * Resume the layout calculation
   */
  resume() {
    if (!this._running) {
      this.start();
    }
  }

  /**
   * Stop the layout calculation
   */
  stop() {
    this._running = false;
    if (this._simulation) {
      this._simulation.stop();
    }
  }

  /**
   * Get the position of a node
   * @param {Object} node - Node object
   * @returns {Array} [x, y, z] position
   */
  getNodePosition(node) {
    if (!node) return [0, 0, 0];

    const x = node.x || 0;
    const y = node.y || 0;
    const z = this._options.dimensions === 3 ? node.z || 0 : 0;

    return [x, y, z];
  }

  /**
   * Get the position data for an edge
   * @param {Object} edge - Edge object
   * @returns {Object} Edge position data
   */
  getEdgePosition(edge) {
    const sourceId =
      typeof edge.source === "object" ? edge.source.id : edge.source;
    const targetId =
      typeof edge.target === "object" ? edge.target.id : edge.target;

    const sourceNode = this._nodeMap.get(sourceId) || edge.source;
    const targetNode = this._nodeMap.get(targetId) || edge.target;

    if (!sourceNode || !targetNode) {
      return {
        type: "line",
        sourcePosition: [0, 0, 0],
        targetPosition: [0, 0, 0],
        controlPoints: [],
      };
    }

    const sourcePosition = this.getNodePosition(sourceNode);
    const targetPosition = this.getNodePosition(targetNode);

    // Check if edge has custom control points for curved edges
    if (edge.controlPoints && edge.controlPoints.length > 0) {
      return {
        type: "curve",
        sourcePosition,
        targetPosition,
        controlPoints: edge.controlPoints,
      };
    }

    return {
      type: "line",
      sourcePosition,
      targetPosition,
      controlPoints: [],
    };
  }

  /**
   * Lock a node at a specific position
   * @param {string|Object} node - Node ID or node object
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate (optional)
   */
  lockNodePosition(node, x, y, z = 0) {
    const nodeId = typeof node === "object" ? node.id : node;
    this._lockedNodes.set(nodeId, { x, y, z });

    const graphNode = this._nodeMap.get(nodeId);
    if (graphNode && this._simulation) {
      graphNode.fx = x;
      graphNode.fy = y;
      graphNode.fz = this._options.dimensions === 3 ? z : undefined;
      this._callbacks.onLayoutChange();
    }
  }

  /**
   * Unlock a previously locked node
   * @param {string|Object} node - Node ID or node object
   */
  unlockNodePosition(node) {
    const nodeId = typeof node === "object" ? node.id : node;
    this._lockedNodes.delete(nodeId);

    const graphNode = this._nodeMap.get(nodeId);
    if (graphNode && this._simulation) {
      graphNode.fx = null;
      graphNode.fy = null;
      graphNode.fz = null;
      this._callbacks.onLayoutChange();
    }
  }

  /**
   * Reset the layout to initial positions
   */
  reset() {
    if (this._simulation) {
      this._simulation.alpha(this._options.alpha);
    }

    if (this._graph) {
      // Reset positions to initial state or randomize
      this._graph.nodes.forEach((node) => {
        if (!this._lockedNodes.has(node.id)) {
          // Reset non-locked nodes
          node.x = (Math.random() - 0.5) * 100;
          node.y = (Math.random() - 0.5) * 100;
          if (this._options.dimensions === 3) {
            node.z = (Math.random() - 0.5) * 100;
          } else {
            node.z = 0;
          }
        }
      });
    }

    this._callbacks.onLayoutChange();
  }
}
