import type {
  CompatFinding,
  CompatProduct,
  CompatRule,
  CompatSeverity
} from '../../shared/compatibility'
import type { SkinType } from '../../shared/profile'
import type { RoutineSlot } from '../../shared/routine'

// Moslik qoidalari: toza funksiyalar (Electron va bazasiz test qilinadi).
// Har bir qoida bilimlar bazasidagi (kb.json) manbaga tayanadi — manbada yo'q da'vo qilinmaydi.

export type ActiveGroup =
  'retinoid' | 'aha' | 'bha' | 'fragrance' | 'drying_alcohol' | 'mineral_filter'

// INCI nomlari bo'yicha guruhlar. Ehtiyotkor ro'yxat:
// - citric / malic acid kiritilmagan (ko'pincha faqat pH sozlovchi)
// - cetyl / stearyl / cetearyl alcohol kiritilmagan (yog'li spirtlar, quritmaydi)
const GROUP_TERMS: Record<ActiveGroup, RegExp[]> = {
  retinoid: [
    /\bretinol\b/,
    /\bretinal\b/,
    /\bretinaldehyde\b/,
    /\bretinyl (palmitate|acetate|propionate|retinoate)\b/,
    /\btretinoin\b/,
    /\badapalene\b/,
    /\bhydroxypinacolone retinoate\b/
  ],
  aha: [/\bglycolic acid\b/, /\blactic acid\b/, /\bmandelic acid\b/],
  bha: [/\bsalicylic acid\b/],
  fragrance: [/\bparfum\b/, /\bfragrance\b/],
  drying_alcohol: [
    /^alcohol$/,
    /\balcohol denat\b/,
    /\bsd alcohol\b/,
    /\bethanol\b/,
    /\bisopropyl alcohol\b/
  ],
  mineral_filter: [/\bzinc oxide\b/, /\btitanium dioxide\b/]
}

// Nomdan aniqlash (tarkib skan qilinmagan bo'lsa) — faqat aniq so'zlar
const NAME_TERMS: Partial<Record<ActiveGroup, RegExp[]>> = {
  retinoid: [/\bretinol\b/, /\bretinal\b/, /\bretinoid\b/, /\btretinoin\b/, /\badapalene\b/],
  aha: [/\bglycolic\b/, /\blactic acid\b/, /\bmandelic\b/, /\baha\b/],
  bha: [/\bsalicylic\b/, /\bbha\b/]
}

export type RoutineItem = {
  id: number
  name: string
  category: string | null
  ingredients: string[] // Skan qilingan tarkib (bo'sh bo'lishi mumkin)
}

type Detected = { groups: Map<ActiveGroup, string[]>; fromName: boolean; scanned: boolean }

// Mahsulotdagi faol guruhlarni topadi (avval tarkib, bo'lmasa nom)
export function detectGroups(item: RoutineItem): Detected {
  const groups = new Map<ActiveGroup, string[]>()
  const scanned = item.ingredients.length > 0
  if (scanned) {
    for (const raw of item.ingredients) {
      const name = raw.trim().toLowerCase()
      for (const [group, terms] of Object.entries(GROUP_TERMS) as [ActiveGroup, RegExp[]][]) {
        if (terms.some((re) => re.test(name))) {
          groups.set(group, [...(groups.get(group) ?? []), raw.trim()])
        }
      }
    }
    return { groups, fromName: false, scanned }
  }
  const name = item.name.toLowerCase()
  for (const [group, terms] of Object.entries(NAME_TERMS) as [ActiveGroup, RegExp[]][]) {
    const hit = terms.find((re) => re.test(name))
    if (hit) groups.set(group, [name.match(hit)![0]])
  }
  return { groups, fromName: groups.size > 0, scanned }
}

function isSunscreen(item: RoutineItem, d: Detected): boolean {
  return (
    item.category === 'sunscreen' ||
    d.groups.has('mineral_filter') ||
    /\bspf|\bsun ?(screen|block)\b/i.test(item.name) // "SPF50", "Sun screen", "Sunblock"
  )
}

// Har bir qoida → manba (kb.json'dagi id'lar)
export const RULE_SOURCES: Record<CompatRule, string[]> = {
  retinoid_morning: ['retinoid-how'],
  no_sunscreen: ['aha-sun', 'bha-salicylic', 'retinoid-how'],
  irritant_stack: ['patch-test', 'oily-skin-care', 'healthy-habits'],
  dry_skin_irritants: ['dry-skin-ingredients'],
  sensitive_irritants: ['sensitive-skin-moisturizer'],
  unscanned: []
}

const SEVERITY: Record<CompatRule, CompatSeverity> = {
  retinoid_morning: 'warning',
  no_sunscreen: 'warning',
  irritant_stack: 'caution',
  dry_skin_irritants: 'caution',
  sensitive_irritants: 'caution',
  unscanned: 'info'
}

const IRRITANT_ACTIVES: ActiveGroup[] = ['retinoid', 'aha', 'bha']
const SUN_SENSITIZING: ActiveGroup[] = ['retinoid', 'aha', 'bha']
const DRY_AVOID: ActiveGroup[] = ['drying_alcohol', 'fragrance', 'retinoid'] // AAD: quruq teri
const SENSITIVE_AVOID: ActiveGroup[] = ['drying_alcohol', 'fragrance', 'aha'] // AAD: sezgir teri

export type RuleFinding = Omit<CompatFinding, 'sources'> & { sourceIds: string[] }

export function checkRoutines(
  routines: Record<RoutineSlot, RoutineItem[]>,
  skinType: SkinType | null
): RuleFinding[] {
  const findings: RuleFinding[] = []
  const cache = new Map<number, Detected>()
  const det = (item: RoutineItem): Detected => {
    if (!cache.has(item.id)) cache.set(item.id, detectGroups(item))
    return cache.get(item.id)!
  }
  const toProduct = (item: RoutineItem, groups: ActiveGroup[]): CompatProduct => {
    const d = det(item)
    const matches = groups.flatMap((g) => d.groups.get(g) ?? [])
    return { id: item.id, name: item.name, matches: [...new Set(matches)], fromName: d.fromName }
  }
  const withGroups = (items: RoutineItem[], groups: ActiveGroup[]): RoutineItem[] =>
    items.filter((it) => groups.some((g) => det(it).groups.has(g)))
  const add = (
    rule: CompatRule,
    slot: RoutineSlot | null,
    items: RoutineItem[],
    groups: ActiveGroup[]
  ): void => {
    findings.push({
      rule,
      severity: SEVERITY[rule],
      slot,
      products: items.map((it) => toProduct(it, groups)),
      sourceIds: RULE_SOURCES[rule]
    })
  }

  const all = uniqueItems([...routines.AM, ...routines.PM])

  // 1) Retinoid ertalab
  const amRetinoids = withGroups(routines.AM, ['retinoid'])
  if (amRetinoids.length > 0) add('retinoid_morning', 'AM', amRetinoids, ['retinoid'])

  // 2) Sezuvchanlik oshiruvchi modda bor, ertalab quyosh kremi yo'q
  const sensitizers = withGroups(all, SUN_SENSITIZING)
  if (sensitizers.length > 0 && !routines.AM.some((it) => isSunscreen(it, det(it)))) {
    add('no_sunscreen', null, sensitizers, SUN_SENSITIZING)
  }

  // 3) Bitta tartibda 2+ mahsulotda tirnash chaqirishi mumkin bo'lgan faol modda
  for (const slot of ['AM', 'PM'] as const) {
    const actives = withGroups(routines[slot], IRRITANT_ACTIVES)
    if (actives.length >= 2) add('irritant_stack', slot, actives, IRRITANT_ACTIVES)
  }

  // 4–5) Profilga bog'liq
  if (skinType === 'dry') {
    const items = withGroups(all, DRY_AVOID)
    if (items.length > 0) add('dry_skin_irritants', null, items, DRY_AVOID)
  }
  if (skinType === 'sensitive') {
    const items = withGroups(all, SENSITIVE_AVOID)
    if (items.length > 0) add('sensitive_irritants', null, items, SENSITIVE_AVOID)
  }

  // 6) Tarkibi skan qilinmagan mahsulotlar (nomidan topilgani ham — tekshiruv to'liq emas)
  const unknown = all.filter((it) => !det(it).scanned)
  if (unknown.length > 0) add('unscanned', null, unknown, [])

  return findings
}

function uniqueItems(items: RoutineItem[]): RoutineItem[] {
  const seen = new Set<number>()
  return items.filter((it) => (seen.has(it.id) ? false : (seen.add(it.id), true)))
}
