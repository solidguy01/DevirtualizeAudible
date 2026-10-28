// End-to-end tests of the built extension (run ./build.sh first) on fixture pages served at audible.com URLs
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  projects: [{ name: 'chromium' }, { name: 'firefox' }],
});
