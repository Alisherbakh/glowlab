import { createTheme, type Theme } from '@mui/material/styles'
import { dark, light, palette, radius } from './tokens'

// Rejimga qarab (light/dark) MUI mavzusini yaratadi
export function buildTheme(mode: 'light' | 'dark'): Theme {
  const c = mode === 'light' ? light : dark // Shu rejim ranglari

  return createTheme({
    palette: {
      mode,
      primary: { main: palette.primary, contrastText: '#FFFFFF' },
      secondary: { main: palette.secondary, contrastText: '#FFFFFF' },
      success: { main: palette.ok },
      warning: { main: palette.soon },
      error: { main: palette.danger },
      background: { default: c.background, paper: c.surface },
      text: { primary: c.text, secondary: c.textMuted },
      divider: c.border
    },
    shape: { borderRadius: radius },
    typography: {
      fontFamily: "'Inter Variable', system-ui, -apple-system, 'Apple SD Gothic Neo', sans-serif", // Koreyscha uchun Apple SD Gothic Neo
      button: { textTransform: 'none', fontWeight: 500 } // Tugma matni katta harf bo'lmaydi
    },
    components: {
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } }, // Dark rejimda MUI qo'shadigan gradientni o'chiramiz
      MuiButton: { defaultProps: { disableElevation: true } }, // Soyasiz, tekis tugmalar
      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: { root: { borderColor: c.border } }
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            '&.Mui-selected': { backgroundColor: c.navSelected, color: c.navSelectedText }, // Faol menyu
            '&.Mui-selected:hover': { backgroundColor: c.navSelected }
          }
        }
      }
    }
  })
}
