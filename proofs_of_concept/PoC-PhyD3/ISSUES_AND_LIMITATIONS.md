# PhyD3 Issues and Limitations

## 🤦 API Incompatibility Between PhyD3 and Phylio

**THE BIG PROBLEM**: PhyD3 and Phylio are from the same organization (@vibbioinfocore) but have **incompatible data structures**!

### The Issue

- **Phylio output**: Uses `branchLength` property
- **PhyD3 input**: Expects `length` property
- **Phylio output**: Uses plain JavaScript objects for `attributes`
- **PhyD3 input**: Expects ES6 `Map` objects for `attributes`

### Our Workaround

We added a transformation layer in `main.js`:

```javascript
const phyd3Data = {
  metadata: phylioData.metadata,
  nodes: phylioData.nodes.map((node) => ({
    name: node.name,
    event: node.event,
    ref: node.ref,
    length: node.branchLength || 0, // ← Transform property name
    attributes: new Map(Object.entries(node.attributes || {})), // ← Transform to Map
  })),
  edges: phylioData.edges,
};
```

**Note**: The `phyd3-parser-compat` library does this transformation, but ONLY for PhyloXML format, not for Newick.

---

## ❌ Radial Layout Not Supported

**Bad news**: PhyD3 does NOT support radial/circular layouts.

Looking at the TypeScript definitions and documentation:

- No `layout` option exists
- No mention of "radial", "circular", or alternative tree layouts
- Only rectangular phylogram/cladogram layouts are available
- There's a `drawBranch` option that takes a D3 link generator, but customizing this would require deep D3 knowledge

**If you need radial layouts**, you'll need to:

1. Use a different library (like raw D3.js with `d3.tree()` and `.separation()`)
2. Or use phylotree.js, ETE Toolkit, or other phylogenetic visualization tools
3. Or fork PhyD3 and add radial layout support yourself

---

## 🐌 Performance Issues with Large Trees

### The Reality

- **Small trees (<1000 nodes)**: Works fine
- **Medium trees (1000-5000 nodes)**: Slow but manageable with optimizations
- **Large trees (10K+ nodes)**: Struggles significantly, may freeze browser

### Why It's Slow

1. **DOM overhead**: PhyD3 uses D3 to create SVG elements for every node, edge, and label
2. **No virtualization**: All nodes are rendered at once, no lazy loading
3. **Complex styling**: Multiple SVG elements per node (circles, text, paths)
4. **Browser limits**: SVG rendering is CPU-intensive for thousands of elements

### Our Performance Optimizations

Added auto-detection for large trees (>1000 nodes) with these settings:

```javascript
{
  dynamicHide: true,        // Hide elements when zooming
  showLabels: false,        // Disable labels (major performance gain)
  showNodeNames: false,     // Disable node names
  showDomains: false,       // Disable domain visualization
  showGraphs: false,        // Disable graphs
  showTaxonomy: false,      // Disable taxonomy
  width: 1400,              // Larger canvas
  height: 1200
}
```

### Recommendations for 10K+ Trees

1. **Disable all labels** (biggest performance hit)
2. **Use performance mode** (auto-enabled in demo)
3. **Consider sampling**: Visualize a subset of the tree
4. **Pre-process**: Collapse clades or prune less important branches
5. **Use alternative tools**: For very large trees, consider:
   - **iTOL** (Interactive Tree Of Life) - web-based, handles huge trees
   - **FigTree** - desktop app, very fast
   - **ggtree** (R) - can create static images of large trees
   - **ETE Toolkit** (Python) - programmatic tree manipulation

---

## 📊 What PhyD3 IS Good For

Despite these limitations, PhyD3 is decent for:

- ✅ Small to medium trees (<5000 nodes)
- ✅ Interactive web-based visualization
- ✅ Branch length visualization (phylograms)
- ✅ Custom node attributes and metadata
- ✅ Export to SVG for publications
- ✅ Integration with modern JavaScript frameworks

---

## 🔧 Current Demo Features

### Working Features

1. ✅ Newick format parsing (via Phylio)
2. ✅ Automatic data transformation (Phylio → PhyD3)
3. ✅ Performance auto-optimization for large trees
4. ✅ SVG export
5. ✅ Debug info panel
6. ✅ Customizable rendering options

### Known Issues

1. ❌ No radial layout support
2. ⚠️ Poor performance with 10K+ nodes (library limitation)
3. ⚠️ No forest support (multiple trees in one file)
4. ⚠️ Limited zoom/pan controls (PhyD3 limitation)

---

## 💡 Conclusion

**PhyD3 is okay for small phylogenetic trees**, but:

- The API incompatibility with their own parser (Phylio) is ridiculous
- No radial layout is a major limitation
- Performance with large trees is poor

**For your thesis work with large trees (10K+ nodes)**, you should seriously consider:

1. **iTOL** - if you need interactive web visualization
2. **ggtree + R** - if you want publication-quality static images
3. **Custom D3.js implementation** - if you need full control and can invest time
4. **ETE Toolkit** - if you're comfortable with Python

This demo is good for testing and small datasets, but probably not production-ready for your HPC phylogenetic work.
