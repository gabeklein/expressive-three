import { defineConfig } from '@playwright/test';

const port = 5190;

export default defineConfig({
  testMatch: ['pages/**/*.spec.ts', 'coverage.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    browserName: 'chromium',
    baseURL: `http://localhost:${port}/`,
    trace: process.env.CI ? 'retain-on-failure' : 'off',
    launchOptions: {
      executablePath: process.env.CHROME || undefined,
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    }
  },
  webServer: {
    command: `bunx vite --port ${port} --strictPort`,
    port,
    reuseExistingServer: !process.env.CI
  }
});
