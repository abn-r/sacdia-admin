import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: false,
    // permission-utils.test.ts uses Node's built-in `node:test` runner (not
    // Vitest) and must be excluded so Vitest does not try to execute it.
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "src/lib/auth/permission-utils.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
