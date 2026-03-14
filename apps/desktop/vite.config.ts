import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: path.join(__dirname, "src/renderer"),
  base: "./",
  build: {
    outDir: path.join(__dirname, "dist/renderer"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@iamrobot/ui": path.join(__dirname, "../../packages/ui/src/index.ts"),
      "@iamrobot/protocol": path.join(__dirname, "../../packages/protocol/src/index.ts"),
      "@iamrobot/orchestration": path.join(__dirname, "../../packages/orchestration/src/index.ts"),
      "@iamrobot/agent-claude": path.join(__dirname, "../../packages/agent-claude/src/index.ts"),
      "@iamrobot/agent-codex": path.join(__dirname, "../../packages/agent-codex/src/index.ts"),
      "@iamrobot/verification": path.join(__dirname, "../../packages/verification/src/index.ts"),
    },
  },
});
