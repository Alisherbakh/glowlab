import { ipcMain } from 'electron'
import type { FaceAnalysisResult, SavedFaceScan } from '../../shared/faceScan'
import {
  analyzeFace,
  deleteFaceScan,
  getFaceModelBytes,
  listFaceScans,
  saveFaceScan
} from '../services/faceScan.service'

// "face:*" kanallari — yuz rasmi kompyuterdan chiqmaydi, bazaga faqat raqamlar yoziladi
export function registerFaceIpc(): void {
  ipcMain.handle('face:modelBytes', (): Promise<Uint8Array | null> => getFaceModelBytes())
  ipcMain.handle('face:analyze', (_e, input: unknown): Promise<FaceAnalysisResult> =>
    analyzeFace(input)
  )
  ipcMain.handle('face:save', (_e, input: unknown): SavedFaceScan => saveFaceScan(input))
  ipcMain.handle('face:list', (): SavedFaceScan[] => listFaceScans())
  ipcMain.handle('face:delete', (_e, id: unknown): void => deleteFaceScan(id))
}
