import { ipcMain } from 'electron'
import type { AppSettings } from '../../shared/settings'
import { getSettings, updateSettings } from '../services/settings.service'

// "settings:*" kanallari
export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get', (): AppSettings => getSettings()) // Hozirgi sozlamalar
  ipcMain.handle('settings:set', (_event, patch: unknown): AppSettings => updateSettings(patch)) // Tekshirib saqlaydi
}
