import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: false,
    exclude: ["**/node_modules/**", "**/dist/**", "**/.worktrees/**"],
    // Renders pesados (p. ej. monthly-report) exceden los 5s por defecto
    // cuando la suite completa corre en paralelo.
    testTimeout: 15_000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
