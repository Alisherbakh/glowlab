import type { Language } from '../../../shared/settings'
import { en, type TranslationKey } from './en'
import { ko } from './ko'
import { uz } from './uz'

export type { TranslationKey }

const dictionaries: Record<Language, Record<TranslationKey, string>> = { uz, ko, en }

// Kalit bo'yicha tarjima; {nom} joylarini params bilan almashtiradi
export function translate(
  lang: Language,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  let text = dictionaries[lang][key] ?? en[key] // Topilmasa → inglizcha
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value)) // {stage} → 4
    }
  }
  return text
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  uz: "O'zbekcha",
  ko: '한국어',
  en: 'English'
}
