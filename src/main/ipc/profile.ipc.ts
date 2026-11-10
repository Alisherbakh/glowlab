import { ipcMain } from 'electron'
import type { SkinProfile } from '../../shared/profile'
import { getProfile, saveProfile } from '../services/profile.service'

// "profile:*" kanallari
export function registerProfileIpc(): void {
  ipcMain.handle('profile:get', (): SkinProfile | null => getProfile()) // null → onboarding kerak
  ipcMain.handle('profile:save', (_event, input: unknown): SkinProfile => saveProfile(input)) // Tekshirib saqlaydi
}
