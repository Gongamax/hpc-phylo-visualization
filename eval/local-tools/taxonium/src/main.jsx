import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Taxonium from "taxonium-component";
import "./styles.css";

function waitForCanvas(deadlineMs = 180_000) {
  return new Promise((resolve, reject) => {
    const deadline = performance.now() + deadlineMs;

    function check() {
      const canvas = document.querySelector("canvas");
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && canvas.width > 0 && canvas.height > 0) {
          resolve();
          return;
        }
      }

      if (performance.now() > deadline) {
        reject(new Error("Timed out waiting for Taxonium canvas"));
        return;
      }

      requestAnimationFrame(check);
    }

    requestAnimationFrame(check);
  });
}

function formatMetrics(metrics) {
  if (!metrics) return "Waiting";
  return [
    `Load: ${metrics.load_ms.toFixed(2)}ms`,
    `Render: ${metrics.render_ms.toFixed(2)}ms`,
    `Total: ${metrics.total_ms.toFixed(2)}ms`,
  ].join(" | ");
}

function App() {
  const [sourceData, setSourceData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");
  const runIdRef = useRef(0);

  useEffect(() => {
    window.__runTaxoniumBenchmark = async (datasetPath) => {
      const runId = runIdRef.current + 1;
      runIdRef.current = runId;

      setError("");
      setMetrics(null);

      const totalStart = performance.now();
      const loadStart = performance.now();
      const response = await fetch(datasetPath, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load dataset: ${response.status}`);
      }
      const newick = await response.text();
      const loadMs = performance.now() - loadStart;

      const renderStart = performance.now();
      setSourceData({
        status: "loaded",
        filename: datasetPath.split("/").pop() ?? "tree.nwk",
        filetype: "nwk",
        data: newick,
      });

      await waitForCanvas();
      if (runId !== runIdRef.current) {
        throw new Error("Taxonium render was superseded by a newer run");
      }

      const nextMetrics = {
        load_ms: loadMs,
        parse_ms: "",
        render_ms: performance.now() - renderStart,
        total_ms: performance.now() - totalStart,
      };

      window.__lastTaxoniumMetrics = nextMetrics;
      setMetrics(nextMetrics);
      return nextMetrics;
    };
  }, []);

  return (
    <main>
      <output className="metrics">{error || formatMetrics(metrics)}</output>
      <section className="viewer">
        {sourceData && (
          <Taxonium sourceData={sourceData} sidePanelHiddenByDefault />
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
