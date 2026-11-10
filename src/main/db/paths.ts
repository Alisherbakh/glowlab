import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'

// Ilova ma'lumotlari papkasi: macOS → ~/Library/Application Support/GlowLab
export function getDataPaths(): { dbFile: string; photosDir: string } {
  const base = app.getPath('userData')
  const photosDir = join(base, 'photos') // Rasmlar shu yerda saqlanadi (DB'da faqat yo'li)
  mkdirSync(photosDir, { recursive: true }) // Papka bo'lmasa yaratamiz
  return { dbFile: join(base, 'glowlab.db'), photosDir }
}
