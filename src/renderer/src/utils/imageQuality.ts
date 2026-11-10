// Rasm sifatini tekshirish (Quality Gate) — AI'ga yuborishdan OLDIN
// Hisob-kitob qismi sof funksiya (canvas'siz) → test qilish oson

export type QualityIssue = 'too_small' | 'blurry' | 'too_dark' | 'too_bright'

export const QUALITY_LIMITS = {
  minSide: 500, // Eng qisqa tomoni kamida 500px
  blurMin: 60, // Laplacian dispersiyasi shundan past → xira
  darkMax: 50, // O'rtacha yorqinlik shundan past → qorong'i
  brightMin: 215 // O'rtacha yorqinlik shundan yuqori → juda yorug'
}

// Kulrang piksellar (0–255) bo'yicha o'rtacha yorqinlik va keskinlik
export function measureGray(
  gray: Uint8ClampedArray | number[],
  width: number,
  height: number
): {
  brightness: number
  sharpness: number
} {
  let sum = 0
  for (let i = 0; i < gray.length; i++) sum += gray[i]
  const brightness = sum / gray.length // O'rtacha yorqinlik

  // Laplacian: har bir piksel 4 qo'shnisidan qanchalik farq qiladi (keskin rasmda farq katta)
  let lapSum = 0
  let lapSq = 0
  let n = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      const lap = gray[i - width] + gray[i + width] + gray[i - 1] + gray[i + 1] - 4 * gray[i]
      lapSum += lap
      lapSq += lap * lap
      n++
    }
  }
  const mean = n ? lapSum / n : 0
  const sharpness = n ? lapSq / n - mean * mean : 0 // Dispersiya (variance)
  return { brightness, sharpness }
}

export function findIssues(
  naturalWidth: number,
  naturalHeight: number,
  brightness: number,
  sharpness: number,
  minSide: number = QUALITY_LIMITS.minSide // Label scan: 500px (mayda matn); klassifikator kamroq so'raydi
): QualityIssue[] {
  const issues: QualityIssue[] = []
  if (Math.min(naturalWidth, naturalHeight) < minSide) issues.push('too_small')
  if (brightness < QUALITY_LIMITS.darkMax) issues.push('too_dark')
  else if (brightness > QUALITY_LIMITS.brightMin) issues.push('too_bright')
  if (sharpness < QUALITY_LIMITS.blurMin) issues.push('blurry')
  return issues
}

// Faylni yuklaydi, sifatini tekshiradi va AI uchun kichraytirilgan JPEG tayyorlaydi
// Qayta kodlash EXIF ma'lumotlarini (GPS joylashuvi va h.k.) olib tashlaydi
export async function prepareImage(file: File): Promise<{
  previewUrl: string
  issues: QualityIssue[]
  jpeg: Uint8Array
}> {
  const bitmap = await createImageBitmap(file) // Rasmni xotiraga yuklaymiz
  try {
    // 1) Sifat: 512px gacha kichraytirib, kulrang qilib o'lchaymiz
    const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const small = new OffscreenCanvas(w, h)
    const sctx = small.getContext('2d')!
    sctx.drawImage(bitmap, 0, 0, w, h)
    const rgba = sctx.getImageData(0, 0, w, h).data
    const gray = new Uint8ClampedArray(w * h)
    for (let i = 0; i < w * h; i++) {
      gray[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2] // RGB → kulrang
    }
    const { brightness, sharpness } = measureGray(gray, w, h)
    const issues = findIssues(bitmap.width, bitmap.height, brightness, sharpness)

    // 2) AI uchun: eng uzun tomoni 1600px gacha JPEG (tezroq, arzonroq, metadata'siz)
    const bigScale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const bw = Math.round(bitmap.width * bigScale)
    const bh = Math.round(bitmap.height * bigScale)
    const big = new OffscreenCanvas(bw, bh)
    big.getContext('2d')!.drawImage(bitmap, 0, 0, bw, bh)
    const blob = await big.convertToBlob({ type: 'image/jpeg', quality: 0.9 })
    const jpeg = new Uint8Array(await blob.arrayBuffer())

    return { previewUrl: URL.createObjectURL(blob), issues, jpeg }
  } finally {
    bitmap.close() // Xotirani bo'shatamiz
  }
}
