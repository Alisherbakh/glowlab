// Mahsulotlar: turlar, kategoriyalar va yaroqlilik muddati hisob-kitobi (main + renderer umumiy)

export const PRODUCT_CATEGORIES = [
  'cleanser',
  'toner',
  'serum',
  'moisturizer',
  'sunscreen',
  'mask',
  'eye_cream',
  'lip',
  'other'
] as const

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

export type Product = {
  id: number
  name: string
  brand: string | null
  category: ProductCategory | null
  openedAt: string | null // Ochilgan sana: YYYY-MM-DD
  paoMonths: number // Period After Opening — ochilgandan keyin necha oy
  expiresAt: string | null // Hisoblangan muddat: YYYY-MM-DD
  createdAt: string
}

// Yaratish / tahrirlash uchun yuboriladigan qism (id, expiresAt, createdAt'ni main qo'yadi)
export type ProductInput = {
  name: string
  brand: string | null
  category: ProductCategory | null
  openedAt: string | null
  paoMonths: number
}

export type ExpiryStatus = 'ok' | 'soon' | 'expired' | 'unknown'

export const SOON_DAYS = 30 // Muddatga 30 kundan kam qolsa → "tez orada"
export const PAO_OPTIONS = [3, 6, 9, 12, 18, 24, 36] as const // Qadoqdagi PAO belgisi (6M, 12M...)

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// YYYY-MM-DD → UTC sana (vaqt mintaqasi xatolari bo'lmasligi uchun UTC ishlatamiz)
function parseDate(value: string): Date | null {
  if (!DATE_RE.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  // 2026-02-31 kabi mavjud bo'lmagan sanani rad etamiz
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d)
    return null
  return date
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10) // YYYY-MM-DD
}

export function isValidDate(value: string): boolean {
  return parseDate(value) !== null
}

// Ochilgan sana + PAO oy → muddat. Oy oxiri: 31-yanvar + 1 oy → 28/29-fevral
export function computeExpiresAt(openedAt: string | null, paoMonths: number): string | null {
  if (!openedAt) return null
  const start = parseDate(openedAt)
  if (!start) return null

  const y = start.getUTCFullYear()
  const m = start.getUTCMonth() + paoMonths // Oylarni qo'shamiz
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate() // Maqsad oyning oxirgi kuni
  const day = Math.min(start.getUTCDate(), lastDay) // Kun oyning oxiridan oshmasin
  return formatDate(new Date(Date.UTC(y, m, day)))
}

// Bugungi sana (lokal vaqt bo'yicha) YYYY-MM-DD ko'rinishida
export function todayLocal(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Ikki sana orasidagi kunlar (b - a)
export function daysBetween(a: string, b: string): number {
  const da = parseDate(a)
  const db = parseDate(b)
  if (!da || !db) return 0
  return Math.round((db.getTime() - da.getTime()) / 86_400_000)
}

// Muddat holati: o'tgan / tez orada / yaxshi / noma'lum
export function getExpiryStatus(
  expiresAt: string | null,
  today: string = todayLocal()
): { status: ExpiryStatus; daysLeft: number | null } {
  if (!expiresAt) return { status: 'unknown', daysLeft: null }
  const daysLeft = daysBetween(today, expiresAt)
  if (daysLeft < 0) return { status: 'expired', daysLeft }
  if (daysLeft <= SOON_DAYS) return { status: 'soon', daysLeft }
  return { status: 'ok', daysLeft }
}
