import { defineConfig } from 'vitest/config'

// Ikki loyiha: "unit" — toza mantiq (oddiy Node), "db" — SQLite servislari.
// db testlari Mac'da Electron ichida ishga tushadi (better-sqlite3 Electron ABI uchun yig'ilgan): yarn test:db
export default defineConfig({
  test: {
    restoreMocks: true, // Har bir testdan keyin mock'lar tozalanadi
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.db.test.ts']
        }
      },
      {
        test: {
          name: 'db',
          environment: 'node',
          include: ['src/**/*.db.test.ts'],
          pool: 'forks', // Har bir fayl alohida jarayonda (umumiy db ulanishi aralashmasin)
          testTimeout: 15_000
        }
      }
    ]
  }
})
