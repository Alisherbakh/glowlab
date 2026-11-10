import { ipcMain } from 'electron'
import type { DiaryEntry } from '../../shared/diary'
import {
  createDiaryEntry,
  editDiaryEntry,
  listDiary,
  removeDiaryEntry
} from '../services/diary.service'

// "diary:*" kanallari
export function registerDiaryIpc(): void {
  ipcMain.handle('diary:list', (): DiaryEntry[] => listDiary())
  ipcMain.handle('diary:create', (_e, input: unknown): DiaryEntry => createDiaryEntry(input))
  ipcMain.handle('diary:update', (_e, id: unknown, input: unknown): DiaryEntry =>
    editDiaryEntry(id, input)
  )
  ipcMain.handle('diary:delete', (_e, id: unknown): void => removeDiaryEntry(id))
}
