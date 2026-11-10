import init001 from './001_init.sql?raw'

// Bitta migratsiya: version → user_version qiymati, sql → bajariladigan SQL matn
export type Migration = {
  version: number
  name: string
  sql: string
}

// Barcha migratsiyalar tartib bilan. Yangisi faqat oxiriga qo'shiladi, eskisi o'zgartirilmaydi!
export const migrations: Migration[] = [{ version: 1, name: '001_init', sql: init001 }]
