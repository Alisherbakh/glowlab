import { createContext, useContext } from 'react'
import type { PageId } from '../navigation'

// Istalgan sahifadan boshqa sahifaga o'tish uchun (masalan Dashboard → Shelf)
export const NavContext = createContext<(page: PageId) => void>(() => {})

export function useNavigate(): (page: PageId) => void {
  return useContext(NavContext)
}
