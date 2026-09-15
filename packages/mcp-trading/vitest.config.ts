import { defineConfig } from "vitest/config";

// MCP and runner tests use isolated fixtures, never live accounts or models.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.d.ts"],
      reporter: ["text", "json", "json-summary", "html"],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 90,
        "src/agent/client.ts": {
          lines: 90,
          statements: 90,
          functions: 90,
          branches: 90,
        },
        "src/agent/runner.ts": {
          lines: 90,
          statements: 90,
          functions: 90,
          branches: 90,
        },
        "src/http.ts": {
          lines: 90,
          statements: 90,
          functions: 90,
          branches: 90,
        },
      },
    },
  },
  // The source uses NodeNext ".js" import specifiers that point at ".ts" files.
  // Strip the extension so Vite resolves the TypeScript source under test.
  resolve: {
    alias: [{ find: /^(\.{1,2}\/.*)\.js$/, replacement: "$1" }],
  },
});
