import React, { Component } from "react";

// graph.gl
import GraphGL, {
  D3ForceLayout,
  JSONLoader,
  NODE_TYPE,
} from "@frutuoso/graph.gl";

import SAMPLE_GRAPH_DATASETS from "./sample-datasets";

const DEFAULT_NODE_SIZE = 5;

const DEFAULT_DATASET = "Random (20, 40)";

class Root extends Component {
  state = {
    selectedDataset: DEFAULT_DATASET,
    graphData: null,
    graph: null,
    isLoading: true,
    loadTime: 0,
    renderTime: 0,
    totalTime: 0,
    nodeCount: 0,
    edgeCount: 0,
  };

  componentDidMount() {
    this.loadGraph(DEFAULT_DATASET);
  }

  loadGraph = async (datasetName) => {
    // Clear previous graph immediately to prevent stale rendering
    this.setState({ isLoading: true, graph: null });
    const startTotal = performance.now();

    try {
      // Measure data loading (fetch + parse)
      const startLoad = performance.now();
      const graphData = await SAMPLE_GRAPH_DATASETS[datasetName]();
      const loadTime = performance.now() - startLoad;

      // Measure graph initialization (JSONLoader + layout creation)
      const startRender = performance.now();
      const graph = JSONLoader({ json: graphData });
      const renderTime = performance.now() - startRender;

      const totalTime = performance.now() - startTotal;

      this.setState({
        graphData,
        graph,
        isLoading: false,
        loadTime: loadTime.toFixed(2),
        renderTime: renderTime.toFixed(2),
        totalTime: totalTime.toFixed(2),
        nodeCount: graphData.nodes?.length || 0,
        edgeCount: graphData.edges?.length || 0,
      });
    } catch (error) {
      console.error("Error loading graph:", error);
      this.setState({ isLoading: false });
    }
  };

  handleChangeGraph = ({ target: { value } }) => {
    this.setState({ selectedDataset: value });
    this.loadGraph(value);
  };

  render() {
    const {
      selectedDataset,
      graph,
      isLoading,
      loadTime,
      renderTime,
      totalTime,
      nodeCount,
      edgeCount,
    } = this.state;

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div
          style={{
            width: "100%",
            zIndex: 999,
            padding: "10px",
            background: "#f0f0f0",
            borderBottom: "1px solid #ccc",
          }}
        >
          <div style={{ marginBottom: "10px" }}>
            <strong>Dataset:</strong>
            <select
              value={selectedDataset}
              onChange={this.handleChangeGraph}
              style={{ marginLeft: "10px", padding: "5px" }}
            >
              {Object.keys(SAMPLE_GRAPH_DATASETS).map((data) => (
                <option key={data} value={data}>
                  {data}
                </option>
              ))}
            </select>
          </div>

          {!isLoading && graph && (
            <div style={{ fontSize: "12px", color: "#555" }}>
              <strong>Performance Metrics:</strong>
              {" | "}
              Nodes: <strong>{nodeCount}</strong>
              {" | "}
              Edges: <strong>{edgeCount}</strong>
              {" | "}
              Load: <strong>{loadTime}ms</strong>
              {" | "}
              Init: <strong>{renderTime}ms</strong>
              {" | "}
              Total: <strong>{totalTime}ms</strong>{" "}
              <span style={{ fontSize: "10px", color: "#888" }}>
                (Note: WebGL rendering happens after these times)
              </span>
            </div>
          )}

          {isLoading && <div>Loading...</div>}
        </div>
        <div style={{ width: "100%", flex: 1 }}>
          {graph && !isLoading && (
            <GraphGL
              key={selectedDataset}
              graph={graph}
              layout={new D3ForceLayout()}
              nodeStyle={[
                {
                  type: NODE_TYPE.CIRCLE,
                  radius: DEFAULT_NODE_SIZE,
                  fill: "red",
                },
              ]}
              edgeStyle={{
                stroke: "#000",
                strokeWidth: 1,
              }}
            />
          )}
        </div>
      </div>
    );
  }
}

export default Root;
