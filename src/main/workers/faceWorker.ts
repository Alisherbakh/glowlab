// Alohida oqimda (worker thread) ishlaydi: OpenCV.js og'ir hisob-kitobi oyna (UI) ni qotirmasin.
// OpenCV.js ishga tushishda `new Function` ishlatadi — renderer'da bu CSP'ni bo'shatishni talab qilardi,
// main tomonida esa CSP yo'q, shuning uchun bu yerda xavfsizroq.
import { createRequire } from 'node:module'
import { parentPort } from 'node:worker_threads'
import { analyzeFacePixels, type FacePixelInput } from '../ai/faceMetrics'

type CV = typeof import('@techstark/opencv-js')

// OpenCV modulini require bilan yuklaymiz (ESM importi uni ishga tushmasdan oldin nusxalab olishi mumkin)
const cv = createRequire(__filename)('@techstark/opencv-js') as CV & {
  onRuntimeInitialized?: () => void
}

// MUHIM: modulning o'zida `.then` bor — uni resolve() ga BERMAYMIZ (aks holda cheksiz sikl)
const ready = new Promise<void>((resolve) => {
  if (cv.Mat) resolve()
  else cv.onRuntimeInitialized = () => resolve()
})

parentPort?.on('message', async (msg: { id: number; input: FacePixelInput }) => {
  try {
    await ready
    const result = analyzeFacePixels(cv, msg.input)
    parentPort?.postMessage({ id: msg.id, ok: true, result })
  } catch (err) {
    parentPort?.postMessage({
      id: msg.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err)
    })
  }
})
