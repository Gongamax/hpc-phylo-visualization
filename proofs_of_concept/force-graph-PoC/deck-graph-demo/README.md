# Deck.gl Graph Visualization with MST and Spatial Analysis

This project demonstrates visualizing large graph structures and computing MSTs (Minimum Spanning Trees) using Deck.gl and spatial indexing algorithms. It's designed specifically for phylogenetic analysis and evolutionary data visualization.

## Features Implemented

1. **Basic graph visualization** using Deck.gl ScatterplotLayer and LineLayer
2. **Optimized MST calculation** using KD-Tree spatial indexing for O(n log n) performance
3. **Performance comparison** between naive O(n²) and optimized approaches
4. **Random graph generation** with clustered structure similar to phylogenetic data
5. **Orthographic 2D view** optimized for graph exploration

## Features to Add Next

1. **Hierarchical clustering** for multi-level exploration
2. **Load/export capabilities** for real phylogenetic datasets
3. **Ancillary data visualization** on nodes (color, size)
4. **Selection and filtering** tools for data exploration
5. **Level of detail rendering** for very large graphs

## Usage

The main interface includes:

- Generate a random clustered graph of customizable size
- Compute MST with either naive or KD-Tree optimized algorithms
- Toggle between different visualization modes
- View performance metrics

## Implementation Details

The project uses:

- `kdtree.js`: Spatial indexing for nearest-neighbor queries
- `graph-algorithms.js`: MST and graph analysis algorithms
- React for UI components with Deck.gl for GPU-accelerated visualization

## Next Steps for Thesis

For phylogenetic analysis specifically:

- Import real phylogenetic data from Newick/Nexus formats
- Implement specialized tree layouts for phylogenetic data
- Add mutation/distance calculations
- Support evolutionary metrics as ancillary data
