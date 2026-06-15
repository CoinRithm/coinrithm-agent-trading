import { defineConfig } from "vitest/config";

// Unit tests for the agent runner (src/agent/**). Pure modules — no network,
// no model, no live trades. The MCP server itself has no unit tests here.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  // The source uses NodeNext ".js" import specifiers that point at ".ts" files.
  // Strip the extension so Vite resolves the TypeScript source under test.
  resolve: {
    alias: [{ find: /^(\.{1,2}\/.*)\.js$/, replacement: "$1" }],
  },
});
