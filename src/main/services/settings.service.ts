import { z } from 'zod'
import {
  DEFAULT_SETTINGS,
  LANGUAGES,
  REMINDER_MODES,
  THEME_MODES,
  type AppSettings
} from '../../shared/settings'
import { findAllSettings, upsertSetting } from '../models/settings.model'

// Har bir kalit uchun ruxsat etilgan qiymatlar (zod sxemasi)
const settingsSchema = z.object({
  language: z.enum(LANGUAGES),
  theme: z.enum(THEME_MODES),
  reminders: z.enum(REMINDER_MODES)
})

// Renderer'dan keladigan o'zgarish: faqat ma'lum kalitlar, kamida bittasi
const settingsPatchSchema = settingsSchema.partial().strict()

// Bazadagi sozlamalar + standart qiymatlar → to'liq AppSettings
export function getSettings(): AppSettings {
  const stored: Record<string, string> = {}
  for (const row of findAllSettings()) stored[row.key] = row.value // Qatorlarni obyektga aylantiramiz

  const merged = { ...DEFAULT_SETTINGS, ...stored } // Saqlanmaganlar → default
  const parsed = settingsSchema.safeParse(merged) // Buzilgan qiymat bo'lsa ham ilova yiqilmasligi kerak
  return parsed.success ? parsed.data : DEFAULT_SETTINGS
}

// Sozlamalarni tekshirib saqlaydi va yangilangan holatni qaytaradi
export function updateSettings(patch: unknown): AppSettings {
  const valid = settingsPatchSchema.parse(patch) // Noto'g'ri kalit/qiymat → xato (saqlanmaydi)
  for (const [key, value] of Object.entries(valid)) {
    if (value !== undefined) upsertSetting(key, value)
  }
  return getSettings()
}
