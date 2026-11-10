// Mahsulot turini rasmdan taxmin qilish (oflayn ONNX model): umumiy turlar (main + renderer)
import type { ProductCategory } from './products'

export const CLASSIFIER_INPUT_SIZE = 224 // Model kirishi: 224x224 RGB (preprocess.json bilan bir xil)
export const CLASSIFIER_INPUT_BYTES = CLASSIFIER_INPUT_SIZE * CLASSIFIER_INPUT_SIZE * 3 // RGB baytlar soni

// Model qanchalik ishonchli bo'lishidan qat'i nazar, shundan past ishonch → "Ishonchim komil emas"
// (Colab'da val'dan 0.30 chiqdi, lekin begona rasmlar uchun bu juda past — ilovada kamida 0.60)
export const MIN_CONFIDENCE = 0.6

// Model taniydigan turlar (resources/models/classes.json bilan bir xil bo'lishi kerak)
export const CLASSIFIER_CATEGORIES: readonly ProductCategory[] = [
  'cleanser',
  'toner',
  'serum',
  'moisturizer',
  'sunscreen',
  'lip'
]

export type ClassifierGuess = {
  category: ProductCategory
  probability: number // 0..1
}

export type ClassifyResult =
  | { status: 'ok'; category: ProductCategory; confidence: number; top: ClassifierGuess[] }
  | { status: 'unsure'; top: ClassifierGuess[] } // Ishonch chegaradan past
  | { status: 'unavailable' } // Model fayllari yo'q yoki yuklanmadi
