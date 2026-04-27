import { defineConfig, devices } from '@playwright/test'

// Playwright config for orbit-stability tests.
//
// We boot the existing Vite dev server (port 5173 by default) via
// `webServer` so a single `npx playwright test` is enough — no manual
// dev-server juggling. Tests live under `tests/e2e/`.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 180_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    // Use the full Chromium binary (not the chrome-headless-shell), and
    // disable Crashpad — on this Windows machine the Crashpad pipe
    // handshake fails ("TransactNamedPipe: Die Pipe wurde beendet"),
    // hanging chrome after launch and timing out the test runner.
    launchOptions: {
      channel: 'chromium',
      args: ['--disable-crash-reporter', '--no-crashpad', '--disable-gpu', '--disable-features=VizDisplayCompositor']
    }
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe'
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } }
    },
    {
      // Tablet shape (768×1024 portrait) on Chromium — we're testing
      // physics, not browser-engine quirks, so all three projects share
      // chromium to keep the install footprint small.
      name: 'tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true
      }
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'], viewport: { width: 393, height: 727 } }
    }
  ]
})
