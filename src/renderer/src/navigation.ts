import type { SvgIconComponent } from '@mui/icons-material'
import DashboardOutlined from '@mui/icons-material/DashboardOutlined'
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import FaceRetouchingNaturalOutlined from '@mui/icons-material/FaceRetouchingNaturalOutlined'
import WbTwilightOutlined from '@mui/icons-material/WbTwilightOutlined'
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined'
import ForumOutlined from '@mui/icons-material/ForumOutlined'
import ScienceOutlined from '@mui/icons-material/ScienceOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import type { TranslationKey } from './i18n'

// Menyu sahifalari (desktop ilovada URL kerak emas, oddiy holat (state) bilan almashtiramiz)
export type PageId =
  'dashboard' | 'shelf' | 'faceScan' | 'routine' | 'diary' | 'ask' | 'aiLab' | 'settings'

export type NavItem = {
  id: PageId
  icon: SvgIconComponent
  labelKey: TranslationKey
}

// Yuqoridagi asosiy menyu
export const MAIN_NAV: NavItem[] = [
  { id: 'dashboard', icon: DashboardOutlined, labelKey: 'nav.dashboard' },
  { id: 'shelf', icon: Inventory2Outlined, labelKey: 'nav.shelf' },
  { id: 'faceScan', icon: FaceRetouchingNaturalOutlined, labelKey: 'nav.faceScan' },
  { id: 'routine', icon: WbTwilightOutlined, labelKey: 'nav.routine' },
  { id: 'diary', icon: MenuBookOutlined, labelKey: 'nav.diary' },
  { id: 'ask', icon: ForumOutlined, labelKey: 'nav.ask' },
  { id: 'aiLab', icon: ScienceOutlined, labelKey: 'nav.aiLab' }
]

// Pastki menyu (sozlamalar alohida turadi)
export const BOTTOM_NAV: NavItem[] = [
  { id: 'settings', icon: SettingsOutlined, labelKey: 'nav.settings' }
]

export const ALL_NAV: NavItem[] = [...MAIN_NAV, ...BOTTOM_NAV]
