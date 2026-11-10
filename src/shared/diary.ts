// Teri kundaligi: turlar va cheklovlar (main + renderer umumiy)

export const DIARY_TAGS = [
  'breakout', // Toshma chiqdi
  'dryness', // Quruqlik
  'oiliness', // Yog'lanish
  'redness', // Qizarish
  'calm', // Teri tinch
  'new_product', // Yangi mahsulot sinaldi
  'sun', // Ko'p quyoshda bo'ldim
  'stress',
  'poor_sleep', // Yomon uxladim
  'travel' // Safar / iqlim o'zgardi
] as const
export type DiaryTag = (typeof DIARY_TAGS)[number]

export const FEELING_MIN = 1
export const FEELING_MAX = 5 // 1 — juda yomon, 5 — juda yaxshi
export const MAX_NOTE_LENGTH = 1000

export type DiaryEntry = {
  id: number
  entryDate: string // YYYY-MM-DD
  feeling: number | null // 1–5
  tags: DiaryTag[]
  note: string
  faceScanId: number | null // Bog'langan yuz skani (ixtiyoriy)
  createdAt: string
  updatedAt: string | null
}

export type DiaryEntryInput = {
  entryDate: string
  feeling: number | null
  tags: DiaryTag[]
  note: string
  faceScanId: number | null
}
