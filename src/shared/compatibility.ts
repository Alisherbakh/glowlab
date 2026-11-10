import type { RoutineSlot } from './routine'

// Tartib (AM/PM) moslik tekshiruvi — qoidaga asoslangan, oflayn (main + renderer umumiy)

export const COMPAT_RULES = [
  'retinoid_morning', // Ertalab retinoid
  'no_sunscreen', // Quyoshga sezuvchanlik oshiruvchi modda bor, ertalab himoya kremi yo'q
  'irritant_stack', // Bitta tartibda bir nechta tirnash chaqirishi mumkin bo'lgan faol modda
  'dry_skin_irritants', // Quruq teri + spirt / atir / retinoid
  'sensitive_irritants', // Sezgir teri + spirt / atir / AHA
  'unscanned' // Tarkibi noma'lum mahsulotlar
] as const
export type CompatRule = (typeof COMPAT_RULES)[number]

export type CompatSeverity = 'warning' | 'caution' | 'info'

export type CompatProduct = {
  id: number
  name: string
  matches: string[] // Topilgan moddalar ("Retinol", "Glycolic Acid")
  fromName: boolean // Tarkibdan emas, mahsulot nomidan aniqlandi
}

export type CompatSource = { title: string; sourceTitle: string; url: string }

export type CompatFinding = {
  rule: CompatRule
  severity: CompatSeverity
  slot: RoutineSlot | null // null → ikkala tartibga tegishli
  products: CompatProduct[]
  sources: CompatSource[]
}

export type CompatResult = {
  findings: CompatFinding[]
  checkedProducts: number // Tartiblardagi mahsulotlar soni (takrorsiz)
  scannedProducts: number // Shulardan tarkibi skan qilinganlari
}
