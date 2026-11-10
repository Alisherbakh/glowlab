import Database from 'better-sqlite3'
import { migrations } from './migrations'
import { runMigrations } from './migrate'

let db: Database.Database | null = null // Yagona ulanish (singleton)

// Bazani ochadi, sozlaydi va migratsiyalarni bajaradi
export function openDatabase(filePath: string): Database.Database {
  const conn = new Database(filePath) // Fayl bo'lmasa, avtomatik yaratiladi
  conn.pragma('journal_mode = WAL') // Tezroq yozish, o'qish bloklanmaydi
  conn.pragma('foreign_keys = ON') // REFERENCES / ON DELETE CASCADE ishlashi uchun (SQLite'da standart o'chiq!)
  runMigrations(conn, migrations) // Jadvallarni yaratamiz / yangilaymiz
  return conn
}

// Ilova ishga tushganda bir marta chaqiriladi
export function initDatabase(filePath: string): Database.Database {
  if (!db) db = openDatabase(filePath)
  return db
}

// Model fayllari shu orqali ulanishni oladi
export function getDb(): Database.Database {
  if (!db) throw new Error('Database is not initialized. Call initDatabase() first.')
  return db
}

// Ilova yopilayotganda ulanishni yopamiz
export function closeDatabase(): void {
  db?.close()
  db = null
}
