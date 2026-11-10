import '@fontsource-variable/figtree' // Matn shrifti (lokal, internet kerak emas)
import '@fontsource-variable/newsreader' // Sarlavha shrifti (serif)
import './styles/global.scss'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
