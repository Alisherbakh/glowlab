import { createTheme, type Theme } from '@mui/material/styles'
import { dark, fonts, light, radius } from './tokens'

// Rejimga qarab (light/dark) MUI mavzusini yaratadi — "Botanical"
export function buildTheme(mode: 'light' | 'dark'): Theme {
  const c = mode === 'light' ? light : dark // Shu rejim ranglari
  const heading = { fontFamily: fonts.heading, fontWeight: 500, letterSpacing: '-0.01em' } // Serif sarlavhalar

  return createTheme({
    palette: {
      mode,
      primary: { main: c.primary, contrastText: c.onPrimary },
      secondary: { main: c.secondary, contrastText: c.onPrimary },
      info: { main: c.secondary }, // Ma'lumot xabarlari ko'k emas — evkalipt (palitraga mos)
      success: { main: c.ok },
      warning: { main: c.soon },
      error: { main: c.danger },
      background: { default: c.background, paper: c.surface },
      text: { primary: c.text, secondary: c.textMuted },
      divider: c.border
    },
    shape: { borderRadius: radius },
    typography: {
      fontFamily: fonts.body,
      h1: heading,
      h2: heading,
      h3: heading,
      h4: heading,
      h5: heading,
      h6: { ...heading, fontSize: '1.3rem' }, // Sahifa va karta sarlavhalari
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 500 } // Tugma matni katta harf bo'lmaydi
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: { body: { fontVariantNumeric: 'tabular-nums' } } // Raqamlar ustunlarda tekis turadi
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } }, // Dark rejimda MUI qo'shadigan gradientni o'chiramiz
      MuiButton: { defaultProps: { disableElevation: true } }, // Soyasiz, tekis tugmalar
      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: { root: { borderColor: c.border } }
      },
      MuiChip: { styleOverrides: { root: { borderRadius: 8 } } }, // Kartalardan kichikroq burchak — ierarxiya
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            '&.Mui-selected': { backgroundColor: c.navSelected, color: c.navSelectedText }, // Faol menyu
            '&.Mui-selected:hover': { backgroundColor: c.navSelected }
          }
        }
      }
    }
  })
}
