# Graph Visualization & MST Computation - PoC

A proof of concept for phylogenetic tree visualization with graph theory algorithms, built with React, Vite, TypeScript, and Sigma.js.

## 🚀 Features

- **Interactive Graph Visualization**: Powered by Sigma.js for smooth, interactive graph rendering
- **Minimum Spanning Tree (MST) Computation**: Implementation of Kruskal's algorithm with Union-Find data structure
- **Dynamic Graph Generation**: Create random connected graphs with customizable node and edge counts
- **Real-time Statistics**: Display total weight, MST weight, and weight savings
- **Responsive Design**: Modern, glassmorphism-inspired UI that works on all devices
- **Toggle Views**: Switch between full graph view and MST-only view

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Graph Visualization**: Sigma.js + Graphology
- **Algorithms**: Kruskal's MST algorithm with Union-Find
- **Styling**: Modern CSS with gradient backgrounds and glassmorphism effects

## 🏃‍♂️ Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd PoC-Sigma
```

2. Install dependencies

```bash
npm install
```

3. Start the development server

```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## 🎯 Usage

1. **Adjust Graph Parameters**: Use the control panel to set the number of nodes (3-20) and edges
2. **Generate New Graph**: Click "Generate New Graph" to create a random connected graph
3. **View MST**: Toggle "Show MST Only" to display only the minimum spanning tree
4. **Analyze Statistics**: Check the statistics panel for weight comparisons and graph properties

## 🧮 Algorithms

### Minimum Spanning Tree (Kruskal's Algorithm)

- **Time Complexity**: O(E log E) where E is the number of edges
- **Space Complexity**: O(V) where V is the number of vertices
- **Implementation**: Uses Union-Find data structure with path compression and union by rank

### Graph Generation

- Ensures connectivity by first creating a spanning tree
- Adds additional random edges up to the specified count
- Assigns random weights to all edges

## 🎨 Features in Detail

- **Interactive Visualization**: Click and drag nodes, zoom in/out, pan around the graph
- **Color Coding**: MST edges are highlighted in red, regular edges in gray
- **Edge Labels**: All edges display their weights for easy analysis
- **Statistics Dashboard**: Real-time calculation of graph metrics
- **Responsive Layout**: Adapts to different screen sizes with mobile-friendly controls

## 📁 Project Structure

```
src/
├── components/
│   ├── GraphVisualization.tsx  # Sigma.js graph rendering component
│   └── ControlPanel.tsx        # UI controls for graph parameters
├── utils/
│   └── mst.ts                  # MST algorithms and graph utilities
├── App.tsx                     # Main application component
└── App.css                     # Application styling
```

## 🔬 Use Cases

This PoC is designed for research in:

- **Phylogenetic Tree Analysis**: Understanding tree structures and relationships
- **Network Analysis**: Exploring graph connectivity and optimization
- **Algorithm Visualization**: Educational tool for understanding MST algorithms
- **Data Visualization**: Techniques for interactive graph presentation

## 🚀 Future Enhancements

- Support for different MST algorithms (Prim's algorithm)
- Import/export functionality for graph data
- Advanced graph layouts and clustering
- Performance optimizations for larger graphs
- Integration with phylogenetic data formats

## 📝 License

This project is created for academic research purposes.
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
globalIgnores(['dist']),
{
files: ['**/*.{ts,tsx}'],
extends: [
// Other configs...
// Enable lint rules for React
reactX.configs['recommended-typescript'],
// Enable lint rules for React DOM
reactDom.configs.recommended,
],
languageOptions: {
parserOptions: {
project: ['./tsconfig.node.json', './tsconfig.app.json'],
tsconfigRootDir: import.meta.dirname,
},
// other options...
},
},
])

```

```
