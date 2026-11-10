import { useContext } from 'react'
import { ProfileContext, type ProfileContextValue } from './profileContext'

// Komponentlarda: const { profile, save } = useProfile()
export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider>')
  return ctx
}
