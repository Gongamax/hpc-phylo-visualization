import { useEffect, useRef, useState } from "react";
import GraphGL, { D3ForceLayout, JSONLoader, NODE_TYPE } from "@frutuoso/graph.gl";
import { DATASETS, loadDataset } from "./sample-datasets";

const DEFAULT_DATASET = DATASETS[0][0];

function formatMetrics(metrics) {
  if (!metrics) return "Loading...";
  return [
    `Nodes: ${metrics.nodes}`,
    `Edges: ${metrics.edges}`,
    `Load: ${metrics.load_ms.toFixed(2)}ms`,
    `Init: ${metrics.init_ms.toFixed(2)}ms`,
    `Render: ${metrics.render_ms.toFixed(2)}ms`,
    `Total: ${metrics.total_ms.toFixed(2)}ms`,
  ].join(" | ");
}

export default function App() {
  const [datasetName, setDatasetName] = useState(DEFAULT_DATASET);
  const [graph, setGraph] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const graphDataRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setGraph(null);
      setMetrics(null);

      const totalStart = performance.now();
      const loadStart = performance.now();
      const graphData = await loadDataset(datasetName);
      const loadMs = performance.now() - loadStart;

      const initStart = performance.now();
      const nextGraph = JSONLoader({ json: graphData });
      const initMs = performance.now() - initStart;

      if (cancelled) return;

      graphDataRef.current = {
        totalStart,
        load_ms: loadMs,
        init_ms: initMs,
        nodes: graphData.nodes.length,
        edges: graphData.edges.length,
        renderStart: performance.now(),
      };
      setGraph(nextGraph);
    }

    run().catch((error) => {
      console.error(error);
      if (!cancelled) setMetrics({ error: error.message });
    });

    return () => {
      cancelled = true;
    };
  }, [datasetName]);

  useEffect(() => {
    if (!graph) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const base = graphDataRef.current;
        if (!base) return;

        const now = performance.now();
        const nextMetrics = {
          nodes: base.nodes,
          edges: base.edges,
          load_ms: base.load_ms,
          init_ms: base.init_ms,
          render_ms: now - base.renderStart,
          total_ms: now - base.totalStart,
        };
        window.__lastGraphGLMetrics = nextMetrics;
        setMetrics(nextMetrics);
      });
    });
  }, [graph]);

  return (
    <main className="fixture">
      <form className="toolbar">
        <label>
          Dataset
          <select
            value={datasetName}
            onChange={(event) => setDatasetName(event.target.value)}
          >
            {DATASETS.map(([label]) => (
              <option key={label}>{label}</option>
            ))}
          </select>
        </label>
        <output>{metrics?.error ?? formatMetrics(metrics)}</output>
      </form>

      <section className="graph-frame">
        {graph && (
          <GraphGL
            key={datasetName}
            graph={graph}
            layout={new D3ForceLayout()}
            nodeStyle={[
              {
                type: NODE_TYPE.CIRCLE,
                radius: 4,
                fill: "#2563eb",
              },
            ]}
            edgeStyle={{
              stroke: "#64748b",
              strokeWidth: 0.75,
            }}
          />
        )}
      </section>
    </main>
  );
}
