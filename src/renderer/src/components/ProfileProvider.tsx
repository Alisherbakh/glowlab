import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SkinProfile, SkinProfileInput } from '../../../shared/profile'
import { ProfileContext } from '../hooks/profileContext'

// Teri profilini yuklaydi va hammaga beradi
export function ProfileProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [profile, setProfile] = useState<SkinProfile | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState(false) // Tahrirlash ekrani ochiqmi

  useEffect(() => {
    window.api.profile
      .get() // Ilova ochilganda bazadan o'qiymiz
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoaded(true))
  }, [])

  const save = useCallback(async (input: SkinProfileInput) => {
    const saved = await window.api.profile.save(input) // Main zod bilan tekshiradi
    setProfile(saved)
  }, [])

  const value = useMemo(
    () => ({ profile, loaded, save, editing, setEditing }),
    [profile, loaded, save, editing]
  )
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}
