import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Enable global test utilities like expect, describe, etc.
    globals: true,

    // Environment to run tests in - node for server, jsdom for browser
    environment: "node",

    // Test timeout in milliseconds
    testTimeout: 1000 * 30,

    // Include files matching this pattern
    include: ["src/**/*.test.ts"],

    // Files to ignore
    exclude: ["node_modules", "dist"],
  },
});
