/* eslint-disable no-unused-vars */
/**
 * BaseLayout class - an abstract class defining the interface for layout algorithms
 */
export class BaseLayout {
  /**
   * Creates a new layout instance
   * @param {Object} options - Configuration options for the layout
   */
  constructor(options = {}) {
    this._name = "BaseLayout";
    this._options = { ...options };
    this._callbacks = {
      onLayoutChange: () => {},
      onLayoutDone: () => {},
      onLayoutError: () => {},
    };
  }

  /**
   * Register callbacks to be triggered when layout changes
   * @param {Object} callbacks - Callback functions
   * @param {Function} callbacks.onLayoutChange - Called when layout positions change
   * @param {Function} callbacks.onLayoutDone - Called when layout calculation is complete
   * @param {Function} callbacks.onLayoutError - Called when an error occurs
   */
  registerCallbacks(callbacks) {
    this._callbacks = {
      ...this._callbacks,
      ...callbacks,
    };
  }

  /**
   * Unregister callbacks when layout is no longer needed
   */
  unregisterCallbacks() {
    this._callbacks = {
      onLayoutChange: () => {},
      onLayoutDone: () => {},
      onLayoutError: () => {},
    };
  }

  // Methods that should be implemented by subclasses

  /**
   * Initialize with graph data - must be implemented by subclasses
   * @param {Object} graph - Graph data with nodes and links
   * @throws {Error} If not implemented by subclass
   */
  initializeGraph(_graph) {
    throw new Error(`${this._name}: initializeGraph() not implemented`);
  }

  /**
   * Update existing graph data - must be implemented by subclasses
   * @param {Object} graph - Updated graph data
   * @throws {Error} If not implemented by subclass
   */
  updateGraph(_graph) {
    throw new Error(`${this._name}: updateGraph() not implemented`);
  }

  /**
   * Start the layout calculation - must be implemented by subclasses
   * @throws {Error} If not implemented by subclass
   */
  start() {
    throw new Error(`${this._name}: start() not implemented`);
  }

  /**
   * Resume layout calculation after pause - must be implemented by subclasses
   * @throws {Error} If not implemented by subclass
   */
  resume() {
    throw new Error(`${this._name}: resume() not implemented`);
  }

  /**
   * Stop layout calculation - must be implemented by subclasses
   * @throws {Error} If not implemented by subclass
   */
  stop() {
    throw new Error(`${this._name}: stop() not implemented`);
  }

  /**
   * Reset layout to initial state - must be implemented by subclasses
   * @throws {Error} If not implemented by subclass
   */
  reset() {
    throw new Error(`${this._name}: reset() not implemented`);
  }

  /**
   * Get position of a node - must be implemented by subclasses
   * @param {Object} node - Node object
   * @returns {Array} [x, y, z] position
   * @throws {Error} If not implemented by subclass
   */
  getNodePosition(_node) {
    throw new Error(`${this._name}: getNodePosition() not implemented`);
  }

  /**
   * Get position data for an edge - must be implemented by subclasses
   * @param {Object} edge - Edge object
   * @returns {Object} Edge position data
   * @throws {Error} If not implemented by subclass
   */
  getEdgePosition(_edge) {
    throw new Error(`${this._name}: getEdgePosition() not implemented`);
  }

  /**
   * Lock a node at a specific position
   * @param {string|Object} nodeId - Node ID or node object
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   * @throws {Error} If not implemented by subclass
   */
  lockNodePosition(_nodeId, _x, _y, _z) {
    throw new Error(`${this._name}: lockNodePosition() not implemented`);
  }

  /**
   * Unlock a previously locked node
   * @param {string|Object} nodeId - Node ID or node object
   * @throws {Error} If not implemented by subclass
   */
  unlockNodePosition(_nodeId) {
    throw new Error(`${this._name}: unlockNodePosition() not implemented`);
  }

  /**
   * Check equality with another layout
   * @param {BaseLayout} layout - Layout to compare with
   * @returns {boolean} True if layouts are equal
   */
  equals(layout) {
    if (!layout || !(layout instanceof BaseLayout)) {
      return false;
    }
    return this._name === layout._name;
  }
}
