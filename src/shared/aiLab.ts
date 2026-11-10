// AI Lab sahifasi: modellar haqidagi haqiqiy ma'lumotlar (main + renderer umumiy)

export type ClassifierMetrics = {
  classes: string[] // Sinflar tartibi (confusion matrix qatorlari va ustunlari shu tartibda)
  testAccuracy: number // 0..1
  recall: number[] // Har bir sinf uchun to'g'ri topilgan ulush (sinflar tartibida)
  confusion: number[][] // [haqiqiy][bashorat] — rasm soni
  testImages: number // Test rasmlari soni
  modelThreshold: number // Validatsiyada tanlangan chegara (metrics.json)
  appThreshold: number // Ilovadagi chegara (MIN_CONFIDENCE)
}

export type GradCamImage = { cls: string; dataUrl: string }

export type RagInfo = {
  chunks: number
  sourcePages: number // Takrorlanmaydigan manba sahifalari
  vectorAvailable: boolean
  vectorReady: boolean
  embeddingModel: string
  dimensions: number
  maxDistance: number
  topK: number
}

export type LabInfo = {
  classifier: ClassifierMetrics | null // metrics.json bo'lmasa yoki buzilgan bo'lsa null
  gradcam: GradCamImage[]
  rag: RagInfo
  compatRules: number
}
