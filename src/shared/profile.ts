// Teri profili: so'rovnoma variantlari va turi (main + renderer umumiy)

export const AGE_RANGES = ['18-24', '25-34', '35-44', '45+'] as const // Faqat oraliq (aniq yosh so'ralmaydi)
export const SKIN_TYPES = ['dry', 'oily', 'combination', 'normal', 'sensitive'] as const
export const CONCERNS = [
  'acne',
  'redness',
  'dark_circles',
  'pores',
  'dryness',
  'pigmentation'
] as const

export type AgeRange = (typeof AGE_RANGES)[number]
export type SkinType = (typeof SKIN_TYPES)[number]
export type Concern = (typeof CONCERNS)[number]

export type SkinProfile = {
  ageRange: AgeRange
  skinType: SkinType
  concerns: Concern[] // Bo'sh bo'lishi mumkin
  updatedAt: string // Oxirgi o'zgartirilgan vaqt
}

// Saqlash uchun yuboriladigan qism (updatedAt'ni main o'zi qo'yadi)
export type SkinProfileInput = Omit<SkinProfile, 'updatedAt'>
