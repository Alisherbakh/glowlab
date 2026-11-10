import { ipcMain } from 'electron'
import type { Product } from '../../shared/products'
import {
  createProduct,
  editProduct,
  listProducts,
  removeProduct
} from '../services/product.service'

// "products:*" kanallari (Express'dagi GET/POST/PUT/DELETE /products kabi)
export function registerProductsIpc(): void {
  ipcMain.handle('products:list', (): Product[] => listProducts())
  ipcMain.handle('products:create', (_e, input: unknown): Product => createProduct(input))
  ipcMain.handle('products:update', (_e, id: unknown, input: unknown): Product =>
    editProduct(id, input)
  )
  ipcMain.handle('products:delete', (_e, id: unknown): void => removeProduct(id))
}
