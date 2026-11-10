import { describe, expect, it } from 'vitest'
import { buildFtsQuery } from './ftsQuery'

describe('buildFtsQuery', () => {
  it("so'zlarni qo'shtirnoqqa olib OR bilan bog'laydi, keraksiz so'zlarni tashlaydi", () => {
    expect(buildFtsQuery('How often should I wash my face?')).toBe('"often" OR "wash" OR "face"')
  })
  it("FTS5 sintaksisi foydalanuvchidan o'tmaydi", () => {
    const q = buildFtsQuery('") OR 1=1; DROP TABLE kb_chunks; -- NEAR* "x"')!
    expect(q).not.toMatch(/[;*()]/)
    expect(q.split(' OR ').every((t) => /^"[\p{L}\p{N}]+"$/u.test(t))).toBe(true)
  })
  it('takrorlar bir marta', () => {
    expect(buildFtsQuery('sunscreen sunscreen SPF')).toBe('"sunscreen" OR "spf"')
  })
  it("hech qanday so'z yo'q → null", () => {
    expect(buildFtsQuery('?? !!')).toBeNull()
    expect(buildFtsQuery('how to')).toBeNull()
  })
  it("o'zbek/koreys harflari ham qoladi", () => {
    expect(buildFtsQuery('quyosh 선크림')).toBe('"quyosh" OR "선크림"')
  })
})
