import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeDatabase, initDatabase } from '../db/connection'
import { replaceProductIngredients } from '../models/analysis.model'
import { checkCompatibility } from './compat.service'
import { initKb } from './kb.service'
import { createProduct } from './product.service'
import { saveProfile } from './profile.service'
import { saveRoutine } from './routine.service'

const product = (name: string, category: string): number =>
  createProduct({ name, brand: null, category, openedAt: null, paoMonths: 12 }).id

beforeEach(() => {
  initDatabase(':memory:')
  initKb({ kbJsonPath: join(process.cwd(), 'resources/kb/kb.json'), vecPath: null })
})
afterEach(() => closeDatabase())

describe('checkCompatibility', () => {
  it("bo'sh tartib → hech narsa", () => {
    expect(checkCompatibility()).toEqual({ findings: [], checkedProducts: 0, scannedProducts: 0 })
  })

  it("haqiqiy baza: profil + tartib + skan qilingan tarkib → to'g'ri qoidalar va manbalar", () => {
    saveProfile({ ageRange: '25-34', skinType: 'dry', concerns: [] })
    const serum = product('Retinol night serum', 'serum') // Tarkibi skan qilinmagan → nomdan
    const toner = product('Mystery toner', 'toner')
    const cream = product('Scented cream', 'moisturizer')
    replaceProductIngredients(cream, [
      { name: 'Parfum', risk: 'medium', note: '' },
      { name: 'Glycerin', risk: 'low', note: '' }
    ])
    saveRoutine('AM', [cream, serum])
    saveRoutine('PM', [toner, serum])

    const r = checkCompatibility()
    expect(r.checkedProducts).toBe(3)
    expect(r.scannedProducts).toBe(1)
    expect(r.findings.map((f) => f.rule).sort()).toEqual([
      'dry_skin_irritants',
      'no_sunscreen',
      'retinoid_morning',
      'unscanned'
    ])
    const morning = r.findings.find((f) => f.rule === 'retinoid_morning')!
    expect(morning.products[0]).toMatchObject({ name: 'Retinol night serum', fromName: true })
    expect(morning.sources[0].url).toMatch(/^https:\/\/www\.aad\.org\//)
    expect(r.findings.find((f) => f.rule === 'no_sunscreen')!.sources).toHaveLength(3)
  })
})
