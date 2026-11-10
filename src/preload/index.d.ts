import { ElectronAPI } from '@electron-toolkit/preload'
import type { GlowLabApi } from './index'

// window.electron va window.api turlarini renderer uchun e'lon qilamiz
declare global {
  interface Window {
    electron: ElectronAPI
    api: GlowLabApi
  }
}
