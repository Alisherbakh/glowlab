---
name: testing
description: Use when writing, running or fixing GlowLab tests with Vitest — pure shared logic, main-process services with in-memory SQLite, mocked Gemini, and the better-sqlite3 / Electron ABI issue.
---

# GlowLab Testing (Vitest)

Goal: fast, offline, repeatable tests. No real network, no real API key, no user data.
Write test code with short Uzbek comments, same style as the app.

## 1. What to test (priority)

| Layer | Examples | How |
|---|---|---|
| Pure logic (`src/shared`, `renderer/src/utils`, `onboarding/quiz.ts`) | `computeExpiresAt`, `getExpiryStatus`, `scoreQuiz`, `measureGray`, `findIssues` | Plain Vitest, no mocks |
| Main services (`src/main/services`) | product, profile, settings, analysis | In-memory SQLite + run migrations |
| AI flow (`analysis.service.ts`) | valid JSON, invalid JSON, `readable: false`, API errors | Mock `ai/gemini.ts` |
| UI | (later, only critical flows) | Skip until MVP is stable |

Always test edge cases: month end (Jan 31 + 1M), leap year, 30/31-day boundary, empty input,
invalid enum, too-long text, duplicate ingredients, AI returning garbage.

## 2. Setup (ask Alisher before installing)

Mac terminal:
```bash
yarn add -D vitest
```

`vitest.config.ts` (project root):
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node', // Main process va shared kodi Node muhitida
    include: ['src/**/*.test.ts'], // Test fayllari kod yonida: foo.ts → foo.test.ts
    restoreMocks: true // Har bir testdan keyin mock'larni tozalaydi
  }
})
```

package.json scripts:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:db": "ELECTRON_RUN_AS_NODE=1 electron node_modules/vitest/vitest.mjs run"
```

Add `src/**/*.test.ts` to the tsconfig that owns those files if typecheck complains.

## 3. ⚠️ better-sqlite3 + Electron ABI

`yarn` runs `electron-builder install-app-deps`, which builds better-sqlite3 **for Electron**.
Plain `vitest` runs in **Node** → loading the DB fails with `NODE_MODULE_VERSION ... was compiled against a different Node.js version`.

Rule:
- Pure logic tests → `yarn test` (plain Node, no SQLite import).
- Tests that touch SQLite → `yarn test:db` (runs Vitest inside Electron's own Node, same ABI).
- Never "fix" this by rebuilding better-sqlite3 for Node — the app would then break in `yarn dev`.
- Not yet verified on this project: run `yarn test:db` once when tests are first added and record the result here.

## 4. Patterns

### Pure function
```ts
import { describe, expect, it } from 'vitest'
import { computeExpiresAt } from './products'

describe('computeExpiresAt', () => {
  it('oy oxirini to\'g\'ri hisoblaydi', () => {
    expect(computeExpiresAt('2026-01-31', 1)).toBe('2026-02-28') // Fevralda 31-kun yo'q
  })
  it('kabisa yili', () => {
    expect(computeExpiresAt('2024-01-31', 1)).toBe('2024-02-29')
  })
  it('noto\'g\'ri sana → null', () => {
    expect(computeExpiresAt('2026-02-31', 6)).toBeNull()
  })
})
```

### Service with in-memory SQLite (run with `yarn test:db`)
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' }, safeStorage: {} })) // Electron API'larsiz

import { closeDatabase, initDatabase } from '../db/connection'
import { createProduct, listProducts } from './product.service'

describe('product.service', () => {
  beforeEach(() => {
    initDatabase(':memory:') // Har test uchun yangi, bo'sh baza (migratsiyalar bilan)
  })
  afterEach(() => {
    closeDatabase()
  })

  it('muddatni main hisoblaydi', () => {
    const p = createProduct({ name: 'Serum', brand: null, category: 'serum', openedAt: '2026-01-31', paoMonths: 1 })
    expect(p.expiresAt).toBe('2026-02-28')
  })

  it('noto\'g\'ri ma\'lumotni rad etadi', () => {
    expect(() => createProduct({ name: '', brand: null, category: null, openedAt: null, paoMonths: 12 })).toThrow()
    expect(listProducts()).toHaveLength(0) // Hech narsa saqlanmadi
  })
})
```

### Mocked Gemini (never call the real API in tests)
```ts
vi.mock('../ai/gemini', () => ({ generateJsonFromImage: vi.fn() }))
import { generateJsonFromImage } from '../ai/gemini'

vi.mocked(generateJsonFromImage).mockResolvedValue({ ok: true, text: '{"readable":false,"ingredients":[],"warnings":[],"summary":""}' })
// → analyzeLabel(...) must return { status: 'unreadable' } and save nothing
```
Cases to cover: valid JSON, invalid JSON, schema mismatch, `readable: false`, `{ ok: false, code: 'rate_limit' }`.

## 5. Rules
- Tests never need internet, a real API key, or the real `glowlab.db`.
- One behavior per `it(...)`; test names in Uzbek or English, short and clear.
- Fix the code, not the test, unless the test itself is wrong — say which one and why.
- After adding tests: run them, report pass/fail counts, update `ai-docs/completed_tasks.md`.
