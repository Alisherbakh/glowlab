import { ApiError } from '@google/genai'

export const FIRST_TIMEOUT_MS = 60_000 // Birinchi urinish: 60 soniya kutamiz
export const RETRY_504_TIMEOUT_MS = 25_000 // 504 dan keyin zaxira model: jami kutish ~85 s dan oshmasin

type Call<T> = (model: string, timeoutMs: number) => Promise<T>

// Server vaqtincha band bo'lsa keyingi model bilan bir marta qayta urinadi:
// - 500/503: 1 soniyadan keyin zaxira model (zaxira bo'lmasa — o'sha model qayta), 60 s bilan
// - 504 (muddat tugadi): darhol zaxira model, qisqaroq muddat bilan. Zaxira o'sha model bo'lsa — qayta urinilmaydi
export async function withRetry<T>(call: Call<T>, models: string[], delayMs = 1000): Promise<T> {
  const list = [...new Set(models)]
  const first = list[0]
  const fallback = list[1]
  try {
    return await call(first, FIRST_TIMEOUT_MS)
  } catch (err) {
    if (!(err instanceof ApiError)) throw err
    if (err.status === 500 || err.status === 503) {
      const second = fallback ?? first
      console.warn(`[gemini] ${first}: status=${err.status} → ${second} bilan qayta urinilmoqda…`)
      await new Promise((r) => setTimeout(r, delayMs))
      return call(second, FIRST_TIMEOUT_MS)
    }
    if (err.status === 504 && fallback) {
      console.warn(`[gemini] ${first}: status=504 → ${fallback} bilan qayta urinilmoqda…`)
      return call(fallback, RETRY_504_TIMEOUT_MS)
    }
    throw err
  }
}
