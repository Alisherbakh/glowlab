import { z } from 'zod'
import { CLASSIFIER_INPUT_BYTES, type ClassifyResult } from '../../shared/classifier'
import { classifyProductImage } from '../ai/classifier'

// Renderer'dan faqat aniq o'lchamdagi RGB baytlar qabul qilinadi (224 x 224 x 3)
const inputSchema = z
  .instanceof(Uint8Array)
  .refine((b) => b.byteLength === CLASSIFIER_INPUT_BYTES, 'Invalid image size')

export async function classifyProduct(input: unknown): Promise<ClassifyResult> {
  const rgb = inputSchema.parse(input) // Noto'g'ri kirish → xato (IPC orqali rad etiladi)
  return classifyProductImage(rgb)
}
