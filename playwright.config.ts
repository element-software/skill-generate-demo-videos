import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for demo video capture.
 * The actual recording is handled programmatically in capture-demo.ts;
 * this config is provided for completeness and future test integration.
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  use: {
    headless: true,
    viewport: { width: 1920, height: 1080 },
    video: "on",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
