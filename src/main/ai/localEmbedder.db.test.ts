import { existsSync } from 'fs'
import { join } from 'path'
import { getLoadablePath } from 'sqlite-vec'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// Haqiqiy model: resources/models/embedding/ (yarn fetch:models). Model yo'q bo'lsa test o'tkazib yuboriladi
vi.mock('electron', () => ({
  app: { isPackaged: false, getAppPath: () => process.cwd() },
  safeStorage: { isEncryptionAvailable: () => false }
}))

import { closeDatabase, initDatabase } from '../db/connection'
import { initKb, semanticSearch } from '../services/kb.service'
import { MAX_DISTANCE, MIN_MARGIN, askQuestion, localEmbedder } from '../services/ask.service'
import { embedTextsLocal, LOCAL_EMBEDDING_DIMENSIONS } from './localEmbedder'

const hasModel = existsSync(join(process.cwd(), 'resources/models/embedding/model_quantized.onnx'))

describe.skipIf(!hasModel)('lokal embedding (haqiqiy multilingual-e5-base)', () => {
  beforeAll(() => {
    initDatabase(':memory:')
    initKb({ kbJsonPath: join(process.cwd(), 'resources/kb/kb.json'), vecPath: getLoadablePath() })
  })
  afterAll(() => closeDatabase())

  it("768 o'lchamli vektor qaytaradi", async () => {
    const r = await embedTextsLocal(['sunscreen'], 'RETRIEVAL_QUERY')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.vectors[0]).toHaveLength(LOCAL_EMBEDDING_DIMENSIONS)
  })

  it.each([
    ['How often should I reapply sunscreen at the beach?', 'sunscreen-reapply'],
    ['Yuzimni kuniga necha marta yuvishim kerak?', 'face-washing-frequency'],
    ['주사(로사세아) 피부에는 어떤 제품을 써야 하나요?', 'rosacea-skin-care']
  ])('%s → %s (en / uz / ko)', async (question, slug) => {
    const r = await semanticSearch(localEmbedder, question, 4)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.hits[0].chunk.slug).toBe(slug)
  })

  it("kalitsiz: mos so'z → parchalar, ma'nosiz so'z → bo'sh (nisbiy farq filtri)", async () => {
    const noKey = { ...defaults, hasKey: () => false }
    const ok = await askQuestion('sunscreen', noKey)
    expect(ok.status === 'offline' && ok.sources.length > 0).toBe(true)
    for (const q of ['zzzz qqqq', 'asdfgh', 'What is the capital of France?']) {
      expect(await askQuestion(q, noKey)).toEqual({
        status: 'offline',
        reason: 'no_key',
        sources: []
      })
    }
  })
})

const defaults = {
  embedder: localEmbedder,
  generate: async () => ({ ok: false as const, code: 'unknown' as const }),
  hasKey: () => true,
  maxDistance: MAX_DISTANCE,
  minMargin: MIN_MARGIN
}
