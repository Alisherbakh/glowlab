import type Database from 'better-sqlite3'

// sqlite-vec: SQLite ichidagi vektor bazasi (vec0 virtual jadvali, KNN qidiruv)
// Barcha funksiyalar db'ni parametr sifatida oladi → Electron'siz test qilinadi

const TABLE = 'vec_kb'

// Float32Array → BLOB (view bo'lsa ham faqat o'z baytlari olinadi)
function toBlob(v: Float32Array): Buffer {
  return Buffer.from(v.buffer, v.byteOffset, v.byteLength)
}

// Kengaytma faylini yuklaydi. Muvaffaqiyatsiz bo'lsa false (ilova oflayn FTS5 qidiruv bilan ishlaydi)
export function loadVectorExtension(db: Database.Database, loadablePath: string): boolean {
  try {
    db.loadExtension(loadablePath)
    db.prepare('SELECT vec_version()').get() // Haqiqatan yuklanganini tekshiramiz
    return true
  } catch (err) {
    console.warn('[kb] sqlite-vec yuklanmadi:', err instanceof Error ? err.message : err)
    return false
  }
}

// Build'da .dylib asar ichidan yuklanmaydi → asarUnpack qilingan nusxa yo'li
export function unpackedPath(path: string): string {
  return path.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1')
}

// Vektor jadvalini qayta yaratadi (o'lcham yoki model o'zgarganda eski vektorlar o'chadi)
export function recreateVectorTable(db: Database.Database, dimensions: number): void {
  const dim = Math.trunc(dimensions)
  if (dim <= 0 || dim > 4096) throw new Error('Invalid embedding dimension')
  db.exec(`DROP TABLE IF EXISTS ${TABLE}`)
  db.exec(
    // chunk_id — metadata ustun (PRIMARY KEY emas): bitta bo'lakka bir nechta vektor (en / uz / ko sarlavha)
    `CREATE VIRTUAL TABLE ${TABLE} USING vec0(chunk_id INTEGER, embedding float[${dim}] distance_metric=cosine)`
  )
}

export function vectorTableExists(db: Database.Database): boolean {
  return (
    db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(TABLE) !==
    undefined
  )
}

export function countVectors(db: Database.Database): number {
  if (!vectorTableExists(db)) return 0
  return (db.prepare(`SELECT COUNT(*) AS n FROM ${TABLE}`).get() as { n: number }).n
}

// Vektorlarni bitta tranzaksiyada yozadi
export function insertVectors(
  db: Database.Database,
  rows: { chunkId: number; vector: Float32Array }[]
): void {
  const stmt = db.prepare(`INSERT INTO ${TABLE} (chunk_id, embedding) VALUES (?, ?)`)
  db.transaction(() => {
    for (const r of rows) stmt.run(BigInt(r.chunkId), toBlob(r.vector)) // vec0 id → BigInt
  })()
}

const MAX_KNN = 4096 // sqlite-vec KNN chegarasi

// Eng yaqin k ta bo'lak (takrorlanmaydi). distance = 1 − cosine o'xshashlik (0 = bir xil ma'no).
// Bo'lakning bir nechta vektori bor → hamma vektor olinadi va har bo'lakning eng yaqini qoldiriladi
export function searchVectors(
  db: Database.Database,
  query: Float32Array,
  k: number
): { chunkId: number; distance: number }[] {
  const n = Math.min(countVectors(db), MAX_KNN)
  if (n === 0) return []
  const rows = db
    .prepare(
      `SELECT chunk_id, distance FROM ${TABLE} WHERE embedding MATCH ? AND k = ? ORDER BY distance`
    )
    .all(toBlob(query), n) as { chunk_id: number; distance: number }[]
  const seen = new Set<number>()
  const out: { chunkId: number; distance: number }[] = []
  for (const r of rows) {
    const chunkId = Number(r.chunk_id)
    if (seen.has(chunkId)) continue // Tartib o'sish bo'yicha → birinchisi eng yaqini
    seen.add(chunkId)
    out.push({ chunkId, distance: r.distance })
    if (out.length >= Math.trunc(k)) break
  }
  return out
}
