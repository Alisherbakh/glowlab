import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { isPackaged: false, getAppPath: () => process.cwd() }, // resources/models — loyiha papkasidan
  safeStorage: { isEncryptionAvailable: () => false }
}))

import { closeDatabase, initDatabase } from '../db/connection'
import { initKb } from './kb.service'
import { getLabInfo, readClassifierMetrics, readGradCam } from './lab.service'

afterEach(() => closeDatabase())

describe('readClassifierMetrics', () => {
  it('haqiqiy metrics.json: 97.8%, 319 rasm, sinflar tartibi saqlanadi', () => {
    const m = readClassifierMetrics(join(process.cwd(), 'resources/models'))!
    expect(m.testAccuracy).toBeCloseTo(0.978, 3)
    expect(m.testImages).toBe(319)
    expect(m.classes[5]).toBe('lip')
    expect(m.recall[5]).toBeCloseTo(141 / 146)
    expect([m.modelThreshold, m.appThreshold]).toEqual([0.3, 0.6])
  })
  it("buzilgan fayl yoki noto'g'ri matritsa → null", () => {
    const d = mkdtempSync(join(tmpdir(), 'lab-'))
    writeFileSync(join(d, 'metrics.json'), '{broken')
    expect(readClassifierMetrics(d)).toBeNull()
    writeFileSync(
      join(d, 'metrics.json'),
      JSON.stringify({
        test_accuracy: 0.9,
        per_class: {},
        threshold: 0.3,
        confusion_matrix: [[1, 0]],
        classes: ['a', 'b']
      })
    )
    expect(readClassifierMetrics(d)).toBeNull()
  })
})

describe('readGradCam', () => {
  it("papka yo'q → []; faqat xavfsiz nomli PNG'lar o'qiladi", () => {
    const d = mkdtempSync(join(tmpdir(), 'lab-'))
    expect(readGradCam(d)).toEqual([])
    mkdirSync(join(d, 'gradcam'))
    copyFileSync(join(process.cwd(), 'resources/icon.png'), join(d, 'gradcam', 'toner.png'))
    writeFileSync(join(d, 'gradcam', 'Bad Name.png'), 'x')
    writeFileSync(join(d, 'gradcam', 'notes.txt'), 'x')
    const g = readGradCam(d)
    expect(g.map((x) => x.cls)).toEqual(['toner'])
    expect(g[0].dataUrl).toMatch(/^data:image\/png;base64,/)
  })
})

describe('getLabInfo', () => {
  it('RAG va qoidalar haqidagi haqiqiy qiymatlar', () => {
    initDatabase(':memory:')
    initKb({ kbJsonPath: join(process.cwd(), 'resources/kb/kb.json'), vecPath: null })
    const info = getLabInfo()
    expect(info.rag).toMatchObject({
      chunks: 26,
      sourcePages: 18,
      topK: 4,
      maxDistance: 0.45,
      dimensions: 768
    })
    expect(info.compatRules).toBe(6)
    expect(info.classifier).not.toBeNull()
  })
})
