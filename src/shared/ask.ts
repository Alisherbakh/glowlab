// "GlowLab'dan so'rang" (RAG): main + renderer umumiy turlar
import type { AnalyzeErrorCode } from './analysis'

export const MAX_QUESTION_LENGTH = 500 // Savol uzunligi chegarasi (belgi)

// Javobda ko'rsatiladigan manba (bilim bazasidan topilgan bo'lak)
export type AskSource = {
  n: number // Javobdagi havola raqami: [1], [2]...
  id: number // kb_chunks.id
  title: string // Bo'lak sarlavhasi
  sourceTitle: string // Manba nomi ("AAD: Face washing 101")
  url: string // Manba sahifasi
  snippet: string // Qisqa parcha (oflayn rejimda ko'rsatiladi)
}

// Qidiruv qanday bajarildi
export type SearchMode = 'semantic' | 'keyword'

export type AskResult =
  // Gemini faqat topilgan manbalar asosida javob berdi
  | { status: 'answer'; answer: string; sources: AskSource[]; mode: SearchMode }
  // Bilim bazasida bu savolga javob yo'q
  | { status: 'not_found'; sources: AskSource[]; mode: SearchMode }
  // AI ishlamadi (kalit yo'q, internet yo'q...) → faqat oflayn qidiruv natijalari
  | { status: 'offline'; reason: AnalyzeErrorCode; sources: AskSource[] }
  | { status: 'error'; code: 'bad_question' | 'unknown' }

export type KbStatus = {
  chunks: number // Bilim bazasidagi bo'laklar soni
  vectorReady: boolean // Vektorlar hisoblanganmi (semantik qidiruv tayyor)
  vectorAvailable: boolean // sqlite-vec kengaytmasi yuklandimi
}
