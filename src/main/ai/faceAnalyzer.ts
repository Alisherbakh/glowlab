// Main ↔ OpenCV worker aloqasi: so'rov yuboradi, javobni id bo'yicha qaytaradi
import type { Worker } from 'node:worker_threads'
import createFaceWorker from '../workers/faceWorker?nodeWorker'
import type { FacePixelInput, FacePixelResult } from './faceMetrics'

const TIMEOUT_MS = 30_000 // Birinchi marta OpenCV yuklanishi bilan ham bundan oshmasligi kerak

type Pending = {
  resolve: (r: FacePixelResult) => void
  reject: (e: Error) => void
  timer: NodeJS.Timeout
}

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, Pending>()

function failAll(error: Error): void {
  for (const p of pending.values()) {
    clearTimeout(p.timer)
    p.reject(error)
  }
  pending.clear()
}

function getWorker(): Worker {
  if (worker) return worker
  const w = createFaceWorker({})
  w.on('message', (msg: { id: number; ok: boolean; result?: FacePixelResult; error?: string }) => {
    const p = pending.get(msg.id)
    if (!p) return
    pending.delete(msg.id)
    clearTimeout(p.timer)
    if (msg.ok && msg.result) p.resolve(msg.result)
    else p.reject(new Error(msg.error ?? 'Face analysis failed'))
  })
  w.on('error', (err) => {
    console.error('[face] worker error:', err)
    failAll(err instanceof Error ? err : new Error(String(err)))
    worker = null // Keyingi so'rovda yangisi yaratiladi
  })
  w.on('exit', () => {
    failAll(new Error('Face worker stopped'))
    worker = null
  })
  worker = w
  return w
}

export function analyzeFacePixelsInWorker(input: FacePixelInput): Promise<FacePixelResult> {
  const w = getWorker()
  const id = nextId++
  const rgba = input.rgba.slice() // O'z ArrayBuffer'iga ega nusxa → worker'ga ko'chirib (transfer) beramiz
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error('Face analysis timed out'))
    }, TIMEOUT_MS)
    pending.set(id, { resolve, reject, timer })
    w.postMessage({ id, input: { ...input, rgba } }, [rgba.buffer])
  })
}

export async function stopFaceWorker(): Promise<void> {
  const w = worker
  worker = null
  if (w) await w.terminate()
}
