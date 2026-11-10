// Ilova sozlamalari: kalitlar, ruxsat etilgan qiymatlar va standart (default) qiymatlar

export const LANGUAGES = ['uz', 'ko', 'en'] as const // O'zbek, koreys, ingliz
export const THEME_MODES = ['light', 'dark', 'system'] as const // system → kompyuter sozlamasiga qarab
export const REMINDER_MODES = ['on', 'off'] as const // Muddat eslatmalari

export type Language = (typeof LANGUAGES)[number]
export type ThemeMode = (typeof THEME_MODES)[number]
export type ReminderMode = (typeof REMINDER_MODES)[number]

export type AppSettings = {
  language: Language
  theme: ThemeMode
  reminders: ReminderMode
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'uz',
  theme: 'system',
  reminders: 'on'
}
