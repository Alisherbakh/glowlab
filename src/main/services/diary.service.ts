import { z } from 'zod'
import {
  DIARY_TAGS,
  FEELING_MAX,
  FEELING_MIN,
  MAX_NOTE_LENGTH,
  type DiaryEntry,
  type DiaryTag
} from '../../shared/diary'
import { isValidDate, todayLocal } from '../../shared/products'
import {
  deleteDiaryEntryById,
  findDiaryEntries,
  findDiaryEntryById,
  insertDiaryEntry,
  updateDiaryEntry,
  type DiaryRow
} from '../models/diary.model'
import { findFaceScanById } from '../models/faceScan.model'

const idSchema = z.number().int().positive()

// Renderer'dan keladigan yozuv — har doim tekshiriladi
const inputSchema = z
  .object({
    entryDate: z
      .string()
      .refine(isValidDate, 'Invalid date')
      .refine((d) => d <= todayLocal(), 'Date is in the future'),
    feeling: z.number().int().min(FEELING_MIN).max(FEELING_MAX).nullable(),
    tags: z
      .array(z.enum(DIARY_TAGS))
      .max(DIARY_TAGS.length)
      .transform((t) => [...new Set(t)]), // Takrorlar olib tashlanadi
    note: z.string().trim().max(MAX_NOTE_LENGTH),
    faceScanId: idSchema.nullable()
  })
  .strict()
  .refine((v) => v.note !== '' || v.feeling !== null || v.tags.length > 0, 'Entry is empty')
  .refine(
    (v) => v.faceScanId === null || findFaceScanById(v.faceScanId) !== undefined,
    'Scan not found'
  )

const tagsSchema = z.array(z.enum(DIARY_TAGS)).catch([])

function toEntry(row: DiaryRow): DiaryEntry {
  let tags: DiaryTag[]
  try {
    tags = tagsSchema.parse(JSON.parse(row.tags ?? '[]'))
  } catch {
    tags = [] // Buzilgan JSON → bo'sh ro'yxat (ilova yiqilmaydi)
  }
  return {
    id: row.id,
    entryDate: row.entry_date ?? row.created_at.slice(0, 10),
    feeling: row.feeling,
    tags,
    note: row.note ?? '',
    faceScanId: row.face_scan_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function toWrite(input: z.infer<typeof inputSchema>): {
  entryDate: string
  feeling: number | null
  tags: string
  note: string
  faceScanId: number | null
} {
  return { ...input, tags: JSON.stringify(input.tags) }
}

export function listDiary(): DiaryEntry[] {
  return findDiaryEntries().map(toEntry)
}

export function createDiaryEntry(input: unknown): DiaryEntry {
  const data = inputSchema.parse(input)
  const id = insertDiaryEntry(toWrite(data))
  return toEntry(findDiaryEntryById(id)!)
}

export function editDiaryEntry(id: unknown, input: unknown): DiaryEntry {
  const entryId = idSchema.parse(id)
  const data = inputSchema.parse(input)
  if (!updateDiaryEntry(entryId, toWrite(data))) throw new Error('Diary entry not found')
  return toEntry(findDiaryEntryById(entryId)!)
}

export function removeDiaryEntry(id: unknown): void {
  deleteDiaryEntryById(idSchema.parse(id))
}
