// MediaPipe Face Landmarker (oflayn): WASM fayllar ilova ichida, model resources/models'dan IPC orqali keladi
// CSP: faqat 'wasm-unsafe-eval' kerak (WebAssembly kompilyatsiyasi); 'unsafe-eval' kerak EMAS
import { FaceLandmarker } from '@mediapipe/tasks-vision'
import wasmLoaderPath from '@mediapipe/tasks-vision/vision_wasm_internal.js?url'
import wasmBinaryPath from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url'
import type { Point } from '../../../shared/faceGeometry'

let loading: Promise<FaceLandmarker | null> | null = null

async function create(): Promise<FaceLandmarker | null> {
  const model = await window.api.face.modelBytes()
  if (!model) return null // Model fayli yo'q → sahifa yo'riqnoma ko'rsatadi
  return FaceLandmarker.createFromOptions(
    { wasmLoaderPath, wasmBinaryPath },
    {
      baseOptions: { modelAssetBuffer: model, delegate: 'CPU' }, // CPU: barcha kompyuterlarda bir xil ishlaydi
      runningMode: 'IMAGE',
      numFaces: 2, // 2 ta: rasmda bir nechta yuz borligini aniqlash uchun
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5
    }
  )
}

// null → model mavjud emas
export function getFaceLandmarker(): Promise<FaceLandmarker | null> {
  if (!loading) {
    loading = create().catch((err) => {
      loading = null // Keyingi urinishda qayta yuklaymiz
      throw err
    })
  }
  return loading
}

// Har bir topilgan yuz uchun piksel koordinatalaridagi nuqtalar
export async function detectFaces(
  source: HTMLCanvasElement,
  width: number,
  height: number
): Promise<Point[][] | null> {
  const landmarker = await getFaceLandmarker()
  if (!landmarker) return null
  const result = landmarker.detect(source)
  return result.faceLandmarks.map((face) => face.map((p) => ({ x: p.x * width, y: p.y * height })))
}
