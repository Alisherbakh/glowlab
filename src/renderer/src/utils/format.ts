import type { Language } from '../../../shared/settings'

const LOCALES: Record<Language, string> = { uz: 'uz-UZ', ko: 'ko-KR', en: 'en-US' }

// YYYY-MM-DD → tanlangan tildagi sana (masalan "2026. 11. 9." yoki "Nov 9, 2026")
export function formatDate(value: string, lang: Language): string {
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat(LOCALES[lang], { dateStyle: 'medium', timeZone: 'UTC' }).format(
    date
  )
}

// SQLite datetime('now') (UTC, "YYYY-MM-DD HH:MM:SS") → mahalliy sana va vaqt
export function formatDateTime(value: string, lang: Language): string {
  const date = new Date(value.replace(' ', 'T') + 'Z')
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(LOCALES[lang], { dateStyle: 'medium', timeStyle: 'short' }).format(
    date
  )
}
