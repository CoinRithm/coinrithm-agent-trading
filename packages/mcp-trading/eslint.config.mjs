// Minimal flat ESLint config for @coinrithm/mcp-trading. The package predated
// linting; this establishes a passing baseline that catches real errors without
// enforcing a large stylistic ruleset (formatting is owned by Prettier).
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Pragmatic baseline — keep signal, not noise.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
