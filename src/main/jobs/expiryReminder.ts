import { BrowserWindow, Notification } from 'electron'
import { getExpiryStatus } from '../../shared/products'
import { findAllProducts } from '../models/product.model'
import { logReminder, wasReminded } from '../models/reminder.model'
import { getSettings } from '../services/settings.service'
import { reminderText } from './reminderText'

const CHECK_EVERY_MS = 6 * 60 * 60 * 1000 // Har 6 soatda tekshiramiz
const FIRST_CHECK_DELAY_MS = 5_000 // Ilova ochilgandan 5 soniya keyin (oyna tayyor bo'lsin)
const MAX_PER_CHECK = 3 // Bir tekshiruvda ko'pi bilan 3 ta bildirishnoma (spam bo'lmasin)

// Muddati yaqin / o'tgan mahsulotlar uchun bildirishnoma yuboradi; yuborilganlar soni
export function checkExpiries(): number {
  const settings = getSettings()
  if (settings.reminders === 'off' || !Notification.isSupported()) return 0

  let sent = 0
  for (const row of findAllProducts()) {
    if (sent >= MAX_PER_CHECK) break
    const { status, daysLeft } = getExpiryStatus(row.expires_at)
    if (status !== 'soon' && status !== 'expired') continue
    if (wasReminded(row.id, status)) continue // Avval yuborilgan

    const { title, body } = reminderText(settings.language, status, row.name, daysLeft ?? 0)
    const n = new Notification({ title, body })
    n.on('click', () => {
      const win = BrowserWindow.getAllWindows()[0] // Bosilganda ilova oynasini ko'rsatamiz
      if (win) {
        if (win.isMinimized()) win.restore()
        win.show()
        win.focus()
      }
    })
    n.show()
    logReminder(row.id, status)
    sent++
  }
  return sent
}

let timer: NodeJS.Timeout | null = null

// Ilova ishga tushganda bir marta chaqiriladi
export function startExpiryReminders(): void {
  setTimeout(() => {
    try {
      checkExpiries()
    } catch (err) {
      console.error('[reminders] check failed', err)
    }
  }, FIRST_CHECK_DELAY_MS)

  timer = setInterval(() => {
    try {
      checkExpiries()
    } catch (err) {
      console.error('[reminders] check failed', err)
    }
  }, CHECK_EVERY_MS)
}

export function stopExpiryReminders(): void {
  if (timer) clearInterval(timer)
  timer = null
}
