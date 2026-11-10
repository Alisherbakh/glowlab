// Yorliq (label) tahlili: natija turlari (main + renderer umumiy)

export const RISK_LEVELS = ['low', 'medium', 'high', 'unknown'] as const
export type RiskLevel = (typeof RISK_LEVELS)[number]

export type AnalyzedIngredient = {
  name: string // INCI nomi (masalan "Niacinamide")
  risk: RiskLevel // Umumiy sezgirlik xavfi (tibbiy baho emas)
  note: string // Qisqa izoh (foydalanuvchi tilida)
}

export type LabelAnalysis = {
  ingredients: AnalyzedIngredient[]
  warnings: string[] // Foydalanuvchi profiliga mos ogohlantirishlar
  summary: string // 1–2 jumlalik xulosa
}

// Renderer → main: rasm baytlari
export type AnalyzeLabelInput = {
  productId: number | null
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  bytes: Uint8Array
}

// Xato kodlari — renderer ularni tarjima qiladi
export type AnalyzeErrorCode =
  | 'no_key' // API kalit kiritilmagan
  | 'invalid_key' // Kalit noto'g'ri
  | 'rate_limit' // Bepul limit tugagan
  | 'network' // Internet yo'q / vaqt tugadi
  | 'bad_image' // Rasm formati yoki hajmi noto'g'ri
  | 'invalid_response' // AI javobi sxemaga mos kelmadi
  | 'unknown'

export type AnalyzeLabelResult =
  | { status: 'ok'; analysisId: number; analysis: LabelAnalysis; createdAt: string }
  | { status: 'unreadable'; reason: string } // Yorliq o'qilmadi → qayta suratga olish
  | { status: 'error'; code: AnalyzeErrorCode }

export type SavedAnalysis = {
  id: number
  productId: number | null
  analysis: LabelAnalysis
  createdAt: string
}

export type AiKeyStatus = {
  configured: boolean
  source: 'env' | 'settings' | null // Kalit qayerdan olinmoqda
  model: string
}
