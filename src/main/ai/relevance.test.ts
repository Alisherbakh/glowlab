import { describe, expect, it } from 'vitest'
import { selectRelevant } from './relevance'

const hits = (ds: number[]): { chunk: string; distance: number }[] =>
  ds.map((d, i) => ({ chunk: `c${i}`, distance: d }))
const opts = { topK: 4, maxDistance: 0.35, minMargin: 0.023 }

describe('selectRelevant', () => {
  it('aniq mos savol: eng yaqin parcha ajralib turadi → topK parcha', () => {
    const r = selectRelevant(hits([0.12, 0.16, 0.18, 0.2, 0.24, 0.25, 0.26]), opts)
    expect(r.chunks).toEqual(['c0', 'c1', 'c2', 'c3'])
    expect(r.margin).toBeCloseTo(0.08) // mediana 0.20 − 0.12
  })
  it("ma'nosiz savol: hamma parcha deyarli bir xil uzoqlikda → bo'sh", () => {
    const r = selectRelevant(hits([0.25, 0.253, 0.256, 0.26, 0.262, 0.265, 0.27]), opts)
    expect(r.chunks).toEqual([])
    expect(r.margin).toBeLessThan(opts.minMargin)
  })
  it('maxDistance dan uzoq parchalar tashlanadi', () => {
    const r = selectRelevant(hits([0.3, 0.34, 0.36, 0.37, 0.4, 0.41, 0.42]), opts)
    expect(r.chunks).toEqual(['c0', 'c1'])
  })
  it("bo'sh ro'yxat", () => {
    expect(selectRelevant([], opts)).toEqual({ chunks: [], margin: 0 })
  })
})
