import { ApiError } from '@google/genai'
import { describe, expect, it, vi } from 'vitest'
import { FIRST_TIMEOUT_MS, RETRY_504_TIMEOUT_MS, withRetry } from './retry'

const apiError = (status: number): ApiError => new ApiError({ message: `status ${status}`, status })

// Soxta Gemini chaqiruvi: navbatdagi natijalarni qaytaradi, har urinishning model va muddatini yozib boradi
function fakeCall(results: (string | ApiError)[]): {
  call: (model: string, timeout: number) => Promise<string>
  calls: [string, number][]
} {
  const calls: [string, number][] = []
  return {
    calls,
    call: async (model, timeout) => {
      calls.push([model, timeout])
      const r = results[calls.length - 1]
      if (r instanceof ApiError) throw r
      return r
    }
  }
}

describe('withRetry', () => {
  it('birinchi urinish muvaffaqiyatli → qayta urinilmaydi', async () => {
    const f = fakeCall(['ok'])
    expect(await withRetry(f.call, ['flash', 'lite'], 0)).toBe('ok')
    expect(f.calls).toEqual([['flash', FIRST_TIMEOUT_MS]])
  })
  it('504 → zaxira model qisqaroq muddat bilan', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const f = fakeCall([apiError(504), 'ok'])
    expect(await withRetry(f.call, ['flash', 'lite'], 0)).toBe('ok')
    expect(f.calls).toEqual([
      ['flash', FIRST_TIMEOUT_MS],
      ['lite', RETRY_504_TIMEOUT_MS]
    ])
  })
  it('504 ikkala modelda → xato yuqoriga uzatiladi (service "busy" qiladi)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const f = fakeCall([apiError(504), apiError(504)])
    await expect(withRetry(f.call, ['flash', 'lite'], 0)).rejects.toMatchObject({ status: 504 })
    expect(f.calls).toHaveLength(2)
  })
  it("tanlangan model zaxiraning o'zi bo'lsa → 504 da qayta urinilmaydi", async () => {
    const f = fakeCall([apiError(504), 'ok'])
    await expect(withRetry(f.call, ['lite', 'lite'], 0)).rejects.toMatchObject({ status: 504 })
    expect(f.calls).toHaveLength(1)
  })
  it('503 → zaxira model, oddiy muddat bilan', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const f = fakeCall([apiError(503), 'ok'])
    expect(await withRetry(f.call, ['flash', 'lite'], 0)).toBe('ok')
    expect(f.calls[1]).toEqual(['lite', FIRST_TIMEOUT_MS])
  })
  it('429 / 400 → qayta urinilmaydi', async () => {
    for (const status of [429, 400]) {
      const f = fakeCall([apiError(status), 'ok'])
      await expect(withRetry(f.call, ['flash', 'lite'], 0)).rejects.toMatchObject({ status })
      expect(f.calls).toHaveLength(1)
    }
  })
})
