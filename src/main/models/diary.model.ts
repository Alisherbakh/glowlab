import { getDb } from '../db/connection'

// diary_entries — faqat SQL

export type DiaryRow = {
  id: number
  entry_date: string | null
  feeling: number | null
  tags: string | null
  note: string | null
  face_scan_id: number | null
  created_at: string
  updated_at: string | null
}

export type DiaryWrite = {
  entryDate: string
  feeling: number | null
  tags: string // JSON
  note: string
  faceScanId: number | null
}

const COLUMNS = 'id, entry_date, feeling, tags, note, face_scan_id, created_at, updated_at'

// Yangi sanalar birinchi; bir kunda — keyin yozilgani birinchi
export function findDiaryEntries(): DiaryRow[] {
  return getDb()
    .prepare(
      `SELECT ${COLUMNS} FROM diary_entries ORDER BY COALESCE(entry_date, date(created_at)) DESC, id DESC`
    )
    .all() as DiaryRow[]
}

export function findDiaryEntryById(id: number): DiaryRow | undefined {
  return getDb().prepare(`SELECT ${COLUMNS} FROM diary_entries WHERE id = ?`).get(id) as
    DiaryRow | undefined
}

export function insertDiaryEntry(e: DiaryWrite): number {
  const info = getDb()
    .prepare(
      `INSERT INTO diary_entries (entry_date, feeling, tags, note, face_scan_id)
       VALUES (@entryDate, @feeling, @tags, @note, @faceScanId)`
    )
    .run(e)
  return Number(info.lastInsertRowid)
}

export function updateDiaryEntry(id: number, e: DiaryWrite): boolean {
  return (
    getDb()
      .prepare(
        `UPDATE diary_entries SET entry_date = @entryDate, feeling = @feeling, tags = @tags,
           note = @note, face_scan_id = @faceScanId, updated_at = datetime('now')
         WHERE id = @id`
      )
      .run({ ...e, id }).changes > 0
  )
}

export function deleteDiaryEntryById(id: number): boolean {
  return getDb().prepare('DELETE FROM diary_entries WHERE id = ?').run(id).changes > 0
}
