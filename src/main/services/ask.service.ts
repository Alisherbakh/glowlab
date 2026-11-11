import { z } from 'zod'
import { MAX_QUESTION_LENGTH, type AskResult, type AskSource } from '../../shared/ask'
import { ASK_RESPONSE_SCHEMA, buildAskPrompt } from '../ai/askPrompt'
import { generateJsonFromText } from '../ai/gemini'
import { getApiKey } from '../ai/keyStore'
import {
  LOCAL_EMBEDDING_DIMENSIONS,
  LOCAL_EMBEDDING_MODEL,
  embedTextsLocal
} from '../ai/localEmbedder'
import { selectRelevant } from '../ai/relevance'
import type { KbChunkRow } from '../models/kb.model'
import { getProfile } from './profile.service'
import { getSettings } from './settings.service'
import { isVectorAvailable, keywordSearch, semanticSearch, type Embedder } from './kb.service'

export const TOP_K = 4 // Modelga beriladigan parchalar soni
// multilingual-e5-base o'lchovi (scripts/eval-embeddings.mjs --set all --multi, 52 mos + 12 aloqasiz savol en/uz/ko):
// har bo'lakda en / uz / ko sarlavhali 3 ta vektor, bo'lak masofasi = eng yaqini.
// Faqat masofa bilan ajratib bo'lmaydi (mos 0.095–0.259, aloqasiz 0.230–0.302) → asosiy filtr — nisbiy farq
// (MIN_MARGIN, ai/relevance.ts): mos 51/52 o'tadi, aloqasiz 6/12 rad etiladi (sarlavhalarsiz, 0.023 bilan: 48/52 va 4/12).
// Ikkinchi himoya: Gemini "answerable: false" tekshiruvi. MAX_DISTANCE — faqat yuqori chegara
export const MAX_DISTANCE = 0.35
export const MIN_MARGIN = 0.026
const SCAN_K = 64 // Mediana uchun ko'p bo'lak olinadi (bilim bazasi 26 ta → hammasi)
const SNIPPET_LENGTH = 220

// Oflayn embedding (Node ichida): savol Google'ga embedding uchun yuborilmaydi, kalitsiz ham ishlaydi
export const localEmbedder: Embedder = {
  model: LOCAL_EMBEDDING_MODEL,
  dimensions: LOCAL_EMBEDDING_DIMENSIONS,
  embed: embedTextsLocal
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
  minMargin: number
}

const defaultDeps: AskDeps = {
  embedder: localEmbedder,
  generate: generateJsonFromText,
  hasKey: () => getApiKey() !== null,
  maxDistance: MAX_DISTANCE,
  minMargin: MIN_MARGIN
}

export async function askQuestion(input: unknown, deps: AskDeps = defaultDeps): Promise<AskResult> {
  const { embedder, generate, hasKey, maxDistance, minMargin } = deps
  const parsed = questionSchema.safeParse(input)
  if (!parsed.success) return { status: 'error', code: 'bad_question' }
  const question = parsed.data

  // 1) Qidiruv: semantik (lokal embedding + sqlite-vec) yoki kengaytma bo'lmasa kalit so'z (FTS5).
  // Ikkalasi ham kompyuterning o'zida ishlaydi — savol hali hech qayerga yuborilmagan
  let chunks: KbChunkRow[] = []
  let mode: 'semantic' | 'keyword' = 'keyword'
  const sem = isVectorAvailable() ? await semanticSearch(embedder, question, SCAN_K) : null
  if (sem?.ok) {
    const picked = selectRelevant(sem.hits, { topK: TOP_K, maxDistance, minMargin })
    if (import.meta.env.DEV) {
      console.log(
        `[ask] margin ${picked.margin.toFixed(3)} · distances`,
        sem.hits
          .slice(0, TOP_K)
          .map((h) => `${h.chunk.slug}:${h.distance.toFixed(3)}`)
          .join(' ')
      )
    }
    chunks = picked.chunks
    mode = 'semantic'
  } else {
    // Kengaytma yoki lokal model yo'q (yarn fetch:models) → kalit so'z qidiruvi bilan davom etamiz
    chunks = keywordSearch(question, TOP_K)
  }

  // 2) Kalit yo'q → topilgan parchalarning o'zi ko'rsatiladi (yozma javobsiz, savol kompyuterdan chiqmaydi)
  if (!hasKey()) return { status: 'offline', reason: 'no_key', sources: toSources(chunks) }
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
