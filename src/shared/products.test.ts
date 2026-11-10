import { describe, expect, it } from 'vitest'
import { computeExpiresAt, getExpiryStatus, isValidDate } from './products'

describe('computeExpiresAt', () => {
  it('oddiy holat: 6 oy', () => {
    expect(computeExpiresAt('2026-03-15', 6)).toBe('2026-09-15')
  })
  it('oy oxiri: 31-yanvar + 1 oy → 28-fevral', () => {
    expect(computeExpiresAt('2026-01-31', 1)).toBe('2026-02-28')
  })
  it('kabisa yili: 29-fevral', () => {
    expect(computeExpiresAt('2024-01-31', 1)).toBe('2024-02-29')
  })
  it('yil almashishi', () => {
    expect(computeExpiresAt('2026-11-10', 12)).toBe('2027-11-10')
  })
  it("sana yo'q yoki noto'g'ri → null", () => {
    expect(computeExpiresAt(null, 6)).toBeNull()
    expect(computeExpiresAt('2026-02-31', 6)).toBeNull()
  })
})

describe('isValidDate', () => {
  it.each([
    ['2026-02-28', true],
    ['2026-02-29', false],
    ['2024-02-29', true],
    ['2026-13-01', false],
    ['10.11.2026', false]
  ])('%s → %s', (v, ok) => {
    expect(isValidDate(v)).toBe(ok)
  })
})

describe('getExpiryStatus', () => {
  const today = '2026-11-10'
  it("muddat yo'q → unknown", () => {
    expect(getExpiryStatus(null, today)).toEqual({ status: 'unknown', daysLeft: null })
  })
  it("o'tgan → expired", () => {
    expect(getExpiryStatus('2026-11-09', today)).toEqual({ status: 'expired', daysLeft: -1 })
  })
  it('bugun va 30 kun ichida → soon, 31 kun → ok', () => {
    expect(getExpiryStatus('2026-11-10', today).status).toBe('soon')
    expect(getExpiryStatus('2026-12-10', today)).toEqual({ status: 'soon', daysLeft: 30 })
    expect(getExpiryStatus('2026-12-11', today)).toEqual({ status: 'ok', daysLeft: 31 })
  })
})
