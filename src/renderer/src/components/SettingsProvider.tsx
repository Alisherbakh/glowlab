import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_SETTINGS, type AppSettings } from '../../../shared/settings'
import { translate, type TranslationKey } from '../i18n'
import { SettingsContext } from '../hooks/settingsContext'

// Butun ilovani o'raydi: sozlamalarni yuklaydi va hammaga beradi
export function SettingsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<TranslationKey | null>(null)

  useEffect(() => {
    window.api.settings
      .get() // Ilova ochilganda bazadan o'qiymiz
      .then(setSettings)
      .catch(() => setSettings(DEFAULT_SETTINGS)) // Xato bo'lsa → standart qiymatlar
      .finally(() => setLoaded(true))
  }, [])

  const update = useCallback(async (patch: Partial<AppSettings>) => {
    setError(null)
    try {
      const saved = await window.api.settings.set(patch) // Main tekshirib saqlaydi
      setSettings(saved)
    } catch {
      setError('settings.saveError')
    }
  }, [])

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(settings.language, key, params),
    [settings.language]
  )

  const value = useMemo(
    () => ({ settings, loaded, error, update, t }),
    [settings, loaded, error, update, t]
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
