// mstWorker.js - compute MST in a Web Worker using Kruskal
// Expects message: { nodes: [{id}], edges: [{id, source, target, weight}] }
// Replies with: { mstEdgeIds: [id, ...] }

self.onmessage = function (e) {
  const { nodes, edges } = e.data;
  // convert to edge list
  const edgeList = edges.map((ed) => ({
    u: ed.source,
    v: ed.target,
    w: typeof ed.weight === "number" ? ed.weight : parseFloat(ed.weight) || 1,
    id: ed.id,
  }));
  edgeList.sort((a, b) => a.w - b.w);

  const parent = {};
  function find(x) {
    parent[x] = parent[x] === undefined ? x : parent[x];
    return parent[x] === x ? x : (parent[x] = find(parent[x]));
  }
  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  const mst = [];
  for (const e of edgeList) {
    if (find(e.u) !== find(e.v)) {
      union(e.u, e.v);
      mst.push(e.id);
    }
  }

  self.postMessage({ mstEdgeIds: mst });
};
