import { createContext } from 'react'
import type { AppSettings } from '../../../shared/settings'
import type { TranslationKey } from '../i18n'

export type SettingsContextValue = {
  settings: AppSettings
  loaded: boolean // Bazadan o'qib bo'lindimi
  error: TranslationKey | null // Saqlashda xato bo'lsa (tarjima kaliti)
  update: (patch: Partial<AppSettings>) => Promise<void> // Sozlamani o'zgartirish + saqlash
  t: (key: TranslationKey, params?: Record<string, string | number>) => string // Tarjima funksiyasi
}

// Sozlamalar konteksti (Provider va hook alohida fayllarda — Fast Refresh talabi)
export const SettingsContext = createContext<SettingsContextValue | null>(null)
