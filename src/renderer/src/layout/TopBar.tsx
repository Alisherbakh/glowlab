import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlined from '@mui/icons-material/LightModeOutlined'
import { LANGUAGES, type Language } from '../../../shared/settings'
import { LANGUAGE_LABELS } from '../i18n'
import { useSettings } from '../hooks/useSettings'
import styles from './Layout.module.scss'

type Props = {
  title: string // Sahifa sarlavhasi
  resolvedMode: 'light' | 'dark' // Hozir ko'rinib turgan rejim (system bo'lsa ham)
}

// Yuqori panel: sahifa nomi, til tanlash va mavzu tugmasi
export function TopBar({ title, resolvedMode }: Props): React.JSX.Element {
  const { settings, update, t } = useSettings()

  return (
    <Box component="header" className={styles.topbar} sx={{ borderColor: 'divider' }}>
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Box className={styles.topbarActions}>
        <Select
          size="small"
          value={settings.language}
          onChange={(e) => update({ language: e.target.value as Language })} // Tanlangan tilni saqlaymiz
          inputProps={{ 'aria-label': t('settings.language') }}
        >
          {LANGUAGES.map((lang) => (
            <MenuItem key={lang} value={lang}>
              {LANGUAGE_LABELS[lang]}
            </MenuItem>
          ))}
        </Select>
        <Tooltip title={t('topbar.toggleTheme')}>
          <IconButton
            aria-label={t('topbar.toggleTheme')}
            onClick={() => update({ theme: resolvedMode === 'dark' ? 'light' : 'dark' })} // Qarama-qarshi rejimga o'tamiz
          >
            {resolvedMode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}
