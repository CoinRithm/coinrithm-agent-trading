import { defineConfig } from "vitest/config";

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
        "src/maintenance.ts": {
          lines: 90,
          statements: 90,
          functions: 90,
          branches: 90,
        },
        "src/rotateCredentials.ts": {
          lines: 90,
          statements: 90,
          functions: 90,
          branches: 90,
        },
        "src/capacity.ts": {
          lines: 90,
          statements: 90,
          functions: 90,
          branches: 90,
        },
      },
    },
  },
});
