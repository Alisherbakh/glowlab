import { app, shell, BrowserWindow, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { getLoadablePath } from 'sqlite-vec'
import icon from '../../resources/icon.png?asset'
import { registerIpcHandlers } from './ipc'
import { initDatabase, closeDatabase } from './db/connection'
import { getDataPaths } from './db/paths'
import { startExpiryReminders, stopExpiryReminders } from './jobs/expiryReminder'
import { stopFaceWorker } from './ai/faceAnalyzer'
import { getKbDir } from './ai/modelDir'
import { unpackedPath } from './ai/vectorStore'
import { initKb } from './services/kb.service'

// sqlite-vec kengaytmasi yo'li (build'da asar'dan chiqarilgan nusxa). Topilmasa → null (oflayn FTS5 ishlaydi)
function vecExtensionPath(): string | null {
  try {
    const path = getLoadablePath()
    return app.isPackaged ? unpackedPath(path) : path
  } catch (err) {
    console.warn('[kb] sqlite-vec topilmadi:', err instanceof Error ? err.message : err)
    return null
  }
}

// So'rov ilovaning o'z sahifasidanmi (dev: Vite server, build: file://)
function isAppUrl(url: string): boolean {
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (is.dev && devUrl) return url.startsWith(new URL(devUrl).origin)
  return url.startsWith('file://')
}

// Ruxsatlar: faqat yuz skani uchun kamera (video, mikrofonsiz) va faqat o'z sahifamizga; qolgani rad etiladi
function setupPermissions(): void {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback, details) => {
    if (permission === 'media') {
      const types = 'mediaTypes' in details ? (details.mediaTypes ?? []) : []
      callback(
        types.length > 0 && types.every((t) => t === 'video') && isAppUrl(details.requestingUrl)
      )
      return
    }
    callback(false)
  })
}

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

  // Tashqi havolalar ilova ichida emas, brauzerda ochiladi (faqat http/https — boshqa protokollar rad etiladi)
  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (/^https?:\/\//i.test(details.url)) void shell.openExternal(details.url)
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
  try {
    initKb({ kbJsonPath: join(getKbDir(), 'kb.json'), vecPath: vecExtensionPath() }) // RAG bilim bazasi
  } catch (err) {
    console.error('[kb] bilim bazasi yuklanmadi:', err) // Ilova baribir ishlaydi, faqat "So'rang" bo'limi bo'sh
  }

  registerIpcHandlers() // Barcha IPC kanallarni ulaymiz (oyna ochilishidan oldin)
  setupPermissions() // Kamera ruxsati (faqat video, faqat ilova oynasi)

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
  void stopFaceWorker() // OpenCV worker oqimini to'xtatamiz
  closeDatabase()
})

// Barcha oynalar yopilganda chiqamiz (macOS bundan mustasno — u yerda odatiy holat)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
