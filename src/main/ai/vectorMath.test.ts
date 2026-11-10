import { describe, expect, it } from 'vitest'
import { cosineSimilarity, normalize } from './vectorMath'

describe('normalize', () => {
  it('uzunlikni 1 ga keltiradi', () => {
    const v = normalize([3, 4])
    expect(v[0]).toBeCloseTo(0.6)
    expect(v[1]).toBeCloseTo(0.8)
  })
  it('nol vektor → nol (NaN emas)', () => {
    expect([...normalize([0, 0, 0])]).toEqual([0, 0, 0])
  })
})

describe('cosineSimilarity', () => {
  it("bir xil yo'nalish → 1", () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1)
  })
  it('perpendikulyar → 0, qarama-qarshi → −1', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0)
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1)
  })
  it('uzunliklar har xil → xato', () => {
    expect(() => cosineSimilarity([1], [1, 2])).toThrow()
  })
})
