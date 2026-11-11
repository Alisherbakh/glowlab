import { getDb } from '../db/connection'

// Bilim bazasi (kb_chunks, kb_fts, kb_meta) bilan ishlovchi SQL funksiyalar

export type KbChunkRow = {
  id: number
  slug: string
  title: string
  text: string
  source: string // Manba nomi
  url: string
}

export type KbChunkInput = Omit<KbChunkRow, 'id'> & { altTitles: string[] } // Tarjima sarlavhalar (uz, ko)

export function getKbMeta(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM kb_meta WHERE key = ?').get(key) as
    { value: string } | undefined
  return row?.value ?? null
}

export function setKbMeta(key: string, value: string): void {
  getDb()
    .prepare(
      'INSERT INTO kb_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value'
    )
    .run(key, value)
}

export function deleteKbMeta(key: string): void {
  getDb().prepare('DELETE FROM kb_meta WHERE key = ?').run(key)
}

// Bilim bazasini to'liq almashtiradi va FTS indeksini qayta quradi (bitta tranzaksiya)
export function replaceKbChunks(chunks: KbChunkInput[]): void {
  const db = getDb()
  const insert = db.prepare(
    'INSERT INTO kb_chunks (slug, title, text, source, url, alt_titles) VALUES (@slug, @title, @text, @source, @url, @altTitles)'
  )
  db.transaction(() => {
    db.prepare('DELETE FROM kb_chunks').run()
    for (const c of chunks) insert.run({ ...c, altTitles: JSON.stringify(c.altTitles) })
    db.prepare("INSERT INTO kb_fts (kb_fts) VALUES ('rebuild')").run() // Indeks kb_chunks'dan qayta yig'iladi
  })()
}

export function countKbChunks(): number {
  return (getDb().prepare('SELECT COUNT(*) AS n FROM kb_chunks').get() as { n: number }).n
}

// Embedding uchun: bo'lak id, sarlavhalar va matn (alt_titles — JSON massiv, kb.service yozadi)
export function findKbChunksForEmbedding(): {
  id: number
  title: string
  altTitles: string[]
  text: string
}[] {
  const rows = getDb()
    .prepare('SELECT id, title, alt_titles, text FROM kb_chunks ORDER BY id')
    .all() as { id: number; title: string; alt_titles: string; text: string }[]
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    altTitles: parseTitles(r.alt_titles),
    text: r.text
  }))
}

// Buzilgan JSON bo'lsa — tarjimasiz davom etamiz (faqat asosiy sarlavha)
function parseTitles(raw: string): string[] {
  try {
    const v: unknown = JSON.parse(raw)
    return Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string' && t !== '') : []
  } catch {
    return []
  }
}

export function findKbChunkById(id: number): KbChunkRow | undefined {
  return getDb()
    .prepare('SELECT id, slug, title, text, source, url FROM kb_chunks WHERE id = ?')
    .get(id) as KbChunkRow | undefined
}

// FTS5 kalit so'z qidiruvi. ftsQuery tayyorlangan bo'lishi shart (service tozalaydi)
export function searchKbFts(ftsQuery: string, limit: number): KbChunkRow[] {
  return getDb()
    .prepare(
      `SELECT c.id, c.slug, c.title, c.text, c.source, c.url
       FROM kb_fts JOIN kb_chunks c ON c.id = kb_fts.rowid
       WHERE kb_fts MATCH ?
       ORDER BY bm25(kb_fts, 2.0, 1.0)
       LIMIT ?`
    )
    .all(ftsQuery, limit) as KbChunkRow[]
}

// slug ro'yxati bo'yicha bo'laklar (moslik tekshiruvi manbalari)
export function findKbChunksBySlugs(slugs: string[]): KbChunkRow[] {
  if (slugs.length === 0) return []
  const marks = slugs.map(() => '?').join(', ')
  return getDb()
    .prepare(`SELECT id, slug, title, text, source, url FROM kb_chunks WHERE slug IN (${marks})`)
    .all(...slugs) as KbChunkRow[]
}

// Takrorlanmaydigan manba sahifalari soni
export function countKbSources(): number {
  return (getDb().prepare('SELECT COUNT(DISTINCT url) AS n FROM kb_chunks').get() as { n: number })
    .n
}
