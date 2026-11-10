// Demo mahsulotlar: GlowLab bazasiga 15 ta namuna mahsulot qo'shadi (portfolio / sinab ko'rish uchun).
// Ishga tushirish (ilova yopiq bo'lsin):  yarn seed:demo        |  sinov:  yarn seed:demo --dry-run
// Faqat qo'shadi: shu nomli mahsulot bor bo'lsa — o'tkazib yuboradi. Hech narsani o'chirmaydi.
import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { PRODUCT_CATEGORIES, computeExpiresAt, todayLocal } from '../src/shared/products.ts'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const dbPath =
  args.find((a) => a.endsWith('.db')) ??
  join(homedir(), 'Library', 'Application Support', 'GlowLab', 'glowlab.db') // macOS: ilovaning haqiqiy bazasi

// Ochilgan sana: bugundan N kun oldin (null → hali ochilmagan)
const daysAgo = (n: number | null): string | null => {
  if (n === null) return null
  const d = new Date()
  d.setDate(d.getDate() - n)
  return todayLocal(d)
}

// [nom, kategoriya, necha kun oldin ochilgan, PAO oy]. Ba'zilari ataylab "tez orada" va "muddati o'tgan"
const PRODUCTS: [string, string, number | null, number][] = [
  ['Gentle hydrating cleanser', 'cleanser', 60, 12],
  ['Salicylic acid (BHA) cleanser', 'cleanser', null, 12],
  ['Micellar cleansing water', 'cleanser', 15, 12],
  ['Glycolic acid toner', 'toner', 340, 12], // ~25 kun qoldi → tez orada
  ['Hydrating toner', 'toner', 30, 12],
  ['Vitamin C serum', 'serum', 200, 6], // muddati o'tgan
  ['Niacinamide 10% serum', 'serum', 45, 12],
  ['Retinol 0.3% night serum', 'serum', 20, 6],
  ['Ceramide moisturizing cream', 'moisturizer', 50, 12],
  ['Oil-free gel moisturizer', 'moisturizer', null, 12],
  ['Mineral sunscreen SPF 50', 'sunscreen', 40, 12],
  ['Daily sunscreen fluid SPF 30', 'sunscreen', 160, 6], // ~20 kun qoldi → tez orada
  ['Clay face mask', 'mask', 90, 12],
  ['Caffeine eye cream', 'eye_cream', 70, 6],
  ['Lip balm SPF 15', 'lip', 25, 12]
]

if (!existsSync(dbPath)) {
  console.error(
    `Baza topilmadi: ${dbPath}\nAvval ilovani bir marta oching (yarn dev), keyin qayta urinib ko'ring.`
  )
  process.exit(1)
}

const db = new Database(dbPath)
db.pragma('foreign_keys = ON')
if (((db.pragma('user_version', { simple: true }) as number) ?? 0) < 1) {
  console.error('Baza hali tayyor emas (migratsiyalar bajarilmagan). Avval ilovani oching.')
  process.exit(1)
}

const exists = db.prepare('SELECT 1 FROM products WHERE name = ? COLLATE NOCASE')
const insert = db.prepare(
  `INSERT INTO products (name, brand, category, opened_at, pao_months, expires_at)
   VALUES (?, NULL, ?, ?, ?, ?)`
)

let added = 0
let skipped = 0
db.transaction(() => {
  for (const [name, category, opened, pao] of PRODUCTS) {
    if (!(PRODUCT_CATEGORIES as readonly string[]).includes(category))
      throw new Error(`Noma'lum kategoriya: ${category}`)
    if (exists.get(name)) {
      skipped++
      continue
    }
    const openedAt = daysAgo(opened)
    const expiresAt = computeExpiresAt(openedAt, pao) // Ilovadagi bilan bir xil hisob (src/shared)
    console.log(
      `${dryRun ? '[dry-run] ' : ''}+ ${name} · ${category} · ochilgan: ${openedAt ?? '—'} · muddat: ${expiresAt ?? '—'}`
    )
    if (!dryRun) insert.run(name, category, openedAt, pao, expiresAt)
    added++
  }
})()
db.close()

console.log(
  `\n${dryRun ? "Qo'shilardi" : "Qo'shildi"}: ${added} ta, o'tkazib yuborildi (allaqachon bor): ${skipped} ta`
)
console.log(`Baza: ${dbPath}`)
