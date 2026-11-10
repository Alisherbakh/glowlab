// Yuz rasmini tahlilga tayyorlash: topish → geometriya tekshiruvi → kesish (yuz kengligi 400px) → zonalar
// Rasm kompyuterdan chiqmaydi: main'ga faqat kesilgan yuz piksellari IPC orqali boradi
import {
  TARGET_FACE_WIDTH,
  cropBox,
  faceRegions,
  faceWidth,
  geometryIssues,
  transformRegions,
  type FaceRegion
} from '../../../shared/faceGeometry'
import type { FaceQualityIssue } from '../../../shared/faceScan'
import { detectFaces } from './faceLandmarks'

const DETECT_MAX_SIDE = 1280 // Yuzni topish uchun shu o'lchamgacha kichraytiramiz (tezroq)
const PREVIEW_MAX_SIDE = 640

export type FaceInput = { width: number; height: number; rgba: Uint8Array; regions: FaceRegion[] }

export type PreparedFace =
  | { status: 'unavailable' } // Model fayli yo'q
  | { status: 'quality'; issues: FaceQualityIssue[]; previewUrl: string }
  | { status: 'ready'; previewUrl: string; input: FaceInput; regions: FaceRegion[] }

type Source = ImageBitmap | HTMLCanvasElement

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  return c
}

// Manbadan (yoki uning bir qismidan) yangi o'lchamga chizish; katta kichraytirishda bosqichma-bosqich
function drawScaled(
  src: Source,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dw: number,
  dh: number
): HTMLCanvasElement {
  let current: Source = src
  let cx = sx
  let cy = sy
  let cw = sw
  let ch = sh
  while (cw > dw * 2 && ch > dh * 2) {
    const step = makeCanvas(Math.round(cw / 2), Math.round(ch / 2))
    const ctx = step.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(current, cx, cy, cw, ch, 0, 0, step.width, step.height)
    current = step
    cx = 0
    cy = 0
    cw = step.width
    ch = step.height
  }
  const out = makeCanvas(dw, dh)
  const ctx = out.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(current, cx, cy, cw, ch, 0, 0, dw, dh)
  return out
}

async function toUrl(canvas: HTMLCanvasElement): Promise<string> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.9)
  )
  if (!blob) throw new Error('Could not encode preview')
  return URL.createObjectURL(blob)
}

export async function prepareFace(src: Source): Promise<PreparedFace> {
  const width = src.width
  const height = src.height

  // 1) Yuzni topish (kichraytirilgan nusxada; nuqtalar to'liq o'lchamga qaytariladi)
  const ds = Math.min(1, DETECT_MAX_SIDE / Math.max(width, height))
  const detectCanvas = drawScaled(
    src,
    0,
    0,
    width,
    height,
    Math.max(1, Math.round(width * ds)),
    Math.max(1, Math.round(height * ds))
  )
  const faces = await detectFaces(detectCanvas, width, height)
  if (!faces) return { status: 'unavailable' }

  // 2) Geometriya: yuz bormi, bittami, yetarlicha kattami, to'g'ri qaraganmi
  const issues = geometryIssues(faces)
  if (issues.length > 0) {
    const ps = Math.min(1, PREVIEW_MAX_SIDE / Math.max(width, height))
    const preview = drawScaled(
      src,
      0,
      0,
      width,
      height,
      Math.round(width * ps),
      Math.round(height * ps)
    )
    return { status: 'quality', issues, previewUrl: await toUrl(preview) }
  }

  // 3) Kesish: yuz kengligi doim ~400px bo'lsin (turli rasmlar natijalari solishtiriladigan bo'ladi)
  const lm = faces[0]
  const box = cropBox(lm, width, height)
  const scale = TARGET_FACE_WIDTH / faceWidth(lm)
  const outW = Math.max(100, Math.min(1600, Math.round(box.width * scale)))
  const outH = Math.max(100, Math.min(1600, Math.round(box.height * scale)))
  const crop = drawScaled(src, box.x, box.y, box.width, box.height, outW, outH)
  const regions = transformRegions(faceRegions(lm), box, outW / box.width)
  const data = crop.getContext('2d')!.getImageData(0, 0, outW, outH).data

  return {
    status: 'ready',
    previewUrl: await toUrl(crop),
    regions,
    input: { width: outW, height: outH, rgba: new Uint8Array(data.buffer), regions }
  }
}
