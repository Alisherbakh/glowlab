import { z } from 'zod'
import { MAX_ROUTINE_STEPS, ROUTINE_SLOTS, type Routines } from '../../shared/routine'
import {
  countExistingProducts,
  findRoutineId,
  findRoutineProducts,
  replaceRoutineSteps
} from '../models/routine.model'
import { toProduct } from './product.service'

const slotSchema = z.enum(ROUTINE_SLOTS)
const idsSchema = z
  .array(z.number().int().positive())
  .max(MAX_ROUTINE_STEPS)
  .refine((ids) => new Set(ids).size === ids.length, 'Duplicate product') // Bir mahsulot ikki marta bo'lmaydi

function routineIdOrThrow(slot: string): number {
  const id = findRoutineId(slot)
  if (id === undefined) throw new Error(`Routine ${slot} not found`) // Migratsiya AM/PM ni yaratgan bo'lishi kerak
  return id
}

export function getRoutines(): Routines {
  return {
    AM: findRoutineProducts(routineIdOrThrow('AM')).map(toProduct),
    PM: findRoutineProducts(routineIdOrThrow('PM')).map(toProduct)
  }
}

// Bitta slotni to'liq saqlaydi (tartib = massivdagi tartib)
export function saveRoutine(slot: unknown, productIds: unknown): Routines {
  const s = slotSchema.parse(slot)
  const ids = idsSchema.parse(productIds)
  if (countExistingProducts(ids) !== ids.length) throw new Error('Unknown product') // O'chirilgan mahsulot yuborilmasin
  replaceRoutineSteps(routineIdOrThrow(s), ids)
  return getRoutines()
}
