import { ipcMain } from 'electron'
import type { Routines } from '../../shared/routine'
import { getRoutines, saveRoutine } from '../services/routine.service'

// "routines:*" kanallari
export function registerRoutinesIpc(): void {
  ipcMain.handle('routines:get', (): Routines => getRoutines())
  ipcMain.handle('routines:save', (_e, slot: unknown, productIds: unknown): Routines =>
    saveRoutine(slot, productIds)
  )
}
