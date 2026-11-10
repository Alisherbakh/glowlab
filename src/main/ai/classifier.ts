// Mahsulot turini rasmdan aniqlovchi oflayn model (MobileNetV2 → ONNX, onnxruntime-node)
// Model fayllari: resources/models/ (Colab'dagi ml/04_export.ipynb natijasi)
import { app } from 'electron'
import { readFile } from 'fs/promises'
import { join } from 'path'
import * as ort from 'onnxruntime-node'
import { z } from 'zod'
import { CLASSIFIER_INPUT_SIZE, MIN_CONFIDENCE, type ClassifyResult } from '../../shared/classifier'
import { PRODUCT_CATEGORIES, type ProductCategory } from '../../shared/products'
import { rgbToNchw, softmax, topK } from './classifierMath'

// preprocess.json — Python'dagi preprocessing bilan bir xil bo'lishi shart
const preprocessSchema = z.object({
  size: z.literal(CLASSIFIER_INPUT_SIZE),
  mean: z.array(z.number()).length(3),
  std: z.array(z.number().positive()).length(3),
  layout: z.literal('NCHW'),
  threshold: z.number().min(0).max(1)
})

// classes.json — har bir nom ilovadagi kategoriyalardan biri bo'lishi kerak
const classesSchema = z.array(z.enum(PRODUCT_CATEGORIES)).min(2)

type LoadedModel = {
  session: ort.InferenceSession
  classes: ProductCategory[]
  mean: number[]
  std: number[]
  threshold: number
}

let loading: Promise<LoadedModel | null> | null = null // Model faqat bir marta yuklanadi

// Dev: loyiha papkasi; build: asar ichidan chiqarilgan (asarUnpack) papka
function getModelDir(): string {
  const dir = join(app.getAppPath(), 'resources', 'models')
  return app.isPackaged ? dir.replace('app.asar', 'app.asar.unpacked') : dir
}

async function loadModel(): Promise<LoadedModel | null> {
  try {
    const dir = getModelDir()
    const [modelBytes, preprocessText, classesText] = await Promise.all([
      readFile(join(dir, 'product_classifier.onnx')),
      readFile(join(dir, 'preprocess.json'), 'utf8'),
      readFile(join(dir, 'classes.json'), 'utf8')
    ])
    const pre = preprocessSchema.parse(JSON.parse(preprocessText))
    const classes = classesSchema.parse(JSON.parse(classesText))
    const session = await ort.InferenceSession.create(modelBytes)
    return {
      session,
      classes,
      mean: pre.mean,
      std: pre.std,
      threshold: Math.max(pre.threshold, MIN_CONFIDENCE) // Kamida 0.60
    }
  } catch (err) {
    // Model yo'q yoki buzilgan → funksiya shunchaki o'chadi, ilova ishlashda davom etadi
    console.error('[classifier] model not available:', err)
    return null
  }
}

function getModel(): Promise<LoadedModel | null> {
  if (!loading) loading = loadModel()
  return loading
}

// rgb: 224x224 RGB baytlar (renderer'da kichraytirilgan). Natija: taxmin yoki "ishonchim komil emas"
export async function classifyProductImage(rgb: Uint8Array): Promise<ClassifyResult> {
  const model = await getModel()
  if (!model) return { status: 'unavailable' }

  const input = new ort.Tensor(
    'float32',
    rgbToNchw(rgb, CLASSIFIER_INPUT_SIZE, model.mean, model.std),
    [1, 3, CLASSIFIER_INPUT_SIZE, CLASSIFIER_INPUT_SIZE]
  )
  const outputs = await model.session.run({ [model.session.inputNames[0]]: input })
  const logits = Array.from(outputs[model.session.outputNames[0]].data as Float32Array)
  if (logits.length !== model.classes.length || !logits.every(Number.isFinite)) {
    console.error('[classifier] unexpected model output')
    return { status: 'unavailable' }
  }

  const top = topK(model.classes, softmax(logits), 3).map(({ label, p }) => ({
    category: label,
    probability: p
  }))
  if (top[0].probability < model.threshold) return { status: 'unsure', top }
  return { status: 'ok', category: top[0].category, confidence: top[0].probability, top }
}
