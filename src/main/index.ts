import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerIpcHandlers } from './ipc'
import { initDatabase, closeDatabase } from './db/connection'
import { getDataPaths } from './db/paths'
import { startExpiryReminders, stopExpiryReminders } from './jobs/expiryReminder'

// Asosiy oynani yaratadi
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200, // Boshlang'ich kenglik
    height: 800, // Boshlang'ich balandlik
    minWidth: 1024, // Bundan kichraytirib bo'lmaydi (layout buzilmasligi uchun)
    minHeight: 700,
    show: false, // Tayyor bo'lguncha ko'rsatmaymiz (oq ekran miltillamasligi uchun)
    title: 'GlowLab',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'), // Main ↔ renderer ko'prigi
      contextIsolation: true, // Renderer va preload alohida "dunyo"da ishlaydi (xavfsizlik)
      nodeIntegration: false, // Renderer Node API'larini to'g'ridan-to'g'ri ishlata olmaydi
      sandbox: false // electron-vite shabloni standarti; preload faqat contextBridge orqali API beradi
    }
  })

  // Oyna tayyor bo'lganda ko'rsatamiz
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Tashqi havolalar ilova ichida emas, brauzerda ochiladi
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Dev rejimda Vite serverdan (HMR), production'da tayyor fayldan yuklaymiz
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Dev rejimda .env fayldan GEMINI_API_KEY ni o'qiymiz (fayl gitga tushmaydi)
if (is.dev) {
  try {
    process.loadEnvFile(join(app.getAppPath(), '.env'))
  } catch {
    // .env bo'lmasa — kalitni Sozlamalardan kiritish mumkin
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.alisher.glowlab') // Windows uchun ilova ID

  // Dev'da F12 → DevTools; production'da Cmd/Ctrl+R (reload) o'chiriladi
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const { dbFile } = getDataPaths() // userData ichidagi glowlab.db manzili
  initDatabase(dbFile) // Bazani ochamiz + migratsiyalar

  registerIpcHandlers() // Barcha IPC kanallarni ulaymiz (oyna ochilishidan oldin)

  createWindow()
  startExpiryReminders() // Muddat eslatmalari (5 s keyin, so'ng har 6 soatda)

  // macOS: dock ikonkasi bosilganda oyna yo'q bo'lsa, yangisini ochamiz
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Ilovadan chiqishdan oldin bazani yopamiz (WAL fayllari to'g'ri yakunlanadi)
app.on('will-quit', () => {
  stopExpiryReminders()
  closeDatabase()
})

// Barcha oynalar yopilganda chiqamiz (macOS bundan mustasno — u yerda odatiy holat)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
