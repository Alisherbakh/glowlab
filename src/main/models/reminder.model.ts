import { getDb } from '../db/connection'

// reminders_log — bitta mahsulot uchun bir xil eslatma ikki marta yuborilmasligi uchun

export function wasReminded(productId: number, kind: 'soon' | 'expired'): boolean {
  return (
    getDb()
      .prepare('SELECT 1 FROM reminders_log WHERE product_id = ? AND kind = ?')
      .get(productId, kind) !== undefined
  )
}

export function logReminder(productId: number, kind: 'soon' | 'expired'): void {
  getDb()
    .prepare('INSERT OR IGNORE INTO reminders_log (product_id, kind) VALUES (?, ?)')
    .run(productId, kind)
}

// Mahsulot tahrirlansa (sana o'zgargan bo'lishi mumkin) — eslatmalar tarixi tozalanadi
export function clearReminders(productId: number): void {
  getDb().prepare('DELETE FROM reminders_log WHERE product_id = ?').run(productId)
}
