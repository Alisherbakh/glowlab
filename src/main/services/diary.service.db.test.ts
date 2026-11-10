import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { todayLocal } from '../../shared/products'
import { closeDatabase, getDb, initDatabase } from '../db/connection'
import { createDiaryEntry, editDiaryEntry, listDiary, removeDiaryEntry } from './diary.service'

const base = {
  entryDate: '2026-11-01',
  feeling: 4,
  tags: ['calm'],
  note: 'Yaxshi kun',
  faceScanId: null
}

beforeEach(() => {
  initDatabase(':memory:')
})
afterEach(() => closeDatabase())

describe('diary.service', () => {
  it('yaratadi, takror teglarni olib tashlaydi, izohni qirqadi', () => {
    const e = createDiaryEntry({ ...base, tags: ['calm', 'calm', 'sun'], note: '  salom  ' })
    expect(e.tags).toEqual(['calm', 'sun'])
    expect(e.note).toBe('salom')
    expect(listDiary()).toHaveLength(1)
  })
  it.each([
    ['kelajakdagi sana', { entryDate: '2999-01-01' }],
    ["mavjud bo'lmagan sana", { entryDate: '2026-02-30' }],
    ["his-tuyg'u 6", { feeling: 6 }],
    ["noma'lum teg", { tags: ['happy'] }],
    ['1000 belgidan uzun izoh', { note: 'x'.repeat(1001) }],
    ["bo'sh yozuv", { feeling: null, tags: [], note: '' }],
    ["mavjud bo'lmagan skan", { faceScanId: 999 }],
    ['ortiqcha maydon', { extra: 1 }]
  ])('%s → rad etiladi', (_n, patch) => {
    expect(() => createDiaryEntry({ ...base, ...patch })).toThrow()
    expect(listDiary()).toHaveLength(0)
  })
  it('bugungi sana qabul qilinadi', () => {
    expect(createDiaryEntry({ ...base, entryDate: todayLocal() }).entryDate).toBe(todayLocal())
  })
  it("tahrirlash va o'chirish; yo'q yozuvni tahrirlash → xato", () => {
    const e = createDiaryEntry(base)
    expect(editDiaryEntry(e.id, { ...base, feeling: 2 }).feeling).toBe(2)
    expect(() => editDiaryEntry(999, base)).toThrow()
    removeDiaryEntry(e.id)
    expect(listDiary()).toHaveLength(0)
  })
  it("buzilgan teglar JSON → bo'sh ro'yxat (ilova yiqilmaydi)", () => {
    const e = createDiaryEntry(base)
    getDb().prepare("UPDATE diary_entries SET tags = '{bad' WHERE id = ?").run(e.id)
    expect(listDiary()[0].tags).toEqual([])
  })
})
