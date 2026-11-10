import { registerAiIpc } from './ai.ipc'
import { registerAppIpc } from './app.ipc'
import { registerFaceIpc } from './face.ipc'
import { registerProductsIpc } from './products.ipc'
import { registerProfileIpc } from './profile.ipc'
import { registerRoutinesIpc } from './routines.ipc'
import { registerSettingsIpc } from './settings.ipc'

// Barcha IPC handlerlarni bitta joyda ro'yxatdan o'tkazamiz (Express'dagi app.use(router) kabi)
export function registerIpcHandlers(): void {
  registerAppIpc() // app:* kanallari
  registerSettingsIpc() // settings:* kanallari
  registerProfileIpc() // profile:* kanallari
  registerProductsIpc() // products:* kanallari
  registerAiIpc() // ai:* kanallari
  registerRoutinesIpc() // routines:* kanallari
  registerFaceIpc() // face:* kanallari
}
