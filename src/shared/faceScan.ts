// Yuz terisi skani: turlar, sifat muammolari va profilga moslashgan darajalar (main + renderer umumiy)
// MUHIM: bu tibbiy tashxis emas — rasmdagi ko'rinadigan belgilarning taxminiy o'lchovlari
import type { AgeRange, SkinType } from './profile'

export const FACE_METRICS = [
  'oiliness', // T-zonadagi yaltirash
  'redness', // Yonoq/burun/iyakdagi qizarish
  'texture', // Mayda notekisliklar (g'adir-budirlik)
  'spots', // Mayda qora dog'lar
  'darkCircles', // Ko'z osti qorayishi
  'evenness' // Rang notekisligi (dog'-dog' ko'rinish)
] as const
export type FaceMetric = (typeof FACE_METRICS)[number]

export const METRIC_LEVELS = ['low', 'moderate', 'high'] as const
export type MetricLevel = (typeof METRIC_LEVELS)[number]

// Rasm sifati muammolari → foydalanuvchiga "yaxshiroq rasm yuklang / qayta oling" deyiladi
export const FACE_QUALITY_ISSUES = [
  'no_face',
  'multiple_faces',
  'face_too_small',
  'not_frontal',
  'blurry',
  'too_dark',
  'too_bright',
  'uneven_light'
] as const
export type FaceQualityIssue = (typeof FACE_QUALITY_ISSUES)[number]

export const SCAN_SOURCES = ['photo', 'camera'] as const
export type ScanSource = (typeof SCAN_SOURCES)[number]

export type RawFaceMetrics = Record<FaceMetric, number> // Har biri 0..1

export type FaceMetricResult = {
  metric: FaceMetric
  score: number // 0..1
  level: MetricLevel
}

// Main → renderer: tahlil natijasi
export type FaceAnalysisResult =
  | {
      status: 'ok'
      metrics: FaceMetricResult[]
      raw: RawFaceMetrics
      qualityScore: number // 0..1
      profile: { ageRange: AgeRange; skinType: SkinType } // Qaysi profil bo'yicha talqin qilindi
    }
  | { status: 'quality'; issues: FaceQualityIssue[] } // Sifat yetarli emas → qayta olish
  | { status: 'no_profile' } // Profil yo'q (odatda bo'lmaydi: onboarding majburiy)

export type SavedFaceScan = {
  id: number
  createdAt: string
  source: ScanSource
  qualityScore: number
  metrics: FaceMetricResult[]
}

// --- Darajalar: asosiy chegaralar + profil bo'yicha tuzatish ---------------------------------
// score < moderate → "past", moderate..high → "o'rtacha", >= high → "yuqori"
const BASE = { moderate: 0.35, high: 0.65 }

// Tuzatish (shift) ikkala chegaraga qo'shiladi: musbat → shu guruh uchun "odatiy" daraja yuqoriroq.
// Masalan yog'li teri uchun ozgina yaltirash odatiy holat, shuning uchun "yuqori" chegarasi ko'tariladi.
const SKIN_SHIFT: Partial<Record<FaceMetric, Partial<Record<SkinType, number>>>> = {
  oiliness: { oily: 0.15, combination: 0.08, dry: -0.1 },
  redness: { sensitive: 0.05 },
  texture: { dry: 0.05 }
}
const AGE_SHIFT: Partial<Record<FaceMetric, Partial<Record<AgeRange, number>>>> = {
  texture: { '18-24': -0.05, '35-44': 0.07, '45+': 0.15 }, // Yosh bilan tekstura tabiiy ravishda ortadi
  spots: { '35-44': 0.05, '45+': 0.1 },
  darkCircles: { '45+': 0.05 }
}

export function metricShift(metric: FaceMetric, ageRange: AgeRange, skinType: SkinType): number {
  return (SKIN_SHIFT[metric]?.[skinType] ?? 0) + (AGE_SHIFT[metric]?.[ageRange] ?? 0)
}

export function levelFor(
  metric: FaceMetric,
  score: number,
  ageRange: AgeRange,
  skinType: SkinType
): MetricLevel {
  const shift = metricShift(metric, ageRange, skinType)
  const moderate = Math.min(0.9, Math.max(0.1, BASE.moderate + shift))
  const high = Math.min(0.95, Math.max(moderate + 0.1, BASE.high + shift))
  if (score >= high) return 'high'
  if (score >= moderate) return 'moderate'
  return 'low'
}

export function toMetricResults(
  raw: RawFaceMetrics,
  ageRange: AgeRange,
  skinType: SkinType
): FaceMetricResult[] {
  return FACE_METRICS.map((metric) => ({
    metric,
    score: raw[metric],
    level: levelFor(metric, raw[metric], ageRange, skinType)
  }))
}
