import init001 from './001_init.sql?raw'
import faceScan002 from './002_face_scan_details.sql?raw'

// Bitta migratsiya: version → user_version qiymati, sql → bajariladigan SQL matn
export type Migration = {
  version: number
  name: string
  sql: string
}

// Barcha migratsiyalar tartib bilan. Yangisi faqat oxiriga qo'shiladi, eskisi o'zgartirilmaydi!
export const migrations: Migration[] = [
  { version: 1, name: '001_init', sql: init001 },
  { version: 2, name: '002_face_scan_details', sql: faceScan002 }
]
