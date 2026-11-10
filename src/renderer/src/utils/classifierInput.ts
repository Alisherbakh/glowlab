// Klassifikator uchun rasm tayyorlash (renderer): sifat tekshiruvi + 224x224 RGB baytlar
// Rasmning o'zi kompyuterdan chiqmaydi — main'ga faqat kichraytirilgan piksellar boradi
import { CLASSIFIER_INPUT_SIZE } from '../../../shared/classifier'
import { findIssues, measureGray, type QualityIssue } from './imageQuality'

// Model 224px bilan ishlaydi → 300px yetarli (label scan'dagi 500px mayda matn o'qish uchun)
const CLASSIFIER_MIN_SIDE = 300

// Canvas'dan RGBA → RGB (alpha tashlanadi; fon oldindan oq bilan to'ldiriladi)
export function rgbaToRgb(rgba: Uint8ClampedArray): Uint8Array {
  const n = rgba.length / 4
  const rgb = new Uint8Array(n * 3)
  for (let i = 0; i < n; i++) {
    rgb[i * 3] = rgba[i * 4]
    rgb[i * 3 + 1] = rgba[i * 4 + 1]
    rgb[i * 3 + 2] = rgba[i * 4 + 2]
  }
  return rgb
}

// Katta rasmni bosqichma-bosqich (2 baravardan) kichraytiramiz → PIL'dagi antialias'ga yaqin, "zinapoya"siz
function downscale(
  source: CanvasImageSource,
  width: number,
  height: number,
  target: number
): OffscreenCanvas {
  let src: CanvasImageSource = source
  let w = width
  let h = height
  while (w > target * 2 || h > target * 2) {
    const nw = Math.max(target, Math.round(w / 2))
    const nh = Math.max(target, Math.round(h / 2))
    const step = new OffscreenCanvas(nw, nh)
    const ctx = step.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(src, 0, 0, nw, nh)
    src = step
    w = nw
    h = nh
  }
  // Oxirgi qadam: aniq target x target (Colab'dagi Resize((224, 224)) kabi — tomonlar nisbati saqlanmaydi)
  const out = new OffscreenCanvas(target, target)
  const ctx = out.getContext('2d')!
  ctx.fillStyle = '#ffffff' // Shaffof PNG → oq fon
  ctx.fillRect(0, 0, target, target)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, target, target)
  return out
}

export async function prepareClassifierInput(file: File): Promise<{
  previewUrl: string
  issues: QualityIssue[]
  rgb: Uint8Array
}> {
  const bitmap = await createImageBitmap(file) // EXIF bo'yicha avtomatik to'g'ri buriladi
  try {
    // 1) Sifat: Label scan'dagi bilan bir xil o'lchovlar (xira / qorong'i / juda kichik)
    const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const small = new OffscreenCanvas(w, h)
    const sctx = small.getContext('2d')!
    sctx.drawImage(bitmap, 0, 0, w, h)
    const rgba = sctx.getImageData(0, 0, w, h).data
    const gray = new Uint8ClampedArray(w * h)
    for (let i = 0; i < w * h; i++) {
      gray[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]
    }
    const { brightness, sharpness } = measureGray(gray, w, h)
    const issues = findIssues(
      bitmap.width,
      bitmap.height,
      brightness,
      sharpness,
      CLASSIFIER_MIN_SIDE
    )

    // 2) Model uchun 224x224 RGB
    const size = CLASSIFIER_INPUT_SIZE
    const canvas = downscale(bitmap, bitmap.width, bitmap.height, size)
    const rgb = rgbaToRgb(canvas.getContext('2d')!.getImageData(0, 0, size, size).data)

    // 3) Ko'rsatish uchun kichik nusxa (asl fayl emas)
    const blob = await small.convertToBlob({ type: 'image/jpeg', quality: 0.85 })
    return { previewUrl: URL.createObjectURL(blob), issues, rgb }
  } finally {
    bitmap.close()
  }
}
