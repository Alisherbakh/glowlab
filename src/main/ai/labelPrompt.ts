import type { SkinProfile } from '../../shared/profile'
import type { Language } from '../../shared/settings'

export const LANGUAGE_NAMES: Record<Language, string> = {
  uz: 'Uzbek (Latin script)',
  ko: 'Korean',
  en: 'English'
}

// Gemini'ga beriladigan ko'rsatma (prompt). Inglizcha yoziladi — model aniqroq bajaradi
export function buildLabelPrompt(lang: Language, profile: SkinProfile | null): string {
  const profileText = profile
    ? `User profile: age range ${profile.ageRange}, skin type ${profile.skinType}, concerns: ${
        profile.concerns.length ? profile.concerns.join(', ') : 'none'
      }.`
    : 'User profile: not provided.'

  return [
    'You are a cosmetic ingredient assistant inside a skincare app. You are NOT a doctor.',
    'Look at the photo of a cosmetic product label and read its ingredient list (INCI).',
    'Rules:',
    '- Only list ingredients you can actually read in the photo. Never guess or invent ingredients.',
    '- If the photo is not an ingredient list, is too blurry, too dark, cut off, or unreadable, set "readable" to false and explain briefly in "unreadableReason".',
    '- For each ingredient give a general irritation/sensitivity risk for typical users: "low", "medium", "high", or "unknown" if you are not sure.',
    '- Notes must be short (max 15 words), factual and non-alarming. Do not diagnose or mention diseases.',
    '- "warnings": up to 5 short points relevant to the user profile (for example fragrance for sensitive skin). Empty if none.',
    '- "summary": 1–2 short sentences.',
    `- Write "note", "warnings", "summary" and "unreadableReason" in ${LANGUAGE_NAMES[lang]}. Keep ingredient names in INCI (English).`,
    profileText
  ].join('\n')
}

// Javob uchun JSON sxema (Gemini structured output). zod bilan ham alohida tekshiriladi
export const LABEL_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    readable: { type: 'boolean' },
    unreadableReason: { type: 'string' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          risk: { type: 'string', enum: ['low', 'medium', 'high', 'unknown'] },
          note: { type: 'string' }
        },
        required: ['name', 'risk', 'note']
      }
    },
    warnings: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' }
  },
  required: ['readable', 'ingredients', 'warnings', 'summary']
}
