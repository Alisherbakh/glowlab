import type Database from 'better-sqlite3'
import type { Migration } from './migrations'

// Bazaga hali qo'llanmagan migratsiyalarni bajaradi va yangi versiyani qaytaradi
export function runMigrations(db: Database.Database, migrations: Migration[]): number {
  const current = db.pragma('user_version', { simple: true }) as number // Hozirgi versiya (yangi bazada 0)

  const pending = migrations
    .filter((m) => m.version > current) // Faqat yangilari
    .sort((a, b) => a.version - b.version) // Kichikdan kattaga

  for (const m of pending) {
    // Har bir migratsiya alohida tranzaksiyada: xato bo'lsa, o'zgarishlar bekor qilinadi
    const apply = db.transaction(() => {
      db.exec(m.sql) // SQL faylni bajaramiz
      db.pragma(`user_version = ${Math.trunc(m.version)}`) // Versiyani yangilaymiz (son, foydalanuvchi kiritmaydi)
    })
    apply()
    console.log(`[db] migratsiya qo'llandi: ${m.name}`)
  }

  return db.pragma('user_version', { simple: true }) as number // Yakuniy versiya
}
