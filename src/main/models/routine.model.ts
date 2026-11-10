import { getDb } from '../db/connection'
import type { ProductRow } from './product.model'

// routines + routine_steps — faqat SQL

export function findRoutineId(slot: string): number | undefined {
  const row = getDb().prepare('SELECT id FROM routines WHERE slot = ?').get(slot) as
    { id: number } | undefined
  return row?.id
}

// Tartibdagi mahsulotlar, qadam raqami bo'yicha
export function findRoutineProducts(routineId: number): ProductRow[] {
  return getDb()
    .prepare(
      `SELECT p.id, p.name, p.brand, p.category, p.opened_at, p.pao_months, p.expires_at, p.created_at
       FROM routine_steps s JOIN products p ON p.id = s.product_id
       WHERE s.routine_id = ? ORDER BY s.step_order ASC`
    )
    .all(routineId) as ProductRow[]
}

// Butun tartibni yangisi bilan almashtiradi (tranzaksiyada: yarim saqlanib qolmaydi)
export function replaceRoutineSteps(routineId: number, productIds: number[]): void {
  const db = getDb()
  const clear = db.prepare('DELETE FROM routine_steps WHERE routine_id = ?')
  const insert = db.prepare(
    'INSERT INTO routine_steps (routine_id, product_id, step_order) VALUES (?, ?, ?)'
  )
  db.transaction(() => {
    clear.run(routineId)
    productIds.forEach((pid, i) => insert.run(routineId, pid, i + 1)) // Qadamlar 1, 2, 3...
  })()
}

// Berilgan id'lardan qaysilari haqiqatan mavjud
export function countExistingProducts(ids: number[]): number {
  if (ids.length === 0) return 0
  const placeholders = ids.map(() => '?').join(', ') // (?, ?, ?) — qiymatlar parametr sifatida
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS c FROM products WHERE id IN (${placeholders})`)
    .get(...ids) as { c: number }
  return row.c
}
