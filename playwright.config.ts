import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm build && pnpm start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },
    {
      name: "unauthenticated",
      testMatch: /unauthenticated\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "student",
      testMatch: /student\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: "playwright/.clerk/student.json" },
      dependencies: ["setup"],
    },
    {
      name: "reviewer",
      testMatch: /reviewer\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: "playwright/.clerk/reviewer.json" },
      dependencies: ["setup"],
    },
    {
      name: "admin",
      testMatch: /admin\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: "playwright/.clerk/admin.json" },
      dependencies: ["setup"],
    },
  ],
});
