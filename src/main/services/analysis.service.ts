import { z } from 'zod'
import {
  RISK_LEVELS,
  type AnalyzeLabelResult,
  type LabelAnalysis,
  type SavedAnalysis
} from '../../shared/analysis'
import { generateJsonFromImage } from '../ai/gemini'
import { LABEL_RESPONSE_SCHEMA, buildLabelPrompt } from '../ai/labelPrompt'
import { findProductById } from '../models/product.model'
import {
  findAnalysisById,
  findLatestAnalysis,
  insertAnalysis,
  replaceProductIngredients
} from '../models/analysis.model'
import { getProfile } from './profile.service'
import { getSettings } from './settings.service'

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB dan katta rasm qabul qilinmaydi

// Renderer'dan keladigan so'rov
const inputSchema = z
  .object({
    productId: z.number().int().positive().nullable(),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    bytes: z.instanceof(Uint8Array).refine((b) => b.byteLength > 0 && b.byteLength <= MAX_BYTES)
  })
  .strict()

// AI javobi — ishonmaymiz, har doim tekshiramiz
const ingredientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  risk: z.enum(RISK_LEVELS).catch('unknown'), // Noma'lum qiymat → "unknown"
  note: z.string().trim().max(300).catch('')
})

const responseSchema = z.object({
  readable: z.boolean(),
  unreadableReason: z.string().max(500).optional(),
  ingredients: z.array(ingredientSchema).max(150),
  warnings: z.array(z.string().trim().max(300)).max(10).catch([]),
  summary: z.string().trim().max(1000).catch('')
})

const analysisSchema = z.object({
  ingredients: z.array(ingredientSchema),
  warnings: z.array(z.string()),
  summary: z.string()
})

// Bir xil nomli moddalarni birlashtiramiz (katta-kichik harf farqsiz)
function dedupe(items: z.infer<typeof ingredientSchema>[]): z.infer<typeof ingredientSchema>[] {
  const seen = new Set<string>()
  return items.filter((i) => {
    const k = i.name.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export async function analyzeLabel(input: unknown): Promise<AnalyzeLabelResult> {
  const parsedInput = inputSchema.safeParse(input)
  if (!parsedInput.success) return { status: 'error', code: 'bad_image' }
  const { productId, mimeType, bytes } = parsedInput.data
  if (productId !== null && !findProductById(productId)) return { status: 'error', code: 'unknown' }

  const prompt = buildLabelPrompt(getSettings().language, getProfile())
  const result = await generateJsonFromImage(
    prompt,
    { mimeType, base64: Buffer.from(bytes).toString('base64') },
    LABEL_RESPONSE_SCHEMA
  )
  if (!result.ok) return { status: 'error', code: result.code }

  let json: unknown
  try {
    json = JSON.parse(result.text)
  } catch {
    return { status: 'error', code: 'invalid_response' }
  }
  const parsed = responseSchema.safeParse(json)
  if (!parsed.success) return { status: 'error', code: 'invalid_response' }

  const data = parsed.data
  // O'qib bo'lmadi yoki birorta modda topilmadi → foydalanuvchidan yaxshiroq rasm so'raymiz
  if (!data.readable || data.ingredients.length === 0) {
    return { status: 'unreadable', reason: data.unreadableReason ?? '' }
  }

  const analysis: LabelAnalysis = {
    ingredients: dedupe(data.ingredients),
    warnings: data.warnings,
    summary: data.summary
  }
  const rawText = analysis.ingredients.map((i) => i.name).join(', ')
  const analysisId = insertAnalysis(productId, rawText, JSON.stringify(analysis))
  if (productId !== null) replaceProductIngredients(productId, analysis.ingredients)

  const saved = findAnalysisById(analysisId)!
  return { status: 'ok', analysisId, analysis, createdAt: saved.created_at }
}

// Mahsulotning oxirgi tahlili (bo'lmasa null)
export function getLatestAnalysis(productId: unknown): SavedAnalysis | null {
  const id = z.number().int().positive().parse(productId)
  const row = findLatestAnalysis(id)
  if (!row) return null
  try {
    const analysis = analysisSchema.parse(JSON.parse(row.result_json))
    return { id: row.id, productId: row.product_id, analysis, createdAt: row.created_at }
  } catch {
    return null
  }
}
