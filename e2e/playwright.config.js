require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // Si process.env.BASE_URL no existe, usará http://localhost:3000 por defecto
    baseURL: 'https://reservation-xo6fchjsw-mark-fada.vercel.app',
    TEST_EMAIL=markvitalis@hotmail.com,
    TEST_PASSWORD=123456,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});