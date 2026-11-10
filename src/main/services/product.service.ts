import { z } from 'zod'
import {
  PRODUCT_CATEGORIES,
  computeExpiresAt,
  isValidDate,
  todayLocal,
  type Product,
  type ProductCategory
} from '../../shared/products'
import { clearReminders } from '../models/reminder.model'
import {
  deleteProduct,
  findAllProducts,
  findProductById,
  insertProduct,
  updateProduct,
  type ProductRow
} from '../models/product.model'

const productInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120), // Nomi majburiy
    brand: z
      .string()
      .trim()
      .max(80)
      .nullable()
      .transform((v) => (v ? v : null)), // Bo'sh matn → null
    category: z.enum(PRODUCT_CATEGORIES).nullable(),
    openedAt: z
      .string()
      .nullable()
      .refine((v) => v === null || isValidDate(v), 'Invalid date') // Mavjud sana bo'lishi shart
      .refine((v) => v === null || v <= todayLocal(), 'Opened date cannot be in the future'), // Kelajakda ochib bo'lmaydi
    paoMonths: z.number().int().min(1).max(60)
  })
  .strict()

const idSchema = z.number().int().positive()

// Bazadagi qator → Product (snake_case → camelCase)
export function toProduct(row: ProductRow): Product {
  const category = (PRODUCT_CATEGORIES as readonly string[]).includes(row.category ?? '')
    ? (row.category as ProductCategory)
    : null
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category,
    openedAt: row.opened_at,
    paoMonths: row.pao_months,
    expiresAt: row.expires_at,
    createdAt: row.created_at
  }
}

// Tekshirilgan ma'lumot → bazaga yoziladigan qator (muddatni shu yerda hisoblaymiz)
function toWrite(input: unknown): Omit<ProductRow, 'id' | 'created_at'> {
  const v = productInputSchema.parse(input)
  return {
    name: v.name,
    brand: v.brand,
    category: v.category,
    opened_at: v.openedAt,
    pao_months: v.paoMonths,
    expires_at: computeExpiresAt(v.openedAt, v.paoMonths)
  }
}

export function listProducts(): Product[] {
  return findAllProducts().map(toProduct)
}

export function createProduct(input: unknown): Product {
  const id = insertProduct(toWrite(input))
  return toProduct(findProductById(id)!)
}

export function editProduct(id: unknown, input: unknown): Product {
  const productId = idSchema.parse(id)
  if (updateProduct(productId, toWrite(input)) === 0) throw new Error('Product not found')
  clearReminders(productId) // Sana o'zgargan bo'lishi mumkin → eslatmalar qaytadan yuborilsin
  return toProduct(findProductById(productId)!)
}

export function removeProduct(id: unknown): void {
  const productId = idSchema.parse(id)
  if (deleteProduct(productId) === 0) throw new Error('Product not found')
}
