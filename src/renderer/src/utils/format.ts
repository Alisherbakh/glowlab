import type { Language } from '../../../shared/settings'

const LOCALES: Record<Language, string> = { uz: 'uz-UZ', ko: 'ko-KR', en: 'en-US' }

// Chromium'ning uz-UZ formati "2026 M11 10" ko'rinishida chiqadi → o'zbekchani o'zimiz formatlaymiz
const UZ_MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr'
]

function uzDate(y: number, m: number, d: number): string {
  return `${d}-${UZ_MONTHS[m - 1]}, ${y}` // "10-noyabr, 2026"
}

// YYYY-MM-DD → tanlangan tildagi sana ("10-noyabr, 2026" / "2026. 11. 10." / "Nov 10, 2026")
export function formatDate(value: string, lang: Language): string {
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return value
  if (lang === 'uz') return uzDate(y, m, d)
  const date = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat(LOCALES[lang], { dateStyle: 'medium', timeZone: 'UTC' }).format(
    date
  )
}

// SQLite datetime('now') (UTC, "YYYY-MM-DD HH:MM:SS") → mahalliy sana va vaqt
export function formatDateTime(value: string, lang: Language): string {
  const date = new Date(value.replace(' ', 'T') + 'Z')
  if (Number.isNaN(date.getTime())) return value
  if (lang === 'uz') {
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${uzDate(date.getFullYear(), date.getMonth() + 1, date.getDate())}, ${hh}:${mm}`
  }
  return new Intl.DateTimeFormat(LOCALES[lang], { dateStyle: 'medium', timeStyle: 'short' }).format(
    date
  )
}
