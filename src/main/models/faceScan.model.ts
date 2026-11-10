import { getDb } from '../db/connection'

// face_scans — faqat SQL (rasm emas, faqat o'lchovlar)

export type FaceScanRow = {
  id: number
  quality_score: number
  oiliness: number | null
  redness: number | null
  texture: number | null
  spots: number | null
  dark_circles: number | null
  evenness: number | null
  age_range: string | null
  skin_type: string | null
  source: string | null
  created_at: string
}

export type FaceScanInsert = {
  qualityScore: number
  oiliness: number
  redness: number
  texture: number
  spots: number
  darkCircles: number
  evenness: number
  ageRange: string
  skinType: string
  source: string
}

const COLUMNS = `id, quality_score, oiliness, redness, texture, spots, dark_circles, evenness,
  age_range, skin_type, source, created_at`

export function insertFaceScan(s: FaceScanInsert): number {
  const info = getDb()
    .prepare(
      `INSERT INTO face_scans (photo_path, quality_score, oiliness, redness, texture, spots, dark_circles,
         evenness, age_range, skin_type, source)
       VALUES ('', @qualityScore, @oiliness, @redness, @texture, @spots, @darkCircles,
         @evenness, @ageRange, @skinType, @source)`
    )
    .run(s)
  return Number(info.lastInsertRowid)
}

export function findFaceScanById(id: number): FaceScanRow | undefined {
  return getDb().prepare(`SELECT ${COLUMNS} FROM face_scans WHERE id = ?`).get(id) as
    FaceScanRow | undefined
}

// Eng yangilari birinchi
export function findRecentFaceScans(limit: number): FaceScanRow[] {
  return getDb()
    .prepare(`SELECT ${COLUMNS} FROM face_scans ORDER BY created_at DESC, id DESC LIMIT ?`)
    .all(limit) as FaceScanRow[]
}

export function deleteFaceScanById(id: number): boolean {
  return getDb().prepare('DELETE FROM face_scans WHERE id = ?').run(id).changes > 0
}
