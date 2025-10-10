import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 60000, // 60s for container startup/teardown
    hookTimeout: 60000,
  },
});
