import type { PageId } from '../navigation'
import { AiLabPage } from './AiLabPage'
import { AskPage } from './AskPage'
import { DashboardPage } from './DashboardPage'
import { DiaryPage } from './DiaryPage'
import { FaceScanPage } from './FaceScanPage'
import { RoutinePage } from './RoutinePage'
import { SettingsPage } from './SettingsPage'
import { ShelfPage } from './ShelfPage'

// Sahifa ID → komponent (oddiy "router")
export const PAGES: Record<PageId, () => React.JSX.Element> = {
  dashboard: DashboardPage,
  shelf: ShelfPage,
  faceScan: FaceScanPage,
  routine: RoutinePage,
  diary: DiaryPage,
  ask: AskPage,
  aiLab: AiLabPage,
  settings: SettingsPage
}
