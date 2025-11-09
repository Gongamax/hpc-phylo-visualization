# PhyD3 Demo - Newick Tree Visualization

A clean demonstration of the PhyD3 library for visualizing phylogenetic trees using Newick format input.

## Features

- ✅ **Newick Format Parser**: Uses [Phylio](https://github.com/vibbits/phylio) library for professional Newick parsing
- ✅ **Interactive Visualization**: Real-time tree rendering with PhyD3
- ✅ **SVG Export**: Export your trees as scalable vector graphics
- ✅ **Example Trees**: Pre-loaded examples to get started quickly
- ✅ **Clean UI**: Modern, responsive interface
- ✅ **Bundled Build**: Uses esbuild for fast, optimized bundling

## About PhyD3

PhyD3 is a phylogenetic tree viewer with extended phyloXML support for functional genomics data visualization. According to the PhyD3 paper:

> PhyD3 provides import and export tools to facilitate greater interoperability. Using the import tool users can supply trees in Newick and phyloXML formats, with optional numerical data, which can be easily converted to the extended phyloXML format with graph annotations.

This demo uses **Phylio** for Newick parsing and converts the parsed tree to PhyloXML format for PhyD3 visualization.

## Usage

### Running the Demo

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build the project:

   ```bash
   npm run build
   ```

3. Start the development server:

   ```bash
   npm run serve
   ```

4. The demo will open in your browser at `http://localhost:8080`

### Development Scripts

- `npm run build` - Build the bundled JavaScript file
- `npm run serve` - Start the HTTP server
- `npm run dev` - Build and serve in one command
- `npm run watch` - Watch for changes and rebuild automatically

### Using the Interface

1. **Enter a Newick string** in the textarea (or use one of the example links)
2. **Click "Load Tree"** to visualize the phylogenetic tree
3. **Click "Export SVG"** to download the visualization
4. **Click "Clear"** to reset the canvas

### Newick Format Examples

**Simple tree:**

```
(A,B,(C,D));
```

**Tree with branch lengths:**

```
((Human:0.2,Chimp:0.3):0.3,(Mouse:0.5,Rat:0.4):0.2);
```

**Complex tree:**

```
(((A:0.2,B:0.3):0.3,(C:0.5,D:0.3):0.2):0.3,E:0.7):0.0;
```

## Technical Details

### Dependencies

- `@vibbioinfocore/phyd3`: Core PhyD3 library for tree visualization
- `@vibbioinfocore/phyd3-parser-compat`: PhyloXML parser compatibility layer
- `@vibbioinfocore/phylio`: Professional Newick/PhyloXML/NEXUS parser
- `esbuild`: Fast JavaScript bundler
- `http-server`: Simple HTTP server for development

### Architecture

1. **Phylio Parser**: Parses Newick format strings using the official Phylio library
2. **PhyloXML Converter**: Converts the parsed tree structure to PhyloXML format
3. **PhyD3 Integration**: Uses PhyD3's native PhyloXML parser and renderer
4. **Export Functionality**: Serializes the SVG for download

### How It Works

```javascript
Newick String → phylio.parse() → Tree Structure →
phylioToPhyloXML() → PhyloXML String → DOMParser →
phyloxml.parse() → makeCompatTable() → build() →
SVG Tree Visualization
```

### Why Use a Bundler?

Modern browsers cannot directly import npm packages. The bundler (esbuild) resolves all npm dependencies and creates a single JavaScript file that can run in the browser.

## Citation

When using PhyD3, please cite:

> Kreft, L; Botzki, A; Coppens, F; Vandepoele, K; Van Bel, M
>
> **"PhyD3: a phylogenetic tree viewer with extended phyloXML support for functional genomics data visualization"**
>
> Bioinformatics (2017) PMID 28525531 doi:10.1093/bioinformatics/btx324

## License

This demo is provided as-is for testing and educational purposes.
