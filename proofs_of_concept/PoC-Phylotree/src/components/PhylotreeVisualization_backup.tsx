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

  useEffect(() => {
    if (!containerRef.current || !newick) return;

    try {
      console.log(
        "🌳 Creating phylotree with Newick:",
        newick.substring(0, 50) + "..."
      );

      // Clear previous content
      containerRef.current.innerHTML = "";

      // Add loading message
      containerRef.current.innerHTML =
        '<div style="padding: 20px; text-align: center; color: #666;">Loading phylogenetic tree...</div>';

      console.log("📐 Creating phylotree instance using correct API...");
      // Create phylotree instance using constructor
      console.log("Available phylotree:", typeof phylotree, phylotree);
      const tree = new phylotree(newick);

      // Debug: Check if tree was created properly
      console.log("🔍 Tree after creation:", tree);
      console.log("🔍 Tree newick_string:", tree.newick_string);
      console.log(
        "🔍 Tree nodes length:",
        tree.nodes ? tree.nodes.length : "no nodes property"
      );
      console.log(
        "🔍 Tree links length:",
        tree.links ? tree.links.length : "no links property"
      );

      // Clear the loading message
      containerRef.current.innerHTML = "";

      // Configure render options according to API - use DOM element, not D3 selection
      const renderOptions = {
        container: containerRef.current, // Raw DOM element
        width: width,
        height: height,
        "left-right-spacing": "fit-to-size",
        "top-bottom-spacing": "fit-to-size",
        "show-scale": false,
        "align-tips": true,
        "font-size": 12,
        selectable: false,
        collapsible: false,
        ...options,
      };

      console.log("🎨 Rendering tree with options:", renderOptions);
      console.log("🎨 Container DOM element:", containerRef.current);

      // Try different rendering approaches based on phylotree.js patterns
      console.log("🎨 Attempting to render tree...");

      try {
        // Method 1: Try render with options
        console.log("🎨 Method 1: render(options)");
        tree.render(renderOptions);
        console.log("✅ render(options) completed");
      } catch (renderError) {
        console.warn("⚠️ Method 1 failed:", renderError);

        try {
          // Method 2: Try setting up the tree step by step
          console.log("🎨 Method 2: step-by-step setup");

          // Create SVG element manually if needed
          const svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
          );
          svg.setAttribute("width", width.toString());
          svg.setAttribute("height", height.toString());
          containerRef.current.appendChild(svg);

          // Try different render approaches
          if (typeof tree.svg === "function") {
            console.log("🔧 Using svg() method");
            tree.svg(svg);
          }

          if (typeof tree.layout === "function") {
            console.log("🔧 Using layout() method");
            tree.layout(renderOptions);
          }

          // Force update/refresh
          if (typeof tree.update === "function") {
            console.log("🔧 Using update() method");
            tree.update();
          }

          console.log("✅ Method 2 completed");
        } catch (method2Error) {
          console.error("❌ Method 2 also failed:", method2Error);
        }
      }

      console.log("📊 Getting tree statistics...");

      // Get basic statistics using available methods
      try {
        console.log(
          "🔍 Available tree methods:",
          Object.getOwnPropertyNames(tree)
        );
        console.log(
          "🔍 Tree prototype methods:",
          Object.getOwnPropertyNames(Object.getPrototypeOf(tree))
        );

        // Try different method names to get statistics
        let nodeCount = 0;
        let leafCount = 0;

        // Use direct property access as seen in the logs
        if (tree.nodes && Array.isArray(tree.nodes)) {
          nodeCount = tree.nodes.length;
          console.log("📊 Found nodes property, nodes:", nodeCount);

          // Count leaf nodes (nodes without children)
          leafCount = tree.nodes.filter(
            (node: { children?: unknown[] }) =>
              !node.children || node.children.length === 0
          ).length;
          console.log("📊 Calculated leaf count:", leafCount);
        }

        // Try method calls as fallback
        if (nodeCount === 0 && typeof tree.get_nodes === "function") {
          const nodes = tree.get_nodes();
          nodeCount = nodes ? nodes.length : 0;
          console.log("📊 Fallback get_nodes method, nodes:", nodeCount);
        }

        if (leafCount === 0 && typeof tree.count_all_leaves === "function") {
          leafCount = tree.count_all_leaves();
          console.log(
            "📊 Fallback count_all_leaves method, leaves:",
            leafCount
          );
        }

        setStats({
          nodeCount: nodeCount,
          leafCount: leafCount,
        });

        console.log("📊 Tree stats:", {
          nodes: nodeCount,
          leaves: leafCount,
        });
      } catch (statsError) {
        console.warn("⚠️ Could not calculate tree statistics:", statsError);
        setStats({ nodeCount: 0, leafCount: 0 });
      }

      console.log("✅ Phylotree rendered successfully");
    } catch (error) {
      console.error("❌ Error creating phylotree:", error);
      setStats(null);

      // Show error in the container
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div style="padding: 20px; text-align: center; color: #e74c3c;">
            <h3>⚠️ Error rendering tree</h3>
            <p>${error instanceof Error ? error.message : String(error)}</p>
            <p><small>Check console for more details</small></p>
          </div>
        `;
      }
    }
  }, [newick, width, height, options]);

  return (
    <div className="phylotree-container">
      <div className="phylotree-stats">
        {stats && (
          <div className="stats-display">
            <span>Nodes: {stats.nodeCount}</span>
            <span>Leaves: {stats.leafCount}</span>
          </div>
        )}
      </div>
      <div className="phylotree-wrapper">
        <div
          ref={containerRef}
          className="phylotree-svg"
          style={{
            width: "100%",
            height: `${height}px`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        />
      </div>
    </div>
  );
};

export default PhylotreeVisualization;
