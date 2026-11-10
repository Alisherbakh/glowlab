// Yuz terisi o'lchovlari (OpenCV.js) — sof funksiya: cv tashqaridan beriladi, Electron'siz test qilinadi
// Kirish: yuz kengligi ~400px qilib kesilgan RGBA rasm + zonalar (doiralar).
// MUHIM: bular rasmdagi ko'rinishning taxminiy o'lchovlari (heuristika), tibbiy tashxis EMAS.
// Chegaraviy sonlar haqiqiy rasmlarda sozlanadi (ai-docs/next_steps.md ga qarang).
import type { FaceRegion, FaceRegionName } from '../../shared/faceGeometry'
import type { FaceQualityIssue, RawFaceMetrics } from '../../shared/faceScan'

type CV = typeof import('@techstark/opencv-js')
type Mat = InstanceType<CV['Mat']>

export type FacePixelInput = {
  rgba: Uint8Array
  width: number
  height: number
  regions: FaceRegion[]
}

export type FacePixelResult = {
  issues: FaceQualityIssue[]
  raw: RawFaceMetrics
  qualityScore: number // 0..1
  measures: Record<string, number> // Xom o'lchovlar (sozlash va debug uchun)
}

// --- Sifat chegaralari (L* 0–100 shkalada) ---
const DARK_L = 25 // Teri o'rtacha yorqinligi shundan past → qorong'i
const BRIGHT_L = 88 // Shundan yuqori → juda yorug'
const CLIPPED_MAX = 0.2 // Oq bo'lib "kuyib ketgan" piksellar ulushi
const BLUR_MIN = 12 // Laplacian dispersiyasi shundan past → xira
const SIDE_DIFF_MAX = 15 // Ikki yonoq yorqinligi farqi shundan katta → yorug'lik notekis

const clamp01 = (v: number): number => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0)
const scale = (v: number, lo: number, hi: number): number => clamp01((v - lo) / (hi - lo))

export function analyzeFacePixels(cv: CV, input: FacePixelInput): FacePixelResult {
  const { rgba, width, height, regions } = input
  const disposables: { delete(): void }[] = [] // Hammasi oxirida o'chiriladi (WASM xotirasi avtomatik tozalanmaydi)
  const keep = <T extends { delete(): void }>(m: T): T => {
    disposables.push(m)
    return m
  }

  try {
    const src = keep(cv.matFromArray(height, width, cv.CV_8UC4, rgba))
    const rgb = keep(new cv.Mat())
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)

    // Oq balans qilinmaydi: teri asosan bir xil rangli bo'lgani uchun "gray-world" terining o'z qizilligini
    // ham yo'qotib yuboradi (testda a* ≈ 0 chiqdi). Telefon kameralari oq balansni o'zi qiladi.
    const balanced = rgb

    const lab = keep(new cv.Mat())
    cv.cvtColor(balanced, lab, cv.COLOR_RGB2Lab) // 8-bit: L = L*·255/100, a = a*+128
    const hsv = keep(new cv.Mat())
    cv.cvtColor(balanced, hsv, cv.COLOR_RGB2HSV)
    const gray = keep(new cv.Mat())
    cv.cvtColor(balanced, gray, cv.COLOR_RGB2GRAY)
    const labCh = keep(new cv.MatVector())
    cv.split(lab, labCh)
    const L = keep(labCh.get(0))
    const A = keep(labCh.get(1))

    // Zonalar bo'yicha niqob (mask)
    const mask = (names: FaceRegionName[]): Mat => {
      const out = keep(cv.Mat.zeros(height, width, cv.CV_8UC1))
      for (const r of regions) {
        if (names.includes(r.name)) {
          cv.circle(
            out,
            new cv.Point(Math.round(r.x), Math.round(r.y)),
            Math.max(1, Math.round(r.r)),
            new cv.Scalar(255),
            -1
          )
        }
      }
      return out
    }
    const meanStd = (img: Mat, msk: Mat): { mean: number; std: number } => {
      const mean = keep(new cv.Mat())
      const std = keep(new cv.Mat())
      cv.meanStdDev(img, mean, std, msk)
      return { mean: mean.data64F[0], std: std.data64F[0] }
    }
    const toLstar = (v: number): number => (v * 100) / 255

    const skin = mask(['forehead', 'cheek1', 'cheek2', 'nose', 'chin'])
    const skinArea = cv.countNonZero(skin)
    if (skinArea < 500) throw new Error('Face regions are too small') // Renderer xatosi (bo'lmasligi kerak)

    // 2) Sifat (piksellar bo'yicha)
    const issues: FaceQualityIssue[] = []
    const skinL = toLstar(meanStd(L, skin).mean)
    const clippedMask = keep(new cv.Mat())
    cv.threshold(gray, clippedMask, 249, 255, cv.THRESH_BINARY)
    cv.bitwise_and(clippedMask, skin, clippedMask)
    const clipped = cv.countNonZero(clippedMask) / skinArea
    if (skinL < DARK_L) issues.push('too_dark')
    else if (skinL > BRIGHT_L || clipped > CLIPPED_MAX) issues.push('too_bright')

    const lap = keep(new cv.Mat())
    cv.Laplacian(gray, lap, cv.CV_64F)
    const lapStd = meanStd(lap, skin).std
    const sharpness = lapStd * lapStd // Dispersiya
    if (sharpness < BLUR_MIN) issues.push('blurry')

    const cheek1L = toLstar(meanStd(L, mask(['cheek1'])).mean)
    const cheek2L = toLstar(meanStd(L, mask(['cheek2'])).mean)
    const sideDiff = Math.abs(cheek1L - cheek2L)
    if (sideDiff > SIDE_DIFF_MAX) issues.push('uneven_light')

    const qualityScore = clamp01(
      0.4 * Math.min(1, sharpness / (3 * BLUR_MIN)) +
        0.3 * (1 - sideDiff / (2 * SIDE_DIFF_MAX)) +
        0.3 * (1 - Math.abs(skinL - 60) / 40)
    )

    // 3) Ko'rsatkichlar
    // Yog'lilik: T-zonada yaltiroq (juda yorug' va rangsiz) piksellar ulushi
    const tzone = mask(['forehead', 'nose'])
    const shine = keep(new cv.Mat())
    const lo = keep(new cv.Mat(height, width, cv.CV_8UC3, new cv.Scalar(0, 0, 235)))
    const hi = keep(new cv.Mat(height, width, cv.CV_8UC3, new cv.Scalar(180, 60, 255)))
    cv.inRange(hsv, lo, hi, shine)
    cv.bitwise_and(shine, tzone, shine)
    const shineFrac = cv.countNonZero(shine) / Math.max(1, cv.countNonZero(tzone))

    // Qizarish: yonoq + burun + iyakda a* (yashil ↔ qizil o'qi) o'rtachasi
    const redZone = mask(['cheek1', 'cheek2', 'nose', 'chin'])
    const aStar = meanStd(A, redZone).mean - 128

    // Tekstura: mayda notekisliklar — band-pass (σ1 − σ4): piksel shovqini va katta soyalar hisobga olinmaydi
    const grayF = keep(new cv.Mat())
    gray.convertTo(grayF, cv.CV_32F)
    const g1 = keep(new cv.Mat())
    const g4 = keep(new cv.Mat())
    cv.GaussianBlur(grayF, g1, new cv.Size(0, 0), 1)
    cv.GaussianBlur(grayF, g4, new cv.Size(0, 0), 4)
    const hp = keep(new cv.Mat())
    cv.subtract(g1, g4, hp)
    const texZone = mask(['cheek1', 'cheek2', 'forehead'])
    const texStd = meanStd(hp, texZone).std

    // Dog'lar: atrofidan to'qroq mayda joylar (black-hat) → kontur soni / maydon
    const kernel = keep(cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(9, 9)))
    const Ls = keep(new cv.Mat())
    cv.GaussianBlur(L, Ls, new cv.Size(0, 0), 1.2) // Piksel shovqini "dog'" bo'lib sanalmasin
    const blackhat = keep(new cv.Mat())
    cv.morphologyEx(Ls, blackhat, cv.MORPH_BLACKHAT, kernel)
    const spotsBin = keep(new cv.Mat())
    cv.threshold(blackhat, spotsBin, 12, 255, cv.THRESH_BINARY)
    cv.bitwise_and(spotsBin, skin, spotsBin)
    const contours = keep(new cv.MatVector())
    const hierarchy = keep(new cv.Mat())
    cv.findContours(spotsBin, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    let spotCount = 0
    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i)
      const area = cv.contourArea(c)
      if (area >= 6 && area <= 150) spotCount++ // Juda mayda (g'ovak/shovqin) va katta (soya) hisoblanmaydi
      c.delete()
    }
    const spotDensity = spotCount / (skinArea / 10000) // 10 000 pikselga nechta

    // Ko'z osti: yonoqqa nisbatan qanchalik to'qroq (L*)
    const underL = toLstar(meanStd(L, mask(['underEye1', 'underEye2'])).mean)
    const cheekL = (cheek1L + cheek2L) / 2
    const underDiff = cheekL - underL

    // Rang notekisligi: o'rta chastotali yorqinlik o'zgarishi (yorug'lik gradientisiz)
    const LF = keep(new cv.Mat())
    L.convertTo(LF, cv.CV_32F, 100 / 255)
    const b2 = keep(new cv.Mat())
    const b8 = keep(new cv.Mat())
    cv.GaussianBlur(LF, b2, new cv.Size(0, 0), 2)
    cv.GaussianBlur(LF, b8, new cv.Size(0, 0), 8)
    const band = keep(new cv.Mat())
    cv.subtract(b2, b8, band)
    const blotchStd = meanStd(band, texZone).std

    const raw: RawFaceMetrics = {
      oiliness: scale(shineFrac, 0, 0.06),
      redness: scale(aStar, 10, 25),
      texture: scale(texStd, 1, 5),
      spots: scale(spotDensity, 0, 8),
      darkCircles: scale(underDiff, 3, 15),
      evenness: scale(blotchStd, 1, 4)
    }

    return {
      issues,
      raw,
      qualityScore,
      measures: {
        skinL,
        clipped,
        sharpness,
        sideDiff,
        shineFrac,
        aStar,
        texStd,
        spotCount,
        spotDensity,
        underDiff,
        blotchStd
      }
    }
  } finally {
    for (const d of disposables) {
      try {
        d.delete()
      } catch {
        // Allaqachon o'chirilgan bo'lsa — e'tiborsiz
      }
    }
  }
}
