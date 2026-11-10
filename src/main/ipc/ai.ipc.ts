import { ipcMain } from 'electron'
import { z } from 'zod'
import type { AiKeyStatus, AnalyzeLabelResult, SavedAnalysis } from '../../shared/analysis'
import type { ClassifyResult } from '../../shared/classifier'
import { getApiKey, getModelName, setApiKey } from '../ai/keyStore'
import { analyzeLabel, getLatestAnalysis } from '../services/analysis.service'
import { classifyProduct } from '../services/classifier.service'

// "ai:*" kanallari
export function registerAiIpc(): void {
  ipcMain.handle('ai:analyzeLabel', (_e, input: unknown): Promise<AnalyzeLabelResult> =>
    analyzeLabel(input)
  )
  // Oflayn model: rasm kompyuterdan chiqmaydi
  ipcMain.handle('ai:classifyProduct', (_e, rgb: unknown): Promise<ClassifyResult> =>
    classifyProduct(rgb)
  )
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
