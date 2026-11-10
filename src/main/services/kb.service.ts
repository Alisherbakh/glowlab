import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { z } from 'zod'
import type { AnalyzeErrorCode } from '../../shared/analysis'
import type { KbStatus } from '../../shared/ask'
import { getDb } from '../db/connection'
import { buildFtsQuery } from '../ai/ftsQuery'
import { normalize } from '../ai/vectorMath'
import {
  countVectors,
  insertVectors,
  loadVectorExtension,
  recreateVectorTable,
  searchVectors,
  vectorTableExists
} from '../ai/vectorStore'
import {
  countKbChunks,
  deleteKbMeta,
  findAllKbChunks,
  findKbChunkById,
  getKbMeta,
  replaceKbChunks,
  searchKbFts,
  setKbMeta,
  type KbChunkRow
} from '../models/kb.model'

// Bilim bazasi: kb.json → SQLite (matn + FTS5) → vektorlar (sqlite-vec)

// Embedding funksiyasi tashqaridan beriladi (Gemini yoki testda soxta embedder)
export type Embedder = {
  model: string
  dimensions: number
  embed: (
    texts: string[],
    task: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'
  ) => Promise<{ ok: true; vectors: number[][] } | { ok: false; code: AnalyzeErrorCode }>
}

const kbFileSchema = z.object({
  version: z.number().int(),
  chunks: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        title: z.string().min(1).max(200),
        text: z.string().min(1).max(3000),
        sourceTitle: z.string().min(1).max(200),
        url: z.url({ protocol: /^https$/ }) // Faqat https manbalar
      })
    )
    .min(1)
})

let vectorAvailable = false
let embedding: Promise<{ ok: true } | { ok: false; code: AnalyzeErrorCode }> | null = null

// Ilova ishga tushganda: kengaytmani yuklaydi va kb.json o'zgargan bo'lsa bazani yangilaydi
export function initKb(options: { kbJsonPath: string; vecPath: string | null }): void {
  vectorAvailable = options.vecPath ? loadVectorExtension(getDb(), options.vecPath) : false

  const raw = readFileSync(options.kbJsonPath, 'utf8')
  const hash = createHash('sha256').update(raw).digest('hex')
  if (getKbMeta('kb_hash') === hash && countKbChunks() > 0) return // O'zgarmagan

  const file = kbFileSchema.parse(JSON.parse(raw))
  replaceKbChunks(
    file.chunks.map((c) => ({
      slug: c.id,
      title: c.title,
      text: c.text,
      source: c.sourceTitle,
      url: c.url
    }))
  )
  // Bo'laklar yangilandi → eski vektorlar endi to'g'ri emas
  if (vectorAvailable) getDb().exec('DROP TABLE IF EXISTS vec_kb')
  deleteKbMeta('embed_model')
  setKbMeta('kb_hash', hash)
  console.log(`[kb] bilim bazasi yangilandi: ${file.chunks.length} ta bo'lak`)
}

export function isVectorAvailable(): boolean {
  return vectorAvailable
}

function vectorsReady(embedder: Pick<Embedder, 'model' | 'dimensions'>): boolean {
  return (
    vectorAvailable &&
    vectorTableExists(getDb()) &&
    getKbMeta('embed_model') === `${embedder.model}:${embedder.dimensions}` &&
    countVectors(getDb()) === countKbChunks()
  )
}

export function getKbStatus(embedder: Pick<Embedder, 'model' | 'dimensions'>): KbStatus {
  return {
    chunks: countKbChunks(),
    vectorAvailable,
    vectorReady: vectorsReady(embedder)
  }
}

// Bo'laklar vektorlarini bir marta hisoblaydi (bir vaqtda faqat bitta jarayon)
export function ensureEmbeddings(
  embedder: Embedder
): Promise<{ ok: true } | { ok: false; code: AnalyzeErrorCode }> {
  if (vectorsReady(embedder)) return Promise.resolve({ ok: true })
  if (!embedding) {
    embedding = (async () => {
      const chunks = findAllKbChunks()
      const result = await embedder.embed(
        chunks.map((c) => `${c.title}\n${c.text}`),
        'RETRIEVAL_DOCUMENT'
      )
      if (!result.ok) return result
      const db = getDb()
      db.transaction(() => {
        recreateVectorTable(db, embedder.dimensions)
        insertVectors(
          db,
          chunks.map((c, i) => ({ chunkId: c.id, vector: normalize(result.vectors[i]) }))
        )
        setKbMeta('embed_model', `${embedder.model}:${embedder.dimensions}`)
      })()
      console.log(`[kb] ${chunks.length} ta bo'lak vektorlari saqlandi`)
      return { ok: true as const }
    })().finally(() => {
      embedding = null
    })
  }
  return embedding
}

// Semantik qidiruv: savol vektori → eng yaqin bo'laklar (cosine)
export async function semanticSearch(
  embedder: Embedder,
  question: string,
  k: number
): Promise<
  | { ok: true; hits: { chunk: KbChunkRow; distance: number }[] }
  | { ok: false; code: AnalyzeErrorCode }
> {
  const ready = await ensureEmbeddings(embedder)
  if (!ready.ok) return ready
  const q = await embedder.embed([question], 'RETRIEVAL_QUERY')
  if (!q.ok) return q
  const hits = searchVectors(getDb(), normalize(q.vectors[0]), k)
    .map((h) => ({ chunk: findKbChunkById(h.chunkId), distance: h.distance }))
    .filter((h): h is { chunk: KbChunkRow; distance: number } => h.chunk !== undefined)
  return { ok: true, hits }
}

// Oflayn kalit so'z qidiruvi (FTS5, BM25 tartib)
export function keywordSearch(question: string, k: number): KbChunkRow[] {
  const query = buildFtsQuery(question)
  return query ? searchKbFts(query, k) : []
}
