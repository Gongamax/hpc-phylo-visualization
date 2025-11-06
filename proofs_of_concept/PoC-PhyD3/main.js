// Using CDN ESM builds so the browser can load modules directly without bundling.
// If you prefer a bundler-based workflow, use `npm install` and a bundler (esbuild, vite, etc.)
import {
  makeCompatTable,
  phyloxml,
} from "https://unpkg.com/@vibbioinfocore/phyd3-parser-compat?module";
import { build } from "https://unpkg.com/@vibbioinfocore/phyd3?module";

// A richer example tree (balanced with multiple internal nodes and leaves)
const xml = `
<phyloxml>
  <phylogeny rooted='true'>
    <clade>
      <name>root</name>
      <clade>
        <name>Clade-1</name>
        <clade>
          <name>A</name>
          <branch_length>0.05</branch_length>
        </clade>
        <clade>
          <name>B</name>
          <branch_length>0.07</branch_length>
        </clade>
      </clade>
      <clade>
        <name>Clade-2</name>
        <clade>
          <name>C</name>
          <branch_length>0.12</branch_length>
        </clade>
        <clade>
          <name>D</name>
          <branch_length>0.2</branch_length>
        </clade>
      </clade>
      <clade>
        <name>E</name>
        <branch_length>0.3</branch_length>
      </clade>
    </clade>
  </phylogeny>
</phyloxml>`;
const parser = new DOMParser();
const doc = parser.parseFromString(xml, "text/xml");

// convert parsed data to the compatibility table the library expects
const compat = makeCompatTable(phyloxml.parse(doc));

// build returns a d3 selection containing an <svg>
const svg = build(compat);

// append to the page
const container = document.getElementById("viz");
if (!container) {
  console.error("No #viz element found");
} else {
  // `svg` may be a d3 selection (with .node()) or an actual DOM node
  const node = svg && (typeof svg.node === "function" ? svg.node() : svg);
  if (node) container.appendChild(node);
  else console.error("Failed to append svg: invalid return from build()");
}

// Visual tweaks: if the library produced native DOM nodes, adjust circles and text
try {
  const rootNode = container.querySelector("svg");
  if (rootNode) {
    // make sure node circles are visible
    rootNode.querySelectorAll("circle").forEach((c) => {
      c.setAttribute("r", 5);
      c.setAttribute("fill", "steelblue");
      c.setAttribute("stroke", "#333");
    });
    // improve label size
    rootNode.querySelectorAll("text").forEach((t) => {
      t.style.fontSize = "12px";
      t.style.fill = "#111";
    });
  }
} catch (e) {
  // non-fatal if DOM shape is different; leave as-is
  console.warn("Post-build visual tweak failed:", e && e.message);
}
