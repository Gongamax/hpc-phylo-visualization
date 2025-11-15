import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import App from "./App.jsx";
import AppDeckGL from "./AppDeckGL.jsx";

import { useState } from "react";

function AppSwitcher() {
  const [version, setVersion] = useState("force-graph");
  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 10,
          right: 10,
          zIndex: 1000,
          background: "#fff",
          padding: "8px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px #0002",
        }}
      >
        <label style={{ marginRight: "8px" }}>Choose visualization:</label>
        <select value={version} onChange={(e) => setVersion(e.target.value)}>
          <option value="force-graph">React Force Graph 2D</option>
          <option value="deckgl">DeckGL + d3-force-3d</option>
        </select>
      </div>
      {version === "force-graph" ? <App /> : <AppDeckGL />}
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppSwitcher />
  </StrictMode>
);
