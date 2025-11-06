import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Polyfill Node.js globals for old CommonJS libraries
export default defineConfig({
  plugins: [react()],
  define: {
    global: "window",
    module: "{}",
    "process.env": "{}",
  },
  optimizeDeps: {
    include: ["graph.gl"],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
