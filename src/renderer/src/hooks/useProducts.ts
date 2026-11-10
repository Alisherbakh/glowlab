import { useCallback, useEffect, useState } from 'react'
import type { Product, ProductInput } from '../../../shared/products'

// Mahsulotlar ro'yxati + CRUD amallari (har bir sahifa o'zi chaqiradi)
export function useProducts(): {
  products: Product[]
  loading: boolean
  error: boolean
  reload: () => Promise<void>
  create: (input: ProductInput) => Promise<void>
  update: (id: number, input: ProductInput) => Promise<void>
  remove: (id: number) => Promise<void>
} {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const reload = useCallback(async () => {
    setError(false)
    try {
      setProducts(await window.api.products.list()) // Bazadan tartiblangan ro'yxat
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Sahifa ochilganda yuklaymiz (setState faqat javob kelgach chaqiriladi)
    let active = true // Sahifa yopilib qolsa, eski javobni e'tiborsiz qoldiramiz
    window.api.products
      .list()
      .then((list) => active && setProducts(list))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  // Har bir o'zgarishdan keyin ro'yxatni qayta yuklaymiz (tartib main'da hisoblanadi)
  const create = useCallback(
    async (input: ProductInput) => {
      await window.api.products.create(input)
      await reload()
    },
    [reload]
  )
  const update = useCallback(
    async (id: number, input: ProductInput) => {
      await window.api.products.update(id, input)
      await reload()
    },
    [reload]
  )
  const remove = useCallback(
    async (id: number) => {
      await window.api.products.remove(id)
      await reload()
    },
    [reload]
  )

  return { products, loading, error, reload, create, update, remove }
}
