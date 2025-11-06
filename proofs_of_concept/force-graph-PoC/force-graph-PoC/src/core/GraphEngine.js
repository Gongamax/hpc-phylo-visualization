/**
 * GraphEngine class to manage graph data and layout
 */
export class GraphEngine {
  /**
   * Create a new GraphEngine instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this._options = {
      defaultNodeSize: 5,
      defaultEdgeWidth: 1,
      defaultNodeColor: [255, 140, 0],
      defaultEdgeColor: [180, 180, 180],
      ...options,
    };

    // Data state
    this._originalData = { nodes: [], links: [] };
    this._processedData = { nodes: [], links: [] };
    this._nodeMap = new Map();
    this._edgeMap = new Map();
    this._selectedNodes = new Set();
    this._selectedEdges = new Set();
    this._hoveredNode = null;
    this._hoveredEdge = null;

    // Layout
    this._layout = null;
    this._callbacks = {
      onDataChange: () => {},
      onLayoutChange: () => {},
      onSelectionChange: () => {},
      onHoverChange: () => {},
    };

    // Rendering state
    this._renderKey = 0;
  }

  /**
   * Register callbacks
   * @param {Object} callbacks - Callback functions
   */
  registerCallbacks(callbacks) {
    this._callbacks = {
      ...this._callbacks,
      ...callbacks,
    };

    if (this._layout) {
      this._layout.registerCallbacks({
        onLayoutChange: this._handleLayoutChange.bind(this),
        onLayoutDone: this._handleLayoutDone.bind(this),
        onLayoutError: this._handleLayoutError.bind(this),
      });
    }
  }

  /**
   * Set the layout algorithm
   * @param {BaseLayout} layout - Layout algorithm instance
   */
  setLayout(layout) {
    if (this._layout) {
      this._layout.unregisterCallbacks();
      this._layout.stop();
    }

    this._layout = layout;

    if (this._layout) {
      this._layout.registerCallbacks({
        onLayoutChange: this._handleLayoutChange.bind(this),
        onLayoutDone: this._handleLayoutDone.bind(this),
        onLayoutError: this._handleLayoutError.bind(this),
      });

      if (this._processedData.nodes.length > 0) {
        this._layout.initializeGraph(this._processedData);
      }
    }
  }

  /**
   * Set graph data
   * @param {Object} data - Graph data with nodes and links
   */
  setData(data) {
    this._originalData = {
      nodes: [...(data.nodes || [])],
      links: [...(data.links || [])],
    };

    this._processData();

    if (this._layout) {
      this._layout.initializeGraph(this._processedData);
    }

    this._callbacks.onDataChange(this._processedData);
  }

  /**
   * Get the processed data
   * @returns {Object} Processed graph data
   */
  getData() {
    return this._processedData;
  }

  /**
   * Process the raw data into a format suitable for visualization
   * @private
   */
  _processData() {
    const {
      defaultNodeSize,
      defaultEdgeWidth,
      defaultNodeColor,
      defaultEdgeColor,
    } = this._options;

    // Reset maps
    this._nodeMap.clear();
    this._edgeMap.clear();

    // Process nodes
    this._processedData.nodes = this._originalData.nodes.map((node, index) => {
      const processedNode = {
        ...node,
        index,
        radius: node.radius || defaultNodeSize,
        color: node.color || defaultNodeColor,
        position: node.position || [0, 0, 0],
      };

      this._nodeMap.set(node.id, processedNode);
      return processedNode;
    });

    // Process links/edges
    this._processedData.links = this._originalData.links.map((link, index) => {
      const sourceId =
        typeof link.source === "object" ? link.source.id : link.source;
      const targetId =
        typeof link.target === "object" ? link.target.id : link.target;

      const processedLink = {
        ...link,
        index,
        source: sourceId,
        target: targetId,
        width: link.width || defaultEdgeWidth,
        color: link.color || defaultEdgeColor,
      };

      const edgeId = `${sourceId}-${targetId}`;
      this._edgeMap.set(edgeId, processedLink);
      return processedLink;
    });

    this._renderKey++;
  }

  /**
   * Start the layout calculation
   */
  startLayout() {
    if (this._layout) {
      this._layout.start();
    }
  }

  /**
   * Stop the layout calculation
   */
  stopLayout() {
    if (this._layout) {
      this._layout.stop();
    }
  }

  /**
   * Resume the layout calculation
   */
  resumeLayout() {
    if (this._layout) {
      this._layout.resume();
    }
  }

  /**
   * Reset the layout to initial state
   */
  resetLayout() {
    if (this._layout) {
      this._layout.reset();
    }
  }

  /**
   * Handle layout change event
   * @private
   */
  _handleLayoutChange() {
    this._renderKey++;
    this._callbacks.onLayoutChange(this._processedData);
  }

  /**
   * Handle layout done event
   * @private
   */
  _handleLayoutDone() {
    this._renderKey++;
    this._callbacks.onLayoutChange(this._processedData);
  }

  /**
   * Handle layout error event
   * @private
   * @param {Error} error - Error that occurred
   */
  _handleLayoutError(error) {
    console.error("Layout error:", error);
  }

  /**
   * Get node by ID
   * @param {string} id - Node ID
   * @returns {Object|null} Node object or null if not found
   */
  getNodeById(id) {
    return this._nodeMap.get(id) || null;
  }

  /**
   * Get edge by source and target IDs
   * @param {string} sourceId - Source node ID
   * @param {string} targetId - Target node ID
   * @returns {Object|null} Edge object or null if not found
   */
  getEdgeByEndpoints(sourceId, targetId) {
    return (
      this._edgeMap.get(`${sourceId}-${targetId}`) ||
      this._edgeMap.get(`${targetId}-${sourceId}`) ||
      null
    );
  }

  /**
   * Get the render key for triggering re-renders
   * @returns {number} Render key
   */
  getRenderKey() {
    return this._renderKey;
  }

  /**
   * Get node positions from the current layout
   * @returns {Object} Map of node IDs to positions
   */
  getNodePositions() {
    if (!this._layout) return {};

    const positions = {};
    this._processedData.nodes.forEach((node) => {
      positions[node.id] = this._layout.getNodePosition(node);
    });
    return positions;
  }

  /**
   * Get edge positions from the current layout
   * @returns {Object} Map of edge IDs to position data
   */
  getEdgePositions() {
    if (!this._layout) return {};

    const positions = {};
    this._processedData.links.forEach((edge) => {
      const edgeId = `${edge.source}-${edge.target}`;
      positions[edgeId] = this._layout.getEdgePosition(edge);
    });
    return positions;
  }

  /**
   * Lock a node at a specific position
   * @param {string} nodeId - Node ID
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate (optional)
   */
  lockNodePosition(nodeId, x, y, z = 0) {
    if (this._layout) {
      this._layout.lockNodePosition(nodeId, x, y, z);
    }
  }

  /**
   * Unlock a previously locked node
   * @param {string} nodeId - Node ID
   */
  unlockNodePosition(nodeId) {
    if (this._layout) {
      this._layout.unlockNodePosition(nodeId);
    }
  }

  /**
   * Select a node
   * @param {string} nodeId - Node ID
   * @param {boolean} multiSelect - Whether to allow multiple selection
   */
  selectNode(nodeId, multiSelect = false) {
    if (!multiSelect) {
      this._selectedNodes.clear();
      this._selectedEdges.clear();
    }
    this._selectedNodes.add(nodeId);
    this._renderKey++;
    this._callbacks.onSelectionChange({
      nodes: Array.from(this._selectedNodes),
      edges: Array.from(this._selectedEdges),
    });
  }

  /**
   * Select an edge
   * @param {string} sourceId - Source node ID
   * @param {string} targetId - Target node ID
   * @param {boolean} multiSelect - Whether to allow multiple selection
   */
  selectEdge(sourceId, targetId, multiSelect = false) {
    if (!multiSelect) {
      this._selectedNodes.clear();
      this._selectedEdges.clear();
    }
    this._selectedEdges.add(`${sourceId}-${targetId}`);
    this._renderKey++;
    this._callbacks.onSelectionChange({
      nodes: Array.from(this._selectedNodes),
      edges: Array.from(this._selectedEdges),
    });
  }

  /**
   * Clear all selections
   */
  clearSelection() {
    this._selectedNodes.clear();
    this._selectedEdges.clear();
    this._renderKey++;
    this._callbacks.onSelectionChange({
      nodes: [],
      edges: [],
    });
  }

  /**
   * Set hovered node
   * @param {string|null} nodeId - Node ID or null
   */
  setHoveredNode(nodeId) {
    this._hoveredNode = nodeId;
    this._renderKey++;
    this._callbacks.onHoverChange({
      node: this._hoveredNode,
      edge: this._hoveredEdge,
    });
  }

  /**
   * Set hovered edge
   * @param {string|null} sourceId - Source node ID or null
   * @param {string|null} targetId - Target node ID or null
   */
  setHoveredEdge(sourceId, targetId) {
    this._hoveredEdge = sourceId && targetId ? `${sourceId}-${targetId}` : null;
    this._renderKey++;
    this._callbacks.onHoverChange({
      node: this._hoveredNode,
      edge: this._hoveredEdge,
    });
  }

  /**
   * Check if a node is selected
   * @param {string} nodeId - Node ID
   * @returns {boolean} True if node is selected
   */
  isNodeSelected(nodeId) {
    return this._selectedNodes.has(nodeId);
  }

  /**
   * Check if an edge is selected
   * @param {string} sourceId - Source node ID
   * @param {string} targetId - Target node ID
   * @returns {boolean} True if edge is selected
   */
  isEdgeSelected(sourceId, targetId) {
    return (
      this._selectedEdges.has(`${sourceId}-${targetId}`) ||
      this._selectedEdges.has(`${targetId}-${sourceId}`)
    );
  }

  /**
   * Check if a node is hovered
   * @param {string} nodeId - Node ID
   * @returns {boolean} True if node is hovered
   */
  isNodeHovered(nodeId) {
    return this._hoveredNode === nodeId;
  }

  /**
   * Check if an edge is hovered
   * @param {string} sourceId - Source node ID
   * @param {string} targetId - Target node ID
   * @returns {boolean} True if edge is hovered
   */
  isEdgeHovered(sourceId, targetId) {
    return (
      this._hoveredEdge === `${sourceId}-${targetId}` ||
      this._hoveredEdge === `${targetId}-${sourceId}`
    );
  }
}
