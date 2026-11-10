import { ipcMain } from 'electron'
import type { DbInfo, PingResult } from '../../shared/types'
import { getDb } from '../db/connection'

// "app:*" kanallari — ilovaning umumiy (test, holat) handlerlari
export function registerAppIpc(): void {
  // app:ping → IPC ishlayotganini tekshirish
  ipcMain.handle('app:ping', (): PingResult => {
    return { message: 'pong', time: new Date().toISOString() }
  })

  // app:dbInfo → baza versiyasi, manzili va jadvallari
  ipcMain.handle('app:dbInfo', (): DbInfo => {
    const db = getDb()
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      ) // Ichki sqlite_* jadvallarsiz
      .all() as { name: string }[]
    return {
      version: db.pragma('user_version', { simple: true }) as number,
      path: db.name, // Ochilgan fayl yo'li
      tables: tables.map((t) => t.name)
    }
  })
}
