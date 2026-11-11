import { ipcMain } from 'electron'
import type { AskResult, KbStatus } from '../../shared/ask'
import { askQuestion, localEmbedder } from '../services/ask.service'
import { getKbStatus } from '../services/kb.service'

// "ask:*" kanallari — RAG chatbot
export function registerAskIpc(): void {
  ipcMain.handle('ask:question', (_e, question: unknown): Promise<AskResult> =>
    askQuestion(question)
  )
  ipcMain.handle('ask:status', (): KbStatus => getKbStatus(localEmbedder))
}
