import { describe, expect, it } from 'vitest'
import { RULE_SOURCES, checkRoutines, detectGroups, type RoutineItem } from './compatRules'

const item = (
  id: number,
  name: string,
  ingredients: string[] = [],
  category: string | null = null
): RoutineItem => ({ id, name, category, ingredients })
const rules = (f: { rule: string }[]): string =>
  f
    .map((x) => x.rule)
    .sort()
    .join(',')

const ret = item(10, 'Night serum', ['Retinol'])
const aha = item(11, 'Glow toner', ['Glycolic Acid'])
const spf = item(12, 'Daily fluid', ['Zinc Oxide'])

describe('detectGroups', () => {
  it('tarkibdan retinoid va atirni topadi', () => {
    const d = detectGroups(item(1, 'Cream', ['Aqua', 'Retinol', 'Parfum']))
    expect(d.groups.has('retinoid')).toBe(true)
    expect(d.groups.has('fragrance')).toBe(true)
    expect(d.fromName).toBe(false)
  })
  it('yog\'li spirtlar (cetearyl) quritadigan spirt emas, "Alcohol Denat." — ha', () => {
    expect(detectGroups(item(1, 'x', ['Cetearyl Alcohol'])).groups.has('drying_alcohol')).toBe(
      false
    )
    expect(detectGroups(item(1, 'x', ['Alcohol Denat.'])).groups.has('drying_alcohol')).toBe(true)
  })
  it("citric acid AHA hisoblanmaydi (ko'pincha pH sozlovchi)", () => {
    expect(detectGroups(item(1, 'x', ['Citric Acid'])).groups.has('aha')).toBe(false)
  })
  it("skan bo'lmasa — nomdan aniqlaydi va belgilaydi", () => {
    const d = detectGroups(item(1, 'Glycolic Acid 7% Toner'))
    expect(d.groups.has('aha')).toBe(true)
    expect(d.fromName).toBe(true)
  })
  it('skan qilingan tarkib nomdan ustun', () => {
    expect(detectGroups(item(1, 'Retinol serum', ['Aqua'])).groups.has('retinoid')).toBe(false)
  })
})

describe('checkRoutines', () => {
  it("ertalab retinoid + quyosh kremi yo'q → 2 ogohlantirish", () => {
    expect(rules(checkRoutines({ AM: [ret], PM: [] }, 'normal'))).toBe(
      'no_sunscreen,retinoid_morning'
    )
  })
  it('retinoid kechqurun + ertalab SPF → toza', () => {
    expect(checkRoutines({ AM: [spf], PM: [ret] }, 'normal')).toHaveLength(0)
  })
  it.each([
    ['kategoriya', item(14, 'X', ['Aqua'], 'sunscreen')],
    ['"SPF50" nomi', item(15, 'Sun cream SPF50', ['Aqua'])],
    ['"SPF 30" nomi', item(16, 'Fluid SPF 30', ['Aqua'])]
  ])('quyosh kremi %s orqali taniladi', (_n, sun) => {
    expect(checkRoutines({ AM: [sun], PM: [ret] }, 'normal')).toHaveLength(0)
  })
  it('"Crispfresh" quyosh kremi deb hisoblanmaydi', () => {
    expect(
      rules(checkRoutines({ AM: [item(17, 'Crispfresh gel', ['Aqua'])], PM: [ret] }, 'normal'))
    ).toBe('no_sunscreen')
  })
  it("bitta tartibda 2 ta kuchli faol modda → irritant_stack, turli tartibda → yo'q", () => {
    expect(rules(checkRoutines({ AM: [spf], PM: [ret, aha] }, 'normal'))).toBe('irritant_stack')
    expect(checkRoutines({ AM: [aha, spf], PM: [ret] }, 'normal')).toHaveLength(0)
  })
  it("quruq teri: atir/spirt/retinoid belgilanadi, lactic acid — yo'q (AAD foydali deydi)", () => {
    const fr = item(18, 'Scented', ['Parfum'])
    expect(rules(checkRoutines({ AM: [spf, fr], PM: [ret] }, 'dry'))).toBe('dry_skin_irritants')
    expect(
      checkRoutines({ AM: [spf, item(19, 'L', ['Lactic Acid'])], PM: [] }, 'dry')
    ).toHaveLength(0)
  })
  it('sezgir teri: AHA belgilanadi', () => {
    expect(rules(checkRoutines({ AM: [spf], PM: [aha] }, 'sensitive'))).toBe('sensitive_irritants')
  })
  it("skan qilinmagan mahsulot bir marta sanaladi (AM va PM'da bo'lsa ham)", () => {
    const m = item(20, 'Mystery')
    const f = checkRoutines({ AM: [m], PM: [m] }, null).find((x) => x.rule === 'unscanned')!
    expect(f.products).toHaveLength(1)
  })
  it("har bir qoida (unscanned'dan tashqari) manbaga ega", () => {
    for (const [rule, src] of Object.entries(RULE_SOURCES)) {
      if (rule !== 'unscanned') expect(src.length).toBeGreaterThan(0)
    }
  })
})
