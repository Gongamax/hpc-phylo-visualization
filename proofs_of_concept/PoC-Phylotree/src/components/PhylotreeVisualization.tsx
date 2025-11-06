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

        // Create a simple container div with explicit styling for SVG display
        const treeContainer = document.createElement("div");
        treeContainer.style.width = "100%";
        treeContainer.style.height = height + "px";
        treeContainer.style.border = "1px solid #ddd";
        treeContainer.style.borderRadius = "4px";
        treeContainer.style.overflow = "auto";
        treeContainer.style.position = "relative";
        treeContainer.style.backgroundColor = "#ffffff";
        treeContainer.className = "phylotree-svg-container";
        container.appendChild(treeContainer);

        console.log("🎨 Calling tree.render()...");

        // First, add a test element to verify container is working
        const testDiv = document.createElement("div");
        testDiv.style.background = "red";
        testDiv.style.height = "50px";
        testDiv.style.margin = "10px";
        testDiv.textContent = "TEST CONTAINER VISIBILITY";
        treeContainer.appendChild(testDiv);

        // Try the simplest possible render call
        console.log("🎨 Render options:", {
          container: treeContainer,
          width: width,
          height: height,
          "show-scale": true,
          "align-tips": true,
        });

        try {
          tree.render({
            container: treeContainer,
            width: width,
            height: height,
            "show-scale": true,
            "align-tips": true,
          });

          // Remove test element after render
          setTimeout(() => {
            if (testDiv.parentNode) {
              testDiv.remove();
            }
          }, 2000);
        } catch (renderError) {
          console.error("❌ Render failed:", renderError);
          testDiv.textContent =
            "RENDER FAILED: " +
            (renderError instanceof Error
              ? renderError.message
              : String(renderError));
          testDiv.style.background = "orange";

          // Try alternative rendering approaches
          console.log("🔧 Trying alternative rendering methods...");

          try {
            // Method 1: Create SVG manually
            const svg = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "svg"
            );
            svg.setAttribute("width", width.toString());
            svg.setAttribute("height", height.toString());
            svg.style.border = "2px solid blue";
            treeContainer.appendChild(svg);

            console.log("🔧 Created manual SVG, trying tree.svg()...");
            if (typeof tree.svg === "function") {
              tree.svg(svg);
              console.log("✅ tree.svg() completed");
            }

            if (typeof tree.layout === "function") {
              tree.layout();
              console.log("✅ tree.layout() completed");
            }

            if (typeof tree.update === "function") {
              tree.update();
              console.log("✅ tree.update() completed");
            }
          } catch (altError) {
            console.error("❌ Alternative methods also failed:", altError);
            testDiv.textContent +=
              " | ALT FAILED: " +
              (altError instanceof Error ? altError.message : String(altError));
          }
        }

        console.log("✅ Tree rendered successfully!");

        // Debug: Check what was actually rendered in the DOM
        console.log("🔍 Container after render:", treeContainer);
        console.log(
          "🔍 Container innerHTML length:",
          treeContainer.innerHTML.length
        );
        console.log("🔍 Container children:", treeContainer.children.length);

        // Check for SVG elements
        const svgElements = treeContainer.querySelectorAll("svg");
        console.log("🔍 SVG elements found:", svgElements.length);

        if (svgElements.length > 0) {
          const svg = svgElements[0];
          console.log("🔍 SVG dimensions:", {
            width: svg.getAttribute("width"),
            height: svg.getAttribute("height"),
            viewBox: svg.getAttribute("viewBox"),
          });
          console.log("🔍 SVG children:", svg.children.length);

          // Check for tree elements (paths, circles, text)
          const paths = svg.querySelectorAll("path");
          const circles = svg.querySelectorAll("circle");
          const texts = svg.querySelectorAll("text");
          console.log("🔍 SVG content:", {
            paths: paths.length,
            circles: circles.length,
            texts: texts.length,
          });

          // Make sure SVG is visible
          svg.style.display = "block";
          svg.style.overflow = "visible";
        } else {
          console.log(
            "⚠️ No SVG elements found - phylotree may not have rendered properly"
          );
          console.log(
            "🔍 Container HTML:",
            treeContainer.innerHTML.substring(0, 200) + "..."
          );
        }

        // Debug: Check what tree.nodes actually is
        console.log("🔍 tree.nodes type:", typeof tree.nodes);
        console.log("🔍 tree.nodes is array:", Array.isArray(tree.nodes));
        console.log("🔍 tree.nodes:", tree.nodes);

        // Get statistics with proper tree traversal
        let nodeCount = 0;
        let leafCount = 0;

        try {
          // Define a type for tree nodes
          type TreeNode = {
            children?: TreeNode[];
            [key: string]: unknown;
          };

          // Helper function to traverse the tree and count nodes
          const traverseTree = (node: TreeNode): void => {
            if (!node) return;

            nodeCount++;

            // Check if it's a leaf node (no children or empty children array)
            if (!node.children || node.children.length === 0) {
              leafCount++;
            }

            // Recursively traverse children
            if (node.children && Array.isArray(node.children)) {
              node.children.forEach((child: TreeNode) => traverseTree(child));
            }
          };

          if (tree.nodes) {
            console.log("🔍 Starting tree traversal from root node...");
            traverseTree(tree.nodes);
            console.log("✅ Tree traversal completed");
          }

          // Try alternative methods if traversal didn't work
          if (nodeCount === 0) {
            console.log("🔍 Trying alternative methods...");

            if (typeof tree.get_nodes === "function") {
              const nodes = tree.get_nodes();
              if (Array.isArray(nodes)) {
                nodeCount = nodes.length;
                leafCount = nodes.filter((n: TreeNode) => {
                  return !n.children || n.children.length === 0;
                }).length;
                console.log("✅ Used get_nodes() method");
              }
            }
          }

          // Try count methods as final fallback
          if (leafCount === 0 && typeof tree.count_all_leaves === "function") {
            leafCount = tree.count_all_leaves();
            console.log("✅ Used count_all_leaves() method");
          }
        } catch (statsError) {
          console.warn("⚠️ Error calculating statistics:", statsError);
        }

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
