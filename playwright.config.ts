import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * E2E runs against a dev server in demo mode with fixture extraction and an isolated,
 * throwaway local database (MEDIGUIDE_DATA_DIR), so it needs no external credentials.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /scan-to-schedule/ },
  ],
  webServer: {
    command: `node node_modules/next/dist/bin/next dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      MEDIGUIDE_DATA_DIR: ".data/e2e",
      MEDIGUIDE_DEMO_MODE: "true",
      OPENAI_API_KEY: "",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      DATABASE_URL: "",
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
