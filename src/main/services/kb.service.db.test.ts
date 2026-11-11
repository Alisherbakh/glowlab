import { readFileSync, writeFileSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { getLoadablePath } from 'sqlite-vec'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { isPackaged: false },
  safeStorage: { isEncryptionAvailable: () => false }
})) // Electron API'larsiz

import { closeDatabase, getDb, initDatabase } from '../db/connection'
import {
  ensureEmbeddings,
  getKbStatus,
  initKb,
  keywordSearch,
  semanticSearch,
  type Embedder
} from './kb.service'
import { askQuestion, type AskDeps } from './ask.service'

const KB_JSON = join(process.cwd(), 'resources/kb/kb.json')
const DIM = 768

// Soxta embedder: so'zlar xeshi (bag-of-words). Haqiqiy Gemini chaqirilmaydi
function makeFake(): Embedder & { calls: number } {
  const fake = {
    model: 'fake',
    dimensions: DIM,
    calls: 0,
    embed: async (texts: string[]) => {
      fake.calls++
      return {
        ok: true as const,
        vectors: texts.map((t) => {
          const v = new Array(DIM).fill(0)
          for (const w of t.toLowerCase().match(/[a-z]+/g) ?? []) {
            if (w.length < 3) continue
            let h = 0
            for (const ch of w.slice(0, 5)) h = (h * 31 + ch.charCodeAt(0)) % DIM
            v[h] += 1
          }
          return v
        })
      }
    }
  }
  return fake
}

let fake: ReturnType<typeof makeFake>
const deps = (over: Partial<AskDeps> = {}): AskDeps => ({
  embedder: fake,
  hasKey: () => true,
  maxDistance: 1, // Soxta embedder masofalari katta → chegara testlarda alohida tekshiriladi
  minMargin: 0, // Nisbiy farq filtri alohida testda
  generate: async () => ({ ok: false, code: 'unknown' }),
  ...over
})

beforeEach(() => {
  initDatabase(':memory:')
  initKb({ kbJsonPath: KB_JSON, vecPath: getLoadablePath() })
  fake = makeFake()
})
afterEach(() => closeDatabase())

describe('initKb', () => {
  it("kb.json → 26 bo'lak, vektorlar hali yo'q", () => {
    expect(getKbStatus(fake)).toEqual({ chunks: 26, vectorAvailable: true, vectorReady: false })
  })
  it("xesh o'zgarmasa qayta yozmaydi; o'zgarsa — qayta yuklaydi", () => {
    const maxId = (): number =>
      (getDb().prepare('SELECT MAX(id) m FROM kb_chunks').get() as { m: number }).m
    const before = maxId()
    initKb({ kbJsonPath: KB_JSON, vecPath: getLoadablePath() })
    expect(maxId()).toBe(before)
    const dir = mkdtempSync(join(tmpdir(), 'kb-'))
    const j = JSON.parse(readFileSync(KB_JSON, 'utf8'))
    j.chunks = j.chunks.slice(0, 5)
    writeFileSync(join(dir, 'kb.json'), JSON.stringify(j))
    initKb({ kbJsonPath: join(dir, 'kb.json'), vecPath: getLoadablePath() })
    expect(getKbStatus(fake).chunks).toBe(5)
  })
  it('http (https emas) manba rad etiladi', () => {
    const dir = mkdtempSync(join(tmpdir(), 'kb-'))
    writeFileSync(
      join(dir, 'bad.json'),
      JSON.stringify({
        version: 1,
        chunks: [{ id: 'x', title: 't', text: 'y', sourceTitle: 's', url: 'http://x.example' }]
      })
    )
    expect(() => initKb({ kbJsonPath: join(dir, 'bad.json'), vecPath: null })).toThrow()
  })
  it('kengaytma topilmasa ham yiqilmaydi', () => {
    expect(() => initKb({ kbJsonPath: KB_JSON, vecPath: '/nope/vec0' })).not.toThrow()
  })
})

describe('qidiruv', () => {
  it("FTS5: kalit so'z + so'z o'zagi (washing → wash)", () => {
    expect(keywordSearch('how often should I wash my face', 4)[0].slug).toMatch(/^face-washing/)
    expect(keywordSearch('mascara expiration', 4)[0].slug).toBe('cosmetic-shelf-life')
    expect(keywordSearch('washing', 3).length).toBeGreaterThan(0)
  })
  it("bir vaqtdagi ikki so'rov → embedding faqat bir marta", async () => {
    const [a, b] = await Promise.all([ensureEmbeddings(fake), ensureEmbeddings(fake)])
    expect(a.ok && b.ok).toBe(true)
    expect(fake.calls).toBe(1)
    expect(getKbStatus(fake).vectorReady).toBe(true)
    expect(getKbStatus({ model: 'other', dimensions: DIM }).vectorReady).toBe(false) // Model o'zgarsa — qayta hisoblash kerak
  })
  it("semantik qidiruv eng yaqinini topadi, masofa o'sish tartibida", async () => {
    const r = await semanticSearch(fake, 'retinol at night sunscreen during day', 4)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.hits[0].chunk.slug).toMatch(/^retinoid/)
    expect(r.hits.every((h, i, a) => i === 0 || a[i - 1].distance <= h.distance)).toBe(true)
  })
})

describe('askQuestion', () => {
  it("kalit yo'q → oflayn semantik natijalar, Gemini chaqirilmaydi", async () => {
    const generate = vi.fn(async () => ({ ok: false as const, code: 'unknown' as const }))
    const r = await askQuestion('how often wash face', deps({ hasKey: () => false, generate }))
    expect(r.status).toBe('offline')
    if (r.status === 'offline') {
      expect(r.reason).toBe('no_key')
      expect(r.sources.length).toBeGreaterThan(0)
    }
    expect(fake.calls).toBeGreaterThan(0) // Lokal embedding ishladi (kalitsiz ham)
    expect(generate).not.toHaveBeenCalled()
  })
  it("kalit yo'q + yaqin parcha yo'q → oflayn, bo'sh natija", async () => {
    const r = await askQuestion(
      'How should I start using retinol?',
      deps({ hasKey: () => false, maxDistance: 0.0001 })
    )
    expect(r).toEqual({ status: 'offline', reason: 'no_key', sources: [] })
  })
  it.each([['a'], [{ x: 1 }], ['x'.repeat(501)]])(
    "noto'g'ri savol %# → bad_question",
    async (q) => {
      expect(await askQuestion(q, deps())).toEqual({ status: 'error', code: 'bad_question' })
    }
  )
  it("javob: faqat iqtibos qilingan manbalar, mavjud bo'lmagan [n] olib tashlanadi", async () => {
    let prompt = ''
    const r = await askQuestion(
      'How should I start using retinol?',
      deps({
        generate: async (p) => {
          prompt = p
          return {
            ok: true,
            text: JSON.stringify({
              answerable: true,
              answer: 'Start slowly [1] at night [1] [9].',
              citations: [1, 7]
            })
          }
        }
      })
    )
    expect(r.status).toBe('answer')
    if (r.status !== 'answer') return
    expect(r.sources.map((s) => s.n)).toEqual([1])
    expect(r.answer).not.toContain('[9]')
    expect(r.mode).toBe('semantic')
    expect(prompt).toContain('ONLY')
    expect(prompt).toContain('How should I start using retinol?')
  })
  it('model "javob yo\'q" desa yoki havolasiz javob bersa → not_found', async () => {
    const nf = await askQuestion(
      'capital of France?',
      deps({
        generate: async () => ({
          ok: true,
          text: JSON.stringify({ answerable: false, answer: '', citations: [] })
        })
      })
    )
    expect(nf.status).toBe('not_found')
    const uncited = await askQuestion(
      'How should I start using retinol?',
      deps({
        generate: async () => ({
          ok: true,
          text: JSON.stringify({ answerable: true, answer: 'Just use it.', citations: [] })
        })
      })
    )
    expect(uncited.status).toBe('not_found')
  })
  it('buzilgan JSON → error', async () => {
    const r = await askQuestion(
      'How should I start using retinol?',
      deps({ generate: async () => ({ ok: true, text: 'not json' }) })
    )
    expect(r.status).toBe('error')
  })
  it('Gemini band → oflayn, semantik manbalar bilan', async () => {
    const r = await askQuestion(
      'How should I start using retinol?',
      deps({ generate: async () => ({ ok: false, code: 'busy' }) })
    )
    expect(r).toMatchObject({ status: 'offline', reason: 'busy' })
    if (r.status === 'offline') expect(r.sources).toHaveLength(4)
  })
  it("lokal model ishlamasa → kalit so'z qidiruvi bilan javob davom etadi", async () => {
    const broken: Embedder = { ...fake, embed: async () => ({ ok: false, code: 'unknown' }) }
    const generate = vi.fn(async () => ({
      ok: true as const,
      text: JSON.stringify({ answerable: true, answer: 'About 3 months [1].', citations: [1] })
    }))
    const r = await askQuestion('mascara how long', deps({ embedder: broken, generate }))
    expect(r).toMatchObject({ status: 'answer', mode: 'keyword' })
    if (r.status === 'answer') expect(r.sources).toHaveLength(1) // Faqat iqtibos qilingan [1] manba
    expect(generate).toHaveBeenCalledOnce()
  })
  it('nisbiy farq yetarli emas → Gemini chaqirilmaydi, not_found', async () => {
    const generate = vi.fn(async () => ({ ok: false as const, code: 'unknown' as const }))
    const r = await askQuestion(
      'How should I start using retinol?',
      deps({ minMargin: 10, generate }) // Hech qanday parcha bunchalik ajralib turmaydi
    )
    expect(r.status).toBe('not_found')
    expect(generate).not.toHaveBeenCalled()
  })
  it('masofa chegarasidan uzoq → Gemini chaqirilmaydi, not_found', async () => {
    const generate = vi.fn(async () => ({ ok: false as const, code: 'unknown' as const }))
    const r = await askQuestion(
      'How should I start using retinol?',
      deps({ maxDistance: 0.0001, generate })
    )
    expect(r.status).toBe('not_found')
    expect(generate).not.toHaveBeenCalled()
  })
})
