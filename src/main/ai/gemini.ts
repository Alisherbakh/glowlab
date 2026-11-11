import { ApiError, GoogleGenAI, ThinkingLevel } from '@google/genai'
import type { AnalyzeErrorCode } from '../../shared/analysis'
import { getApiKey, getModelName } from './keyStore'

// Gemini'ga rasm + prompt yuboradi va JSON matnni qaytaradi (tekshirish service'da)
export async function generateJsonFromImage(
  prompt: string,
  image: { mimeType: string; base64: string },
  schema: unknown
): Promise<{ ok: true; text: string } | { ok: false; code: AnalyzeErrorCode }> {
  const apiKey = getApiKey()
  if (!apiKey) return { ok: false, code: 'no_key' }

  const ai = new GoogleGenAI({ apiKey: apiKey.key, httpOptions: { timeout: 60_000 } }) // 60 soniya kutamiz

  try {
    const response = await withRetry(
      (model) =>
        ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: image.mimeType, data: image.base64 } },
                { text: prompt }
              ]
            }
          ],
          config: {
            responseMimeType: 'application/json', // Faqat JSON javob
            responseJsonSchema: schema, // Javob tuzilmasi
            // Gemini 3: temperature standart (1.0) qoldiriladi — Google 1.0 dan pastini tavsiya qilmaydi (takrorlanib qolishi mumkin)
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } // Standart "high" juda sekin (504 DEADLINE_EXCEEDED)
          }
        }),
      textModels()
    )
    const text = response.text
    return text ? { ok: true, text } : { ok: false, code: 'invalid_response' }
  } catch (err) {
    return { ok: false, code: mapError(err) }
  }
}

// Faqat matnli so'rov → JSON javob (RAG chatbot uchun). Tekshirish service'da
export async function generateJsonFromText(
  prompt: string,
  schema: unknown
): Promise<{ ok: true; text: string } | { ok: false; code: AnalyzeErrorCode }> {
  const apiKey = getApiKey()
  if (!apiKey) return { ok: false, code: 'no_key' }

  const ai = new GoogleGenAI({ apiKey: apiKey.key, httpOptions: { timeout: 60_000 } })
  try {
    const response = await withRetry(
      (model) =>
        ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: schema,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } // Oddiy, parchalarga asoslangan javob — chuqur fikrlash shart emas
          }
        }),
      textModels()
    )
    const text = response.text
    return text ? { ok: true, text } : { ok: false, code: 'invalid_response' }
  } catch (err) {
    return { ok: false, code: mapError(err) }
  }
}

// Band model uchun zaxira: Google ro'yxatida "Stable", yangi loyihalar uchun tavsiya qilingan yengil model
const FALLBACK_MODEL = 'gemini-3.5-flash-lite'

// Server vaqtincha band (500/503) bo'lsa — 1 soniyadan keyin keyingi model bilan bir marta qayta urinadi.
// 504 (muddat tugadi) qayta urinilmaydi: yana 60 s kutish kerak bo'lardi.
async function withRetry<T>(call: (model: string) => Promise<T>, models: string[]): Promise<T> {
  const list = [...new Set(models)]
  const first = list[0]
  const second = list[1] ?? first // Zaxira bo'lmasa — o'sha model qayta
  try {
    return await call(first)
  } catch (err) {
    if (err instanceof ApiError && (err.status === 500 || err.status === 503)) {
      console.warn(`[gemini] ${first}: status=${err.status} → ${second} bilan qayta urinilmoqda…`)
      await new Promise((r) => setTimeout(r, 1000))
      return call(second)
    }
    throw err
  }
}

// Javob yozish uchun modellar: tanlangan + zaxira
function textModels(): string[] {
  return [getModelName(), FALLBACK_MODEL]
}

// SDK xatosini bizning xato kodimizga aylantiradi (kalit yoki xabar loglarga chiqmaydi)
function mapError(err: unknown): AnalyzeErrorCode {
  // Sababni terminalda ko'rish uchun (kalit xabarda bo'lmaydi: faqat status va xabar matni)
  console.warn(
    '[gemini] xato:',
    err instanceof ApiError ? `status=${err.status}` : '',
    err instanceof Error ? err.message.slice(0, 300) : String(err)
  )
  if (err instanceof ApiError) {
    if (err.status === 400 && /api key/i.test(err.message)) return 'invalid_key'
    if (err.status === 401 || err.status === 403) return 'invalid_key'
    if (err.status === 429) return 'rate_limit'
    if (err.status === 503 || err.status === 504) return 'busy' // Model band yoki juda sekin
    if (err.status >= 500) return 'network'
    return 'unknown'
  }
  if (err instanceof Error && /fetch|network|timeout|abort|ENOTFOUND|ECONN/i.test(err.message))
    return 'network'
  return 'unknown'
}
