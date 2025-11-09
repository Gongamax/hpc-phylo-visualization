# Troubleshooting Guide

## Issue: Only Seeing a Single Green Node

### Problem

When loading a tree, only a single green node appears instead of the full tree structure.

### Root Cause

Phylio returns a **graph structure** (nodes + edges), not a hierarchical tree with children. The original conversion function wasn't properly reconstructing the tree hierarchy from the graph.

### Solution Applied

Updated `phylioToPhyloXML()` function to:

1. Create a map of all nodes by their reference ID
2. Rebuild parent-child relationships using the edges array
3. Find the root node from metadata
4. Recursively build the PhyloXML from the reconstructed tree

### How to Debug

1. **Open the Debug Panel**: After loading a tree, click "🔍 Debug Info" to see:

   - Number of nodes and edges parsed
   - Root node reference
   - All nodes with their names and properties
   - Edge connections

2. **Check Browser Console**: Press F12 (or Cmd+Option+I on Mac) to see:

   - Full parsed tree structure from Phylio
   - Generated PhyloXML
   - PhyD3 compatibility table

3. **Verify Tree Structure**: Look for these indicators:
   - ✓ Number of nodes should match your tree (e.g., 5 nodes for `(A,B,(C,D));`)
   - ✓ Number of edges should be nodes - 1
   - ✓ Each node should have proper parent-child connections

### Expected Output for `(A,B,(C,D));`

**Debug Panel should show:**

```
Input Newick: (A,B,(C,D));

Parsed tree structure:
- Nodes: 5
- Edges: 4
- Root: 0

Node 0: (unnamed) [Clade] length=0
Node 1: A [Taxa] length=0
Node 2: B [Taxa] length=0
Node 3: (unnamed) [Clade] length=0
Node 4: C [Taxa] length=0
Node 5: D [Taxa] length=0

Edges:
  0 -> 1
  0 -> 2
  0 -> 3
  3 -> 4
  3 -> 5

✓ PhyloXML generated (XXX chars)
✓ XML parsed successfully
✓ PhyD3 compat table created
  - 5 nodes
  - 4 edges
✓ SVG tree built
✓ Tree rendered successfully!
```

### Common Issues

#### 1. Empty or Missing Nodes

**Symptom**: Debug shows 0 or 1 node
**Cause**: Newick string might be malformed
**Solution**:

- Ensure Newick string ends with `;`
- Check for balanced parentheses
- Try a simple example: `(A,B);`

#### 2. Nodes Exist But Not Displayed

**Symptom**: Debug shows correct node count, but tree isn't visible
**Cause**: SVG rendering issue or styling problem
**Solution**:

- Check browser console for errors
- Verify the tree container has content
- Try zooming out in the browser

#### 3. Parse Error

**Symptom**: Error message about XML parsing
**Cause**: PhyloXML generation failed
**Solution**:

- Check debug panel for the exact error
- Verify special characters in node names are properly escaped
- Try a simpler tree structure

## Testing Steps

1. **Start Fresh**:

   ```bash
   npm run build
   npm run serve
   ```

2. **Test Simple Tree**:

   - Input: `(A,B);`
   - Expected: 3 nodes (root + A + B), 2 edges

3. **Test Complex Tree**:

   - Input: `(((A:0.2,B:0.3):0.3,(C:0.5,D:0.3):0.2):0.3,E:0.7):0.0;`
   - Expected: 9 nodes, 8 edges, visible branch lengths

4. **Check Visualization**:
   - Should see circles (nodes)
   - Should see lines connecting them (branches)
   - Should see labels (node names)
   - Branch lengths should be proportional

## PhyD3 vs Phylio Data Structures

### Phylio Output (Graph):

```javascript
{
  metadata: [{name: "...", parent: 0, rooted: true}],
  nodes: [
    {ref: 0, name: "", event: "Clade", branchLength: 0},
    {ref: 1, name: "A", event: "Taxa", branchLength: 0.1}
  ],
  edges: [
    {source: 0, sink: 1}
  ]
}
```

### Our Conversion (Tree):

```javascript
{
  ref: 0,
  name: "",
  branchLength: 0,
  children: [
    {ref: 1, name: "A", branchLength: 0.1, children: []}
  ]
}
```

### PhyloXML Format:

```xml
<phyloxml>
  <phylogeny rooted="true">
    <clade>
      <name></name>
      <clade>
        <name>A</name>
        <branch_length>0.1</branch_length>
      </clade>
    </clade>
  </phylogeny>
</phyloxml>
```

## Still Not Working?

1. Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)
2. Check the browser console for JavaScript errors
3. Verify `dist/bundle.js` was created and is recent
4. Try a different browser
5. Check that the server is running on the correct port
6. Paste the full debug output for further analysis
