# Force-Graph PoC: Theory & Concepts

## Force-Directed Graphs

A force-directed graph uses a physics simulation to arrange nodes in a visually meaningful way. Nodes are treated as particles, and edges as springs. The main forces are:

- **Link force:** attracts connected nodes together.
- **Repulsion (many-body):** prevents nodes from collapsing into each other.
- **Centering force:** keeps the graph within view.

This layout is iterative and continues until the system stabilizes, producing a readable graph structure.

## Minimum Spanning Tree (MST)

Given a connected, weighted graph, the MST is a subset of edges that connects all nodes with the minimum possible total edge weight, without cycles. MSTs are useful for network design, clustering, and data visualization.

### Kruskal’s Algorithm

Kruskal’s algorithm is a classic method for finding the MST:

1. Sort all edges by weight.
2. Add edges one by one, skipping any that would form a cycle (using Union-Find for cycle detection).
3. Stop when all nodes are connected.

In this PoC, edge weights are the Euclidean distances between node positions after the force-directed layout.

## Expand/Collapse Tree

After computing the MST, the graph is treated as a tree. Nodes can be expanded or collapsed to show/hide subtrees, making it easier to explore large graphs interactively.

## Scalability Considerations

- **Force computation:** Naive algorithms are O(N²) per tick. Approximations (Barnes-Hut, GPU) can improve performance.
- **Rendering:** Large graphs require level-of-detail, aggregation, or progressive rendering.
- **Layout:** For very large graphs, layout can be computed offline and streamed to the client.

## How This PoC Works

- Generates a random connected graph with extra edges.
- Uses react-force-graph-2d for layout and rendering.
- Computes MST using Kruskal’s algorithm, with weights based on node positions.
- Allows interactive exploration by expanding/collapsing subtrees.
- Node size and pie charts visualize additional metrics.

---

**References:**

- [Force-directed graph drawing](https://en.wikipedia.org/wiki/Force-directed_graph_drawing)
- [Minimum spanning tree](https://en.wikipedia.org/wiki/Minimum_spanning_tree)
- [Kruskal's algorithm](https://en.wikipedia.org/wiki/Kruskal%27s_algorithm)
- [Barnes-Hut simulation](https://en.wikipedia.org/wiki/Barnes%E2%80%93Hut_simulation)
