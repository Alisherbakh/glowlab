import '@fontsource-variable/inter' // Inter shrifti (lokal, internet kerak emas)
import './styles/global.scss'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
