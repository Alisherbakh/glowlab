import { getDb } from '../db/connection'

// label_analyses + ingredients + product_ingredients — faqat SQL

export type AnalysisRow = {
  id: number
  product_id: number | null
  result_json: string
  created_at: string
}

export function insertAnalysis(
  productId: number | null,
  rawText: string,
  resultJson: string
): number {
  const r = getDb()
    .prepare('INSERT INTO label_analyses (product_id, raw_text, result_json) VALUES (?, ?, ?)')
    .run(productId, rawText, resultJson)
  return Number(r.lastInsertRowid)
}

export function findAnalysisById(id: number): AnalysisRow | undefined {
  return getDb()
    .prepare('SELECT id, product_id, result_json, created_at FROM label_analyses WHERE id = ?')
    .get(id) as AnalysisRow | undefined
}

// Mahsulotning eng oxirgi tahlili
export function findLatestAnalysis(productId: number): AnalysisRow | undefined {
  return getDb()
    .prepare(
      `SELECT id, product_id, result_json, created_at FROM label_analyses
       WHERE product_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`
    )
    .get(productId) as AnalysisRow | undefined
}

// Moddalarni saqlab, mahsulotga bog'laydi (eski bog'lanishlar yangisi bilan almashtiriladi)
export function replaceProductIngredients(
  productId: number,
  items: { name: string; risk: string; note: string }[]
): void {
  const db = getDb()
  const upsert = db.prepare(
    `INSERT INTO ingredients (name, risk_level, note) VALUES (?, ?, ?)
     ON CONFLICT (name) DO UPDATE SET risk_level = excluded.risk_level, note = excluded.note`
  )
  const findId = db.prepare('SELECT id FROM ingredients WHERE name = ?') // NOCASE bo'yicha topadi
  const clear = db.prepare('DELETE FROM product_ingredients WHERE product_id = ?')
  const link = db.prepare(
    'INSERT OR IGNORE INTO product_ingredients (product_id, ingredient_id) VALUES (?, ?)'
  )

  db.transaction(() => {
    clear.run(productId)
    for (const item of items) {
      upsert.run(item.name, item.risk, item.note)
      const row = findId.get(item.name) as { id: number }
      link.run(productId, row.id)
    }
  })() // Hammasi yoki hech narsa (tranzaksiya)
}

// Bir nechta mahsulotning skan qilingan modda nomlari (moslik tekshiruvi uchun)
export function findIngredientNamesByProducts(productIds: number[]): Map<number, string[]> {
  const result = new Map<number, string[]>()
  if (productIds.length === 0) return result
  const marks = productIds.map(() => '?').join(', ')
  const rows = getDb()
    .prepare(
      `SELECT pi.product_id, i.name FROM product_ingredients pi
       JOIN ingredients i ON i.id = pi.ingredient_id
       WHERE pi.product_id IN (${marks})`
    )
    .all(...productIds) as { product_id: number; name: string }[]
  for (const r of rows) result.set(r.product_id, [...(result.get(r.product_id) ?? []), r.name])
  return result
}
