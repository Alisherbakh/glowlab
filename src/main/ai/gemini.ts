import { ApiError, GoogleGenAI } from '@google/genai'
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
    const response = await ai.models.generateContent({
      model: getModelName(),
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
        temperature: 0.2 // Barqarorroq, kamroq "ijodiy" javob
      }
    })
    const text = response.text
    return text ? { ok: true, text } : { ok: false, code: 'invalid_response' }
  } catch (err) {
    return { ok: false, code: mapError(err) }
  }
}

// SDK xatosini bizning xato kodimizga aylantiradi (kalit yoki xabar loglarga chiqmaydi)
function mapError(err: unknown): AnalyzeErrorCode {
  if (err instanceof ApiError) {
    if (err.status === 400 && /api key/i.test(err.message)) return 'invalid_key'
    if (err.status === 401 || err.status === 403) return 'invalid_key'
    if (err.status === 429) return 'rate_limit'
    if (err.status >= 500) return 'network'
    return 'unknown'
  }
  if (err instanceof Error && /fetch|network|timeout|abort|ENOTFOUND|ECONN/i.test(err.message))
    return 'network'
  return 'unknown'
}
