import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import App from "./App.jsx";

// Minimal graph data for Graph.GL demo
const demoData = {
  name: "Simple Graph",
  nodes: [{ id: "1" }, { id: "2" }, { id: "3" }],
  edges: [
    { id: "e1", sourceId: "1", targetId: "2" },
    { id: "e2", sourceId: "2", targetId: "3" },
  ],
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App data={demoData} />
  </StrictMode>
);
