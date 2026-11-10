import { getDb } from '../db/connection'

// settings jadvali bilan ishlovchi SQL funksiyalar (faqat SQL, mantiq service'da)

type SettingRow = { key: string; value: string }

// Barcha sozlamalarni qaytaradi
export function findAllSettings(): SettingRow[] {
  return getDb().prepare('SELECT key, value FROM settings').all() as SettingRow[]
}

// Bitta sozlamani yozadi: bor bo'lsa yangilaydi, yo'q bo'lsa qo'shadi (UPSERT)
export function upsertSetting(key: string, value: string): void {
  getDb()
    .prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value'
    )
    .run(key, value) // ? o'rniga parametrlar → SQL injection bo'lmaydi
}
