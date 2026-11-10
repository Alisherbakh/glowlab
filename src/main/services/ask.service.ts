import { z } from 'zod'
import { MAX_QUESTION_LENGTH, type AskResult, type AskSource } from '../../shared/ask'
import { ASK_RESPONSE_SCHEMA, buildAskPrompt } from '../ai/askPrompt'
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  embedTexts,
  generateJsonFromText
} from '../ai/gemini'
import { getApiKey } from '../ai/keyStore'
import type { KbChunkRow } from '../models/kb.model'
import { getProfile } from './profile.service'
import { getSettings } from './settings.service'
import { isVectorAvailable, keywordSearch, semanticSearch, type Embedder } from './kb.service'

const TOP_K = 4 // Modelga beriladigan parchalar soni
// Cosine masofa chegarasi (0 = bir xil ma'no). Mac'dagi haqiqiy o'lchovlar: mos savollar 0.27–0.35,
// aloqasiz savol ("Fransiya poytaxti") ≥ 0.53. Undan uzoq parchalar ko'rsatilmaydi va Gemini'ga yuborilmaydi
export const MAX_DISTANCE = 0.45
const SNIPPET_LENGTH = 220

export const geminiEmbedder: Embedder = {
  model: EMBEDDING_MODEL,
  dimensions: EMBEDDING_DIMENSIONS,
  embed: embedTexts
}

const questionSchema = z.string().trim().min(2).max(MAX_QUESTION_LENGTH)

// AI javobi — ishonmaymiz, tekshiramiz
const responseSchema = z.object({
  answerable: z.boolean(),
  answer: z.string().trim().max(3000),
  citations: z.array(z.number().int()).max(20)
})

function snippet(text: string): string {
  if (text.length <= SNIPPET_LENGTH) return text
  const cut = text.slice(0, SNIPPET_LENGTH)
  return cut.slice(0, cut.lastIndexOf(' ')) + '…'
}

function toSources(chunks: KbChunkRow[]): AskSource[] {
  return chunks.map((c, i) => ({
    n: i + 1,
    id: c.id,
    title: c.title,
    sourceTitle: c.source,
    url: c.url,
    snippet: snippet(c.text)
  }))
}

// Javob matnidagi [n] havolalar
function citedInText(answer: string): number[] {
  return [...answer.matchAll(/\[(\d{1,2})\]/g)].map((m) => Number(m[1]))
}

// Tashqi bog'liqliklar (testda soxtasi beriladi)
export type AskDeps = {
  embedder: Embedder
  generate: typeof generateJsonFromText
  hasKey: () => boolean
  maxDistance: number
}

const defaultDeps: AskDeps = {
  embedder: geminiEmbedder,
  generate: generateJsonFromText,
  hasKey: () => getApiKey() !== null,
  maxDistance: MAX_DISTANCE
}

export async function askQuestion(input: unknown, deps: AskDeps = defaultDeps): Promise<AskResult> {
  const { embedder, generate, hasKey, maxDistance } = deps
  const parsed = questionSchema.safeParse(input)
  if (!parsed.success) return { status: 'error', code: 'bad_question' }
  const question = parsed.data

  // 1) Kalit yo'q → faqat oflayn qidiruv (savol kompyuterdan chiqmaydi)
  if (!hasKey()) {
    return {
      status: 'offline',
      reason: 'no_key',
      sources: toSources(keywordSearch(question, TOP_K))
    }
  }

  // 2) Qidiruv: semantik (sqlite-vec) yoki kengaytma bo'lmasa kalit so'z (FTS5)
  let chunks: KbChunkRow[]
  let mode: 'semantic' | 'keyword'
  if (isVectorAvailable()) {
    const sem = await semanticSearch(embedder, question, TOP_K)
    if (!sem.ok) {
      return {
        status: 'offline',
        reason: sem.code,
        sources: toSources(keywordSearch(question, TOP_K))
      }
    }
    if (import.meta.env.DEV) {
      console.log(
        '[ask] distances',
        sem.hits.map((h) => `${h.chunk.slug}:${h.distance.toFixed(3)}`).join(' ')
      )
    }
    chunks = sem.hits.filter((h) => h.distance <= maxDistance).map((h) => h.chunk)
    mode = 'semantic'
  } else {
    chunks = keywordSearch(question, TOP_K)
    mode = 'keyword'
  }
  if (chunks.length === 0) return { status: 'not_found', sources: [], mode }

  // 3) Gemini faqat shu parchalar asosida javob yozadi
  const sources = toSources(chunks)
  const prompt = buildAskPrompt(
    question,
    sources.map((s, i) => ({ n: s.n, title: s.title, text: chunks[i].text })),
    getSettings().language,
    getProfile()
  )
  const result = await generate(prompt, ASK_RESPONSE_SCHEMA)
  if (!result.ok) return { status: 'offline', reason: result.code, sources }

  let json: unknown
  try {
    json = JSON.parse(result.text)
  } catch {
    return { status: 'error', code: 'unknown' }
  }
  const data = responseSchema.safeParse(json)
  if (!data.success) return { status: 'error', code: 'unknown' }

  // 4) Manbaga tayanmagan javob ko'rsatilmaydi: kamida bitta haqiqiy havola bo'lishi shart
  const valid = new Set(sources.map((s) => s.n))
  const cited = new Set(
    [...data.data.citations, ...citedInText(data.data.answer)].filter((n) => valid.has(n))
  )
  if (!data.data.answerable || data.data.answer === '' || cited.size === 0) {
    return { status: 'not_found', sources: [], mode }
  }
  // Mavjud bo'lmagan [n] havolalar matndan olib tashlanadi
  const answer = data.data.answer.replace(/\s?\[(\d{1,2})\]/g, (m, n: string) =>
    valid.has(Number(n)) ? m : ''
  )
  return {
    status: 'answer',
    answer,
    sources: sources.filter((s) => cited.has(s.n)),
    mode
  }
}
