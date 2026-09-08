import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  // SwiftShader is a software GL rasterizer -- every test spins up a real
  // WebGL scene, so running too many in parallel starves them all of CPU and
  // trips the per-test timeout below (observed: 8 workers pushed otherwise-
  // solid tests past 30s under load). 2 keeps each test's actual runtime to
  // single-digit seconds with a wide safety margin, on both a laptop and CI.
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
        },
      },
    },
    {
      name: 'mobile',
      testMatch: ['smoke.spec.ts', 'parts.spec.ts'],
      use: {
        ...devices['Pixel 7'],
        launchOptions: {
          args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
        },
      },
    },
  ],
});
