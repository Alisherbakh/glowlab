import { getDb } from '../db/connection'

// products jadvali — faqat SQL

export type ProductRow = {
  id: number
  name: string
  brand: string | null
  category: string | null
  opened_at: string | null
  pao_months: number
  expires_at: string | null
  created_at: string
}

export type ProductWrite = Omit<ProductRow, 'id' | 'created_at'>

const COLUMNS = 'id, name, brand, category, opened_at, pao_months, expires_at, created_at'

// Hammasi: muddati borlari avval (eng yaqini birinchi), keyin muddatsizlar (yangisi birinchi)
export function findAllProducts(): ProductRow[] {
  return getDb()
    .prepare(
      `SELECT ${COLUMNS} FROM products
       ORDER BY expires_at IS NULL, expires_at ASC, created_at DESC, id DESC`
    )
    .all() as ProductRow[]
}

export function findProductById(id: number): ProductRow | undefined {
  return getDb().prepare(`SELECT ${COLUMNS} FROM products WHERE id = ?`).get(id) as
    ProductRow | undefined
}

// Yangi mahsulot → yangi id
export function insertProduct(p: ProductWrite): number {
  const result = getDb()
    .prepare(
      `INSERT INTO products (name, brand, category, opened_at, pao_months, expires_at)
       VALUES (@name, @brand, @category, @opened_at, @pao_months, @expires_at)`
    )
    .run(p) // @nom → obyekt kalitlari bo'yicha parametrlar
  return Number(result.lastInsertRowid)
}

// Yangilaydi; o'zgargan qatorlar soni (0 → topilmadi)
export function updateProduct(id: number, p: ProductWrite): number {
  return getDb()
    .prepare(
      `UPDATE products SET name = @name, brand = @brand, category = @category,
         opened_at = @opened_at, pao_months = @pao_months, expires_at = @expires_at
       WHERE id = @id`
    )
    .run({ ...p, id }).changes
}

// O'chiradi (bog'liq jadvallar ON DELETE CASCADE bilan tozalanadi)
export function deleteProduct(id: number): number {
  return getDb().prepare('DELETE FROM products WHERE id = ?').run(id).changes
}
