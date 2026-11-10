import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { DbInfo, PingResult } from '../shared/types'
import type { AppSettings } from '../shared/settings'
import type { SkinProfile, SkinProfileInput } from '../shared/profile'
import type { Product, ProductInput } from '../shared/products'
import type {
  AiKeyStatus,
  AnalyzeLabelInput,
  AnalyzeLabelResult,
  SavedAnalysis
} from '../shared/analysis'
import type { RoutineSlot, Routines } from '../shared/routine'
import type { ClassifyResult } from '../shared/classifier'
import type {
  FaceAnalysisResult,
  RawFaceMetrics,
  SavedFaceScan,
  ScanSource
} from '../shared/faceScan'
import type { FaceRegion } from '../shared/faceGeometry'
import type { DiaryEntry, DiaryEntryInput } from '../shared/diary'
import type { AskResult, KbStatus } from '../shared/ask'
import type { CompatResult } from '../shared/compatibility'
import type { LabInfo } from '../shared/aiLab'

// Renderer'ga beriladigan API — renderer faqat shu funksiyalar orqali main bilan gaplashadi
const api = {
  app: {
    ping: (): Promise<PingResult> => ipcRenderer.invoke('app:ping'), // IPC test
    dbInfo: (): Promise<DbInfo> => ipcRenderer.invoke('app:dbInfo') // Baza holati
  },
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'), // Sozlamalarni olish
    set: (patch: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:set', patch) // Sozlamani saqlash
  },
  profile: {
    get: (): Promise<SkinProfile | null> => ipcRenderer.invoke('profile:get'), // null → onboarding
    save: (input: SkinProfileInput): Promise<SkinProfile> =>
      ipcRenderer.invoke('profile:save', input)
  },
  products: {
    list: (): Promise<Product[]> => ipcRenderer.invoke('products:list'), // Barcha mahsulotlar
    create: (input: ProductInput): Promise<Product> => ipcRenderer.invoke('products:create', input),
    update: (id: number, input: ProductInput): Promise<Product> =>
      ipcRenderer.invoke('products:update', id, input),
    remove: (id: number): Promise<void> => ipcRenderer.invoke('products:delete', id)
  },
  ai: {
    analyzeLabel: (input: AnalyzeLabelInput): Promise<AnalyzeLabelResult> =>
      ipcRenderer.invoke('ai:analyzeLabel', input), // Rasm baytlari main'ga yuboriladi
    classifyProduct: (rgb: Uint8Array): Promise<ClassifyResult> =>
      ipcRenderer.invoke('ai:classifyProduct', rgb), // 224x224 RGB, oflayn model (internet kerak emas)
    latestAnalysis: (productId: number): Promise<SavedAnalysis | null> =>
      ipcRenderer.invoke('ai:latestAnalysis', productId),
    keyStatus: (): Promise<AiKeyStatus> => ipcRenderer.invoke('ai:keyStatus'),
    setKey: (key: string | null): Promise<void> => ipcRenderer.invoke('ai:setKey', key),
    checkCompatibility: (): Promise<CompatResult> => ipcRenderer.invoke('ai:checkCompatibility'), // Joriy tartib tekshiriladi
    labInfo: (): Promise<LabInfo> => ipcRenderer.invoke('ai:labInfo') // AI Lab ma'lumotlari
  },
  face: {
    modelBytes: (): Promise<Uint8Array | null> => ipcRenderer.invoke('face:modelBytes'), // MediaPipe modeli
    analyze: (input: {
      width: number
      height: number
      rgba: Uint8Array
      regions: FaceRegion[]
    }): Promise<FaceAnalysisResult> => ipcRenderer.invoke('face:analyze', input), // Faqat kesilgan yuz piksellari
    save: (input: {
      source: ScanSource
      qualityScore: number
      raw: RawFaceMetrics
    }): Promise<SavedFaceScan> => ipcRenderer.invoke('face:save', input), // Faqat raqamlar saqlanadi
    list: (): Promise<SavedFaceScan[]> => ipcRenderer.invoke('face:list'),
    remove: (id: number): Promise<void> => ipcRenderer.invoke('face:delete', id)
  },
  diary: {
    list: (): Promise<DiaryEntry[]> => ipcRenderer.invoke('diary:list'),
    create: (input: DiaryEntryInput): Promise<DiaryEntry> =>
      ipcRenderer.invoke('diary:create', input),
    update: (id: number, input: DiaryEntryInput): Promise<DiaryEntry> =>
      ipcRenderer.invoke('diary:update', id, input),
    remove: (id: number): Promise<void> => ipcRenderer.invoke('diary:delete', id)
  },
  routines: {
    get: (): Promise<Routines> => ipcRenderer.invoke('routines:get'),
    save: (slot: RoutineSlot, productIds: number[]): Promise<Routines> =>
      ipcRenderer.invoke('routines:save', slot, productIds) // Butun tartib birdaniga saqlanadi
  },
  ask: {
    question: (question: string): Promise<AskResult> =>
      ipcRenderer.invoke('ask:question', question), // Faqat savol matni yuboriladi
    status: (): Promise<KbStatus> => ipcRenderer.invoke('ask:status')
  }
}

// API turini eksport qilamiz (index.d.ts ishlatadi)
export type GlowLabApi = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI) // Electron yordamchi API'lari
    contextBridge.exposeInMainWorld('api', api) // Bizning API → window.api
  } catch (error) {
    console.error(error)
  }
} else {
  // contextIsolation o'chirilgan holat (bizda yoqilgan, bu faqat zaxira)
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
