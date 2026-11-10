import { safeStorage } from 'electron'
import { getDb } from '../db/connection'
import { upsertSetting } from '../models/settings.model'

// Gemini API kaliti: 1) .env (dev) yoki 2) Sozlamalardan kiritilgan, macOS Keychain bilan shifrlangan

const SETTING_KEY = 'gemini_key_enc' // settings jadvalidagi kalit nomi (qiymat shifrlangan, base64)

export function getApiKey(): { key: string; source: 'env' | 'settings' } | null {
  const fromEnv = process.env['GEMINI_API_KEY']?.trim()
  if (fromEnv) return { key: fromEnv, source: 'env' } // Dev rejim: .env fayldan

  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(SETTING_KEY) as
    { value: string } | undefined
  if (!row || !safeStorage.isEncryptionAvailable()) return null
  try {
    const key = safeStorage.decryptString(Buffer.from(row.value, 'base64')) // Shifrdan ochamiz
    return key ? { key, source: 'settings' } : null
  } catch {
    return null // Boshqa kompyuterdan ko'chirilgan bo'lsa ochilmaydi
  }
}

// Kalitni saqlaydi (null → o'chiradi). Kalit hech qachon renderer'ga qaytarilmaydi
export function setApiKey(key: string | null): void {
  if (key === null) {
    getDb().prepare('DELETE FROM settings WHERE key = ?').run(SETTING_KEY)
    return
  }
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Encryption is not available')
  const encrypted = safeStorage.encryptString(key).toString('base64') // Ochiq matn bazaga yozilmaydi
  upsertSetting(SETTING_KEY, encrypted)
}

export function getModelName(): string {
  return process.env['GEMINI_MODEL']?.trim() || 'gemini-3.8-flash' // .env orqali almashtirish mumkin
}
