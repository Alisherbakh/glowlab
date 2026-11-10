import { readFile } from 'fs/promises'
import { join } from 'path'
import { z } from 'zod'
import { FACE_REGION_NAMES } from '../../shared/faceGeometry'
import {
  FACE_METRICS,
  SCAN_SOURCES,
  toMetricResults,
  type FaceAnalysisResult,
  type RawFaceMetrics,
  type SavedFaceScan,
  type ScanSource
} from '../../shared/faceScan'
import { AGE_RANGES, SKIN_TYPES } from '../../shared/profile'
import { analyzeFacePixelsInWorker } from '../ai/faceAnalyzer'
import { getModelDir } from '../ai/modelDir'
import {
  deleteFaceScanById,
  findFaceScanById,
  findRecentFaceScans,
  insertFaceScan,
  type FaceScanRow
} from '../models/faceScan.model'
import { getProfile } from './profile.service'

const FACE_MODEL_FILE = 'face_landmarker.task' // Google'ning rasmiy MediaPipe modeli
const MAX_SIDE = 1600 // Kesilgan yuz rasmi bundan katta bo'lmaydi (odatda ~550x650)

// Renderer'dan: kesilgan yuz (RGBA) + zonalar (doiralar)
const analyzeSchema = z
  .object({
    width: z.number().int().min(100).max(MAX_SIDE),
    height: z.number().int().min(100).max(MAX_SIDE),
    rgba: z.instanceof(Uint8Array),
    regions: z
      .array(
        z
          .object({
            name: z.enum(FACE_REGION_NAMES),
            x: z.number().finite(),
            y: z.number().finite(),
            r: z.number().finite().positive()
          })
          .strict()
      )
      .length(FACE_REGION_NAMES.length)
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.rgba.byteLength !== v.width * v.height * 4)
      ctx.addIssue({ code: 'custom', message: 'Bad image size' })
    if (new Set(v.regions.map((r) => r.name)).size !== v.regions.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate regions' })
    for (const r of v.regions) {
      if (r.x < 0 || r.y < 0 || r.x > v.width || r.y > v.height)
        ctx.addIssue({ code: 'custom', message: 'Region outside image' })
    }
  })

const score01 = z.number().finite().min(0).max(1)
const saveSchema = z
  .object({
    source: z.enum(SCAN_SOURCES),
    qualityScore: score01,
    raw: z.object(Object.fromEntries(FACE_METRICS.map((m) => [m, score01]))).strict()
  })
  .strict()

const rowProfileSchema = z.object({ ageRange: z.enum(AGE_RANGES), skinType: z.enum(SKIN_TYPES) })

// Model fayli baytlari (renderer'dagi MediaPipe uchun). Yo'q bo'lsa → null (sahifa yo'riqnoma ko'rsatadi)
export async function getFaceModelBytes(): Promise<Uint8Array | null> {
  try {
    const bytes = await readFile(join(getModelDir(), FACE_MODEL_FILE))
    if (bytes.byteLength < 100_000 || bytes.byteLength > 50_000_000) return null // Buzilgan/noto'g'ri fayl
    return new Uint8Array(bytes)
  } catch {
    return null
  }
}

export async function analyzeFace(input: unknown): Promise<FaceAnalysisResult> {
  const data = analyzeSchema.parse(input)
  const profile = getProfile()
  if (!profile) return { status: 'no_profile' }

  const res = await analyzeFacePixelsInWorker(data)
  if (res.issues.length > 0) return { status: 'quality', issues: res.issues } // Sifatsiz → natija ko'rsatilmaydi
  return {
    status: 'ok',
    raw: res.raw,
    metrics: toMetricResults(res.raw, profile.ageRange, profile.skinType),
    qualityScore: res.qualityScore,
    profile: { ageRange: profile.ageRange, skinType: profile.skinType }
  }
}

function toSaved(row: FaceScanRow): SavedFaceScan | null {
  const prof = rowProfileSchema.safeParse({ ageRange: row.age_range, skinType: row.skin_type })
  if (!prof.success) return null // Buzilgan qator ko'rsatilmaydi
  const raw: RawFaceMetrics = {
    oiliness: row.oiliness ?? 0,
    redness: row.redness ?? 0,
    texture: row.texture ?? 0,
    spots: row.spots ?? 0,
    darkCircles: row.dark_circles ?? 0,
    evenness: row.evenness ?? 0
  }
  return {
    id: row.id,
    createdAt: row.created_at,
    source: (SCAN_SOURCES as readonly string[]).includes(row.source ?? '')
      ? (row.source as ScanSource)
      : 'photo',
    qualityScore: row.quality_score,
    metrics: toMetricResults(raw, prof.data.ageRange, prof.data.skinType) // Skan paytidagi profil bo'yicha
  }
}

export function saveFaceScan(input: unknown): SavedFaceScan {
  const data = saveSchema.parse(input)
  const profile = getProfile()
  if (!profile) throw new Error('Profile is required')
  const raw = data.raw as RawFaceMetrics
  const id = insertFaceScan({
    qualityScore: data.qualityScore,
    ...raw,
    ageRange: profile.ageRange,
    skinType: profile.skinType,
    source: data.source
  })
  const saved = toSaved(findFaceScanById(id)!)
  if (!saved) throw new Error('Saved scan is invalid')
  return saved
}

export function listFaceScans(): SavedFaceScan[] {
  return findRecentFaceScans(20)
    .map(toSaved)
    .filter((s): s is SavedFaceScan => s !== null)
}

export function deleteFaceScan(id: unknown): void {
  deleteFaceScanById(z.number().int().positive().parse(id))
}
