import { getDb } from '../db/connection'

// skin_profile jadvali (bitta foydalanuvchi → bitta qator, id = 1)

export type ProfileRow = {
  age_range: string
  skin_type: string
  concerns: string // JSON matn
  updated_at: string
}

// Profilni o'qiydi; hali yo'q bo'lsa undefined
export function findProfile(): ProfileRow | undefined {
  return getDb()
    .prepare('SELECT age_range, skin_type, concerns, updated_at FROM skin_profile WHERE id = 1')
    .get() as ProfileRow | undefined
}

// Profilni yozadi: bor bo'lsa yangilaydi (UPSERT)
export function upsertProfile(ageRange: string, skinType: string, concernsJson: string): void {
  getDb()
    .prepare(
      `INSERT INTO skin_profile (id, age_range, skin_type, concerns, updated_at)
       VALUES (1, ?, ?, ?, datetime('now'))
       ON CONFLICT (id) DO UPDATE SET
         age_range = excluded.age_range,
         skin_type = excluded.skin_type,
         concerns = excluded.concerns,
         updated_at = excluded.updated_at`
    )
    .run(ageRange, skinType, concernsJson)
}
