import { createContext } from 'react'
import type { SkinProfile, SkinProfileInput } from '../../../shared/profile'

export type ProfileContextValue = {
  profile: SkinProfile | null // null → hali onboarding o'tilmagan
  loaded: boolean
  save: (input: SkinProfileInput) => Promise<void> // Xato bo'lsa throw qiladi
  editing: boolean // Sozlamalardan tahrirlash ochiqmi
  setEditing: (value: boolean) => void
}

export const ProfileContext = createContext<ProfileContextValue | null>(null)
