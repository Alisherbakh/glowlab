import type { CompatResult, CompatSource } from '../../shared/compatibility'
import { checkRoutines, type RoutineItem } from '../ai/compatRules'
import { findIngredientNamesByProducts } from '../models/analysis.model'
import { findKbChunksBySlugs } from '../models/kb.model'
import { getProfile } from './profile.service'
import { getRoutines } from './routine.service'

// Joriy AM/PM tartibini qoidalar bo'yicha tekshiradi (oflayn, internet kerak emas)
export function checkCompatibility(): CompatResult {
  const routines = getRoutines()
  const ids = [...new Set([...routines.AM, ...routines.PM].map((p) => p.id))]
  const ingredients = findIngredientNamesByProducts(ids)

  const toItems = (list: typeof routines.AM): RoutineItem[] =>
    list.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      ingredients: ingredients.get(p.id) ?? []
    }))

  const findings = checkRoutines(
    { AM: toItems(routines.AM), PM: toItems(routines.PM) },
    getProfile()?.skinType ?? null
  )

  // Manba id → bilimlar bazasidagi sarlavha va havola
  const allSlugs = [...new Set(findings.flatMap((f) => f.sourceIds))]
  const bySlug = new Map(findKbChunksBySlugs(allSlugs).map((c) => [c.slug, c]))

  return {
    findings: findings.map(({ sourceIds, ...f }) => ({
      ...f,
      sources: sourceIds
        .map((slug) => bySlug.get(slug))
        .filter((c) => c !== undefined)
        .map((c): CompatSource => ({ title: c.title, sourceTitle: c.source, url: c.url }))
    })),
    checkedProducts: ids.length,
    scannedProducts: ids.filter((id) => (ingredients.get(id)?.length ?? 0) > 0).length
  }
}
