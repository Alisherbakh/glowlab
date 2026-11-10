import type { Product } from './products'

// Ertalabki / kechki parvarish tartibi (main + renderer umumiy)

export const ROUTINE_SLOTS = ['AM', 'PM'] as const
export type RoutineSlot = (typeof ROUTINE_SLOTS)[number]

export type Routines = Record<RoutineSlot, Product[]> // Har bir slot: tartib bo'yicha mahsulotlar

export const MAX_ROUTINE_STEPS = 15 // Bitta tartibda ko'pi bilan 15 qadam
