
import GraphGL, { JSONLoader, NODE_TYPE, D3ForceLayout } from "@frutuoso/graph.gl";

const demoData = {
  nodes: [
    { id: "A" },
    { id: "B" },
    { id: "C" }
  ],
  edges: [
    { id: "AB", sourceId: "A", targetId: "B" },
    { id: "BC", sourceId: "B", targetId: "C" },
    { id: "CA", sourceId: "C", targetId: "A" }
  ]
};

const App = () => {
  const graph = JSONLoader({
    json: demoData,
    nodeParser: (node) => ({ id: node.id }),
    edgeParser: (edge) => ({
      id: edge.id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      directed: true,
    }),
  });
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <GraphGL
        graph={graph}
        layout={new D3ForceLayout()}
        nodeStyle={[
          {
            type: NODE_TYPE.CIRCLE,
            radius: 10,
            fill: "blue",
            opacity: 1,
          },
        ]}
        edgeStyle={{
          stroke: "black",
          strokeWidth: 2,
        }}
        enableDragging
      />
    </div>
  );
};

export default App;
