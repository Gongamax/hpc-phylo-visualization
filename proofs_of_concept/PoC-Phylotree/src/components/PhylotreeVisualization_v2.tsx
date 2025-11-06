import React, { useEffect, useRef, useState } from "react";
// @ts-expect-error - phylotree.js doesn't have proper TypeScript definitions
import { phylotree } from "phylotree";

interface PhylotreeVisualizationProps {
  newick: string;
  width?: number;
  height?: number;
  options?: Record<string, unknown>;
}

const PhylotreeVisualization: React.FC<PhylotreeVisualizationProps> = ({
  newick,
  width = 800,
  height = 600,
  options = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<{
    nodeCount: number;
    leafCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !newick) return;

    const renderTree = () => {
      try {
        console.log(
          "🌳 Rendering phylotree with Newick:",
          newick.substring(0, 50) + "..."
        );

        // Clear container
        const container = containerRef.current!;
        container.innerHTML = "";

        // Show loading
        container.innerHTML =
          '<div style="padding: 20px; text-align: center;">Loading tree...</div>';

        // Create phylotree instance
        console.log("📐 Creating phylotree instance...");
        const tree = new phylotree(newick);

        // Clear loading message
        container.innerHTML = "";

        // Create a simple container div
        const treeContainer = document.createElement("div");
        treeContainer.style.width = "100%";
        treeContainer.style.height = height + "px";
        treeContainer.style.border = "1px solid #ddd";
        treeContainer.style.borderRadius = "4px";
        container.appendChild(treeContainer);

        console.log("🎨 Calling tree.render()...");

        // Try the simplest possible render call
        tree.render({
          container: treeContainer,
          width: width,
          height: height,
          "show-scale": true,
          "align-tips": true,
        });

        console.log("✅ Tree rendered successfully!");

        // Get statistics
        const nodeCount = tree.nodes ? tree.nodes.length : 0;
        const leafCount = tree.nodes
          ? tree.nodes.filter(
              (n: { children?: unknown[] }) =>
                !n.children || n.children.length === 0
            ).length
          : 0;

        setStats({ nodeCount, leafCount });
        setError(null);

        console.log("📊 Tree stats:", { nodeCount, leafCount });
      } catch (err) {
        console.error("❌ Error rendering tree:", err);
        setError(err instanceof Error ? err.message : String(err));
        setStats(null);

        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #e74c3c; border: 1px solid #e74c3c; border-radius: 4px;">
              <h3>⚠️ Error rendering tree</h3>
              <p>${err instanceof Error ? err.message : String(err)}</p>
            </div>
          `;
        }
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(renderTree, 100);
  }, [newick, width, height, options]);

  return (
    <div className="phylotree-container">
      {stats && (
        <div className="phylotree-stats">
          <div className="stats-display">
            <span>Nodes: {stats.nodeCount}</span>
            <span>Leaves: {stats.leafCount}</span>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="phylotree-visualization"
        style={{
          width: "100%",
          minHeight: height + "px",
          background: "#fafafa",
          borderRadius: "8px",
          border: "2px solid #e0e0e0",
        }}
      />
      {error && (
        <div style={{ color: "#e74c3c", marginTop: "10px", fontSize: "14px" }}>
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default PhylotreeVisualization;
