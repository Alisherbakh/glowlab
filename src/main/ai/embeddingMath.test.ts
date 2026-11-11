import { describe, expect, it } from 'vitest'
import { documentVariants, e5Input, meanPool, truncateIds } from './embeddingMath'

describe('e5Input', () => {
  it('savol va parcha uchun to‘g‘ri prefiks', () => {
    expect(e5Input('how to wash face', 'RETRIEVAL_QUERY')).toBe('query: how to wash face')
    expect(e5Input('Wash twice a day.', 'RETRIEVAL_DOCUMENT')).toBe('passage: Wash twice a day.')
  })
})

describe('truncateIds', () => {
  it('qisqa ro‘yxat o‘zgarmaydi', () => {
    const ids = [0, 5, 6, 2]
    expect(truncateIds(ids, 512)).toBe(ids)
  })
  it('uzun ro‘yxat kesiladi, oxirgi maxsus token saqlanadi', () => {
    const ids = [0, 11, 12, 13, 14, 15, 2]
    expect(truncateIds(ids, 4)).toEqual([0, 11, 12, 2])
  })
})

describe('meanPool', () => {
  it('tokenlar bo‘yicha o‘rtacha', () => {
    // 2 token × 3 o‘lcham
    expect(meanPool(Float32Array.from([1, 2, 3, 3, 4, 5]), 2, 3)).toEqual([2, 3, 4])
  })
  it('noto‘g‘ri o‘lcham → xato', () => {
    expect(() => meanPool([1, 2, 3], 2, 3)).toThrow()
    expect(() => meanPool([], 0, 3)).toThrow()
  })
})

describe('documentVariants', () => {
  it('har bir sarlavha uchun alohida matn, asosiy sarlavha birinchi', () => {
    expect(documentVariants('Wash', ['Yuvish', '세안'], 'Twice a day.')).toEqual([
      'Wash\nTwice a day.',
      'Yuvish\nTwice a day.',
      '세안\nTwice a day.'
    ])
  })
  it("tarjima yo'q → faqat asosiy", () => {
    expect(documentVariants('Wash', [], 'Twice a day.')).toEqual(['Wash\nTwice a day.'])
  })
})
