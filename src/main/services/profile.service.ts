import { z } from 'zod'
import { AGE_RANGES, CONCERNS, SKIN_TYPES, type SkinProfile } from '../../shared/profile'
import { findProfile, upsertProfile } from '../models/profile.model'

// Renderer'dan keladigan ma'lumotni tekshiruvchi sxema
const profileInputSchema = z
  .object({
    ageRange: z.enum(AGE_RANGES),
    skinType: z.enum(SKIN_TYPES),
    concerns: z.array(z.enum(CONCERNS)).max(CONCERNS.length) // Faqat ma'lum tashvishlar
  })
  .strict()

// Bazadagi qatorni SkinProfile'ga aylantiradi; buzilgan bo'lsa null (ilova yiqilmaydi)
export function getProfile(): SkinProfile | null {
  const row = findProfile()
  if (!row) return null // Hali onboarding o'tilmagan

  let concerns: unknown
  try {
    concerns = JSON.parse(row.concerns) // JSON matn → massiv
  } catch {
    concerns = [] // Buzilgan JSON → bo'sh ro'yxat
  }

  const parsed = profileInputSchema.safeParse({
    ageRange: row.age_range,
    skinType: row.skin_type,
    concerns
  })
  return parsed.success ? { ...parsed.data, updatedAt: row.updated_at } : null
}

// Tekshirib saqlaydi va saqlangan profilni qaytaradi
export function saveProfile(input: unknown): SkinProfile {
  const valid = profileInputSchema.parse(input) // Noto'g'ri qiymat → xato
  const unique = [...new Set(valid.concerns)] // Takrorlarni olib tashlaymiz
  upsertProfile(valid.ageRange, valid.skinType, JSON.stringify(unique))
  const saved = getProfile()
  if (!saved) throw new Error('Profile could not be saved')
  return saved
}
