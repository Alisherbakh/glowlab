import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import CssBaseline from '@mui/material/CssBaseline'
import useMediaQuery from '@mui/material/useMediaQuery'
import { ThemeProvider } from '@mui/material/styles'
import { buildTheme } from './theme/theme'
import { SettingsProvider } from './components/SettingsProvider'
import { useSettings } from './hooks/useSettings'
import { ProfileProvider } from './components/ProfileProvider'
import { useProfile } from './hooks/useProfile'
import { OnboardingFlow } from './onboarding/OnboardingFlow'
import { NavContext } from './hooks/navContext'
import { Sidebar } from './layout/Sidebar'
import { TopBar } from './layout/TopBar'
import { ALL_NAV, type PageId } from './navigation'
import { PAGES } from './pages'
import styles from './layout/Layout.module.scss'

// Mavzu + layout (sozlamalar yuklangandan keyin)
function Shell(): React.JSX.Element {
  const { settings, loaded, t } = useSettings()
  const profileState = useProfile()
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)') // Kompyuter qorong'i rejimdami
  const [page, setPage] = useState<PageId>('dashboard') // Ochiq sahifa

  // "system" bo'lsa kompyuterga qarab, aks holda tanlangan rejim
  const mode: 'light' | 'dark' =
    settings.theme === 'system' ? (prefersDark ? 'dark' : 'light') : settings.theme
  const theme = useMemo(() => buildTheme(mode), [mode])

  useEffect(() => {
    document.documentElement.dataset.mode = mode // SCSS'dagi --gl-border uchun
    document.documentElement.lang = settings.language // Ekran o'quvchilar uchun til
  }, [mode, settings.language])

  const current = ALL_NAV.find((item) => item.id === page) ?? ALL_NAV[0]
  const Page = PAGES[page]

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {!loaded || !profileState.loaded ? (
        <Box sx={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
          <CircularProgress color="primary" />
        </Box>
      ) : !profileState.profile ? (
        <OnboardingFlow mode="first" onDone={() => setPage('dashboard')} />
      ) : profileState.editing ? (
        <OnboardingFlow mode="edit" onDone={() => profileState.setEditing(false)} />
      ) : (
        <NavContext.Provider value={setPage}>
          <Box className={styles.shell}>
            <Sidebar active={page} onNavigate={setPage} />
            <Box component="main" className={styles.main}>
              <TopBar title={t(current.labelKey)} resolvedMode={mode} />
              <Box className={styles.content}>
                <Box className={styles.contentInner}>
                  <Page />
                </Box>
              </Box>
            </Box>
          </Box>
        </NavContext.Provider>
      )}
    </ThemeProvider>
  )
}

function App(): React.JSX.Element {
  return (
    <SettingsProvider>
      <ProfileProvider>
        <Shell />
      </ProfileProvider>
    </SettingsProvider>
  )
}

export default App
