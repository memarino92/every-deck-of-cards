import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env['E2E_PORT'] ?? 5173)

/**
 * End-to-end tests run against the real dev server in a real browser. The
 * explorer's end-of-space behavior is emergent — it depends on the browser's
 * scroll physics (scrollTop clamping, event cadence) interacting with the
 * virtualization math — so it is verified here rather than in pure unit
 * tests, which cannot model that interaction faithfully.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm dev --port ${port} --strictPort`,
    // Start mode's history fallback only answers HTML-accepting GETs, and
    // Playwright's readiness probe sends no `Accept` header, so a page URL
    // would 404 and the suite would time out. Probe a plain 200 endpoint
    // instead; the browser tests still navigate to real routes.
    url: `http://localhost:${port}/__health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
