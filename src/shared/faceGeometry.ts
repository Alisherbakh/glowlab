// Yuz geometriyasi: MediaPipe nuqtalaridan zonalar, o'lcham va bosh burilishi (sof funksiyalar, test qilinadi)
// Nuqta raqamlari MediaPipe'ning rasmiy canonical_face_model.obj fayli bo'yicha tekshirilgan
import type { FaceQualityIssue } from './faceScan'

export type Point = { x: number; y: number } // Piksel koordinatalari

export const FACE_REGION_NAMES = [
  'forehead',
  'cheek1',
  'cheek2',
  'nose',
  'chin',
  'underEye1',
  'underEye2'
] as const
export type FaceRegionName = (typeof FACE_REGION_NAMES)[number]

export type FaceRegion = { name: FaceRegionName; x: number; y: number; r: number } // Doira

// Zona markazi (nuqta raqami) va radiusi (yuz kengligiga nisbatan)
const REGION_SPEC: Record<FaceRegionName, { index: number; radius: number }> = {
  forehead: { index: 151, radius: 0.08 }, // Peshona markazi (soch chizig'idan uzoqroq)
  cheek1: { index: 50, radius: 0.09 }, // Yonoq
  cheek2: { index: 280, radius: 0.09 }, // Ikkinchi yonoq
  nose: { index: 5, radius: 0.05 }, // Burun usti
  chin: { index: 199, radius: 0.06 }, // Iyak
  underEye1: { index: 230, radius: 0.035 }, // Ko'z osti
  underEye2: { index: 450, radius: 0.035 }
}

const L = {
  faceEdge1: 234, // Yuzning chap-o'ng chekkalari → yuz kengligi
  faceEdge2: 454,
  noseTip: 1,
  eye1: 33, // Ko'zlarning tashqi burchaklari
  eye2: 263,
  chin: 152 // Iyak pastki nuqtasi
}

export const MIN_LANDMARKS = 468
export const MIN_FACE_WIDTH_PX = 200 // Bundan kichik yuzda mayda belgilar ko'rinmaydi
export const TARGET_FACE_WIDTH = 400 // Tahlil oldidan yuz shu kenglikka keltiriladi (natijalar solishtiriladigan bo'lsin)
const MAX_YAW_OFFSET = 0.15 // ~16° gacha yonga burilishga ruxsat
const PITCH_RANGE: [number, number] = [0.2, 0.45] // To'g'ri qaraganda ~0.31

const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)

export function faceWidth(lm: Point[]): number {
  return dist(lm[L.faceEdge1], lm[L.faceEdge2])
}

// 0.5 → to'g'ri qaragan; 0.5 dan uzoqlashsa → yonga burilgan
export function yawRatio(lm: Point[]): number {
  const a = lm[L.faceEdge1].x
  const b = lm[L.faceEdge2].x
  return (lm[L.noseTip].x - a) / (b - a)
}

// Burun uchining ko'zlar va iyak orasidagi o'rni (bosh tepaga/pastga egilganini bildiradi)
export function pitchRatio(lm: Point[]): number {
  const eyesY = (lm[L.eye1].y + lm[L.eye2].y) / 2
  return (lm[L.noseTip].y - eyesY) / (lm[L.chin].y - eyesY)
}

// Geometriya bo'yicha sifat muammolari (piksel tahlilidan oldin, renderer'da)
export function geometryIssues(faces: Point[][]): FaceQualityIssue[] {
  if (faces.length === 0) return ['no_face']
  if (faces.length > 1) return ['multiple_faces']
  const lm = faces[0]
  if (lm.length < MIN_LANDMARKS) return ['no_face']
  const issues: FaceQualityIssue[] = []
  if (faceWidth(lm) < MIN_FACE_WIDTH_PX) issues.push('face_too_small')
  const yaw = yawRatio(lm)
  const pitch = pitchRatio(lm)
  if (!Number.isFinite(yaw) || Math.abs(yaw - 0.5) > MAX_YAW_OFFSET) issues.push('not_frontal')
  else if (!Number.isFinite(pitch) || pitch < PITCH_RANGE[0] || pitch > PITCH_RANGE[1])
    issues.push('not_frontal')
  return issues
}

export function faceRegions(lm: Point[]): FaceRegion[] {
  const w = faceWidth(lm)
  return FACE_REGION_NAMES.map((name) => {
    const { index, radius } = REGION_SPEC[name]
    return { name, x: lm[index].x, y: lm[index].y, r: radius * w }
  })
}

// Yuz atrofidagi kesish oynasi (nuqtalar chegarasi + 15% zaxira), rasm ichida qoladi
export function cropBox(
  lm: Point[],
  imageWidth: number,
  imageHeight: number
): { x: number; y: number; width: number; height: number } {
  const xs = lm.map((p) => p.x)
  const ys = lm.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const padX = (maxX - minX) * 0.15
  const padY = (maxY - minY) * 0.15
  const x = Math.max(0, Math.floor(minX - padX))
  const y = Math.max(0, Math.floor(minY - padY))
  const right = Math.min(imageWidth, Math.ceil(maxX + padX))
  const bottom = Math.min(imageHeight, Math.ceil(maxY + padY))
  return { x, y, width: right - x, height: bottom - y }
}

// Zonalarni kesilgan va masshtablangan rasm koordinatalariga o'tkazish
export function transformRegions(
  regions: FaceRegion[],
  box: { x: number; y: number },
  scale: number
): FaceRegion[] {
  return regions.map((r) => ({
    name: r.name,
    x: (r.x - box.x) * scale,
    y: (r.y - box.y) * scale,
    r: r.r * scale
  }))
}
