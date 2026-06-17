import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "tests/security/security-policy.ts",
        "lib/security/rate-limit.ts",
        "lib/security/public-origin.ts",
        "lib/security/safe-errors.ts",
        "lib/security/request-rate-limit-key.ts",
      ],
      thresholds: {
        statements: 90,
        branches: 80,
        functions: 90,
        lines: 90,
      },
    },
  },
});
