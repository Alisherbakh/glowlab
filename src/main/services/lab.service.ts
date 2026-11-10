import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { z } from 'zod'
import type { ClassifierMetrics, GradCamImage, LabInfo } from '../../shared/aiLab'
import { MIN_CONFIDENCE } from '../../shared/classifier'
import { COMPAT_RULES } from '../../shared/compatibility'
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from '../ai/gemini'
import { getModelDir } from '../ai/modelDir'
import { countKbSources } from '../models/kb.model'
import { MAX_DISTANCE, TOP_K, geminiEmbedder } from './ask.service'
import { getKbStatus } from './kb.service'

// metrics.json (03_evaluate.ipynb yozadi) — ishonmaymiz, tekshiramiz
const metricsSchema = z.object({
  test_accuracy: z.number().min(0).max(1),
  per_class: z.record(z.string(), z.number().min(0).max(1)),
  threshold: z.number().min(0).max(1),
  confusion_matrix: z.array(z.array(z.number().int().min(0))),
  classes: z.array(z.string().min(1)).min(2).max(20)
})

const MAX_GRADCAM = 12
const MAX_GRADCAM_BYTES = 2 * 1024 * 1024

export function readClassifierMetrics(dir: string): ClassifierMetrics | null {
  try {
    const m = metricsSchema.parse(JSON.parse(readFileSync(join(dir, 'metrics.json'), 'utf8')))
    const n = m.classes.length
    if (m.confusion_matrix.length !== n || m.confusion_matrix.some((r) => r.length !== n))
      return null
    return {
      classes: m.classes,
      testAccuracy: m.test_accuracy,
      recall: m.classes.map((c) => m.per_class[c] ?? 0),
      confusion: m.confusion_matrix,
      testImages: m.confusion_matrix.flat().reduce((a, b) => a + b, 0),
      modelThreshold: m.threshold,
      appThreshold: MIN_CONFIDENCE
    }
  } catch {
    return null // Fayl yo'q yoki buzilgan → sahifa bu bo'limni ko'rsatmaydi
  }
}

// resources/models/gradcam/<sinf>.png (ixtiyoriy) → data URL
export function readGradCam(dir: string): GradCamImage[] {
  const folder = join(dir, 'gradcam')
  if (!existsSync(folder)) return []
  return readdirSync(folder)
    .filter((f) => /^[a-z_]+\.png$/.test(f)) // Faqat oddiy nomli PNG fayllar
    .sort()
    .slice(0, MAX_GRADCAM)
    .filter((f) => statSync(join(folder, f)).size <= MAX_GRADCAM_BYTES)
    .map((f) => ({
      cls: f.replace(/\.png$/, ''),
      dataUrl: `data:image/png;base64,${readFileSync(join(folder, f)).toString('base64')}`
    }))
}

export function getLabInfo(): LabInfo {
  const dir = getModelDir()
  const kb = getKbStatus(geminiEmbedder)
  return {
    classifier: readClassifierMetrics(dir),
    gradcam: readGradCam(dir),
    rag: {
      chunks: kb.chunks,
      sourcePages: countKbSources(),
      vectorAvailable: kb.vectorAvailable,
      vectorReady: kb.vectorReady,
      embeddingModel: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
      maxDistance: MAX_DISTANCE,
      topK: TOP_K
    },
    compatRules: COMPAT_RULES.length
  }
}
