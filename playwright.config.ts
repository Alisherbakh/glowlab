import { defineConfig } from '@playwright/test'

// E2E: haqiqiy GlowLab (Electron) ilovasini ochib tekshiradi. Avval `electron-vite build` (yarn test:e2e)
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  workers: 1, // Bitta ilova — testlar ketma-ket
  reporter: [['list']],
  outputDir: './e2e-results', // Xato bo'lganda skrinshot va trace shu yerda (gitignore)
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  }
})
