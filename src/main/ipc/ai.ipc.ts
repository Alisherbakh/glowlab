import { ipcMain } from 'electron'
import { z } from 'zod'
import type { AiKeyStatus, AnalyzeLabelResult, SavedAnalysis } from '../../shared/analysis'
import type { ClassifyResult } from '../../shared/classifier'
import type { CompatResult } from '../../shared/compatibility'
import type { LabInfo } from '../../shared/aiLab'
import { getApiKey, getModelName, setApiKey } from '../ai/keyStore'
import { analyzeLabel, getLatestAnalysis } from '../services/analysis.service'
import { classifyProduct } from '../services/classifier.service'
import { checkCompatibility } from '../services/compat.service'
import { getLabInfo } from '../services/lab.service'

// "ai:*" kanallari
export function registerAiIpc(): void {
  ipcMain.handle('ai:analyzeLabel', (_e, input: unknown): Promise<AnalyzeLabelResult> =>
    analyzeLabel(input)
  )
  // Oflayn model: rasm kompyuterdan chiqmaydi
  ipcMain.handle('ai:classifyProduct', (_e, rgb: unknown): Promise<ClassifyResult> =>
    classifyProduct(rgb)
  )
  // Tartib moslik tekshiruvi: qoidaga asoslangan, oflayn
  ipcMain.handle('ai:checkCompatibility', (): CompatResult => checkCompatibility())
  // AI Lab: modellar haqidagi ma'lumotlar (metrics.json, Grad-CAM, RAG holati)
  ipcMain.handle('ai:labInfo', (): LabInfo => getLabInfo())
  ipcMain.handle('ai:latestAnalysis', (_e, productId: unknown): SavedAnalysis | null =>
    getLatestAnalysis(productId)
  )

  // Kalit holati: kalitning o'zi emas, faqat bor/yo'qligi qaytadi
  ipcMain.handle('ai:keyStatus', (): AiKeyStatus => {
    const key = getApiKey()
    return { configured: key !== null, source: key?.source ?? null, model: getModelName() }
  })
  ipcMain.handle('ai:setKey', (_e, key: unknown): void => {
    const value = z.string().trim().min(20).max(200).nullable().parse(key) // Juda qisqa/uzun → rad
    setApiKey(value)
  })
}
