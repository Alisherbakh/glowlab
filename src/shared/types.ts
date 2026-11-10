// Main va renderer ikkalasi ham ishlatadigan umumiy turlar (types)

export type PingResult = {
  message: string // main process javobi → "pong"
  time: string // javob qaytgan vaqt (ISO formatda)
}

export type DbInfo = {
  version: number // PRAGMA user_version (qo'llangan migratsiya)
  path: string // glowlab.db fayl manzili
  tables: string[] // Bazadagi jadvallar ro'yxati
}
