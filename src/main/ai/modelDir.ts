import { app } from 'electron'
import { join } from 'path'

// Model fayllari papkasi: dev → loyiha/resources/models; build → asar'dan chiqarilgan (asarUnpack) papka
export function getModelDir(): string {
  const dir = join(app.getAppPath(), 'resources', 'models')
  return app.isPackaged ? dir.replace('app.asar', 'app.asar.unpacked') : dir
}

// Bilim bazasi (kb.json) papkasi — resources/** ham asarUnpack qilingan
export function getKbDir(): string {
  const dir = join(app.getAppPath(), 'resources', 'kb')
  return app.isPackaged ? dir.replace('app.asar', 'app.asar.unpacked') : dir
}
