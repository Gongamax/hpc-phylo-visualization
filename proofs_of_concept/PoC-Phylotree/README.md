# 🌳 PoC-Phylotree

## Advanced Phylogenetic Tree Visualization with phylotree.js

A modern React TypeScript application demonstrating high-performance phylogenetic tree visualization using the specialized **phylotree.js** library. This Proof of Concept (PoC) explores the capabilities of D3.js-based phylogenetic visualization for large-scale scientific datasets.

### 🚀 Key Features

- **🧬 Phylotree.js Integration**: Uses the industry-standard phylotree.js library (v2.1.7)
- **⚡ High Performance**: Optimized for trees with thousands of species
- **📊 Multiple Layouts**: Rectangular, radial, and linear tree layouts
- **🎨 Interactive Features**: Brush selection, rerooting, branch manipulation
- **📁 Flexible Import**: Support for custom Newick format datasets
- **🎯 Sample Datasets**: Pre-loaded trees from simple (3 species) to complex (50+ species)
- **📱 Responsive Design**: Modern UI with mobile-friendly controls

### 🛠 Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite (fast development and optimized builds)
- **Visualization**: phylotree.js + D3.js v7
- **Styling**: Custom CSS with responsive design
- **Package Management**: npm

### 🎯 Scientific Focus

This project specifically addresses the limitations found in general-purpose graph visualization libraries (like Sigma.js) when applied to phylogenetic data. Phylotree.js was designed from the ground up for evolutionary biology and phylogenetics, offering:

- Native Newick/PhyloXML/NexML format support
- Phylogenetic-specific layouts and algorithms
- Optimized rendering for taxonomic trees
- Advanced features like branch categories and evolutionary distance scaling

### 📦 Quick Start

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Start Development Server**:

   ```bash
   npm run dev
   ```

3. **Open in Browser**:
   Visit `http://localhost:5173`

4. **Build for Production**:
   ```bash
   npm run build
   ```

### 🧪 Testing Datasets

The application includes sample phylogenetic trees of varying complexity:

- **Simple (3 species)**: Basic demonstration tree
- **Mammals (4 species)**: Simple mammalian phylogeny
- **Primates (8 species)**: Detailed primate evolutionary tree
- **Birds (12 species)**: Avian phylogenetic relationships
- **Vertebrates (50+ species)**: Large-scale vertebrate tree for performance testing

### 📊 Performance Comparison

| Tree Size       | Web Performance | phylotree.js  | Sigma.js (Previous PoC) |
| --------------- | --------------- | ------------- | ----------------------- |
| < 20 species    | ✅ Excellent    | ✅ Excellent  | ✅ Good                 |
| 20-100 species  | ✅ Very Good    | ✅ Very Good  | ⚠️ Acceptable           |
| 100-500 species | ✅ Good         | ✅ Good       | ❌ Poor                 |
| 500+ species    | ✅ Acceptable   | ✅ Acceptable | ❌ Unusable             |

### 🔬 Research Applications

This PoC demonstrates the feasibility of web-based phylogenetic visualization for:

- **Educational Tools**: Interactive phylogenetic learning
- **Research Collaboration**: Shareable web-based tree exploration
- **Data Presentation**: Publication-quality tree rendering
- **Large Dataset Analysis**: Performance testing with research-scale trees

### 🏗 Project Structure

```
src/
├── components/
│   ├── PhylotreeVisualization.tsx  # Main tree rendering component
│   └── ControlPanel.tsx            # UI controls and sample data
├── types/
│   └── phylotree.d.ts             # TypeScript definitions
├── App.tsx                        # Main application component
├── App.css                        # Styling and responsive design
└── main.tsx                       # Application entry point
```

### 📈 Future Enhancements

- Integration with phylogenetic databases (TreeBASE, Open Tree of Life)
- Export capabilities (SVG, PNG, PDF)
- Advanced styling and annotation features
- Real-time collaborative tree editing
- WebGL acceleration for extreme-scale datasets

### 📝 License

This project is part of academic research into web-based scientific visualization tools.
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
