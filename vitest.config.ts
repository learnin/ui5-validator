import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "ui5",
    environmentOptions: {
      ui5: {
        path: "test/unit/ui5-unit-test.html",
        timeout: 1000,
      },
    },
  },
});