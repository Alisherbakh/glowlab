import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { LANGUAGES, THEME_MODES, type Language, type ThemeMode } from '../../../shared/settings'
import type { DbInfo } from '../../../shared/types'
import { LANGUAGE_LABELS, type TranslationKey } from '../i18n'
import { useProfile } from '../hooks/useProfile'
import { AiKeyCard } from '../components/AiKeyCard'
import { useSettings } from '../hooks/useSettings'

// Sozlamalar: til, mavzu va ilova/baza haqida ma'lumot
export function SettingsPage(): React.JSX.Element {
  const { settings, update, error, t } = useSettings()
  const { profile, setEditing } = useProfile()
  const [db, setDb] = useState<DbInfo | null>(null)

  useEffect(() => {
    window.api.app
      .dbInfo()
      .then(setDb)
      .catch(() => setDb(null)) // Baza holatini ko'rsatish uchun
  }, [])

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{t(error)}</Alert>}

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
            {t('settings.appearance')}
          </Typography>
          <Stack spacing={3} sx={{ mt: 2, maxWidth: 360 }}>
            <FormControl size="small">
              <InputLabel id="lang-label">{t('settings.language')}</InputLabel>
              <Select
                labelId="lang-label"
                label={t('settings.language')}
                value={settings.language}
                onChange={(e) => update({ language: e.target.value as Language })}
              >
                {LANGUAGES.map((lang) => (
                  <MenuItem key={lang} value={lang}>
                    {LANGUAGE_LABELS[lang]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                {t('settings.theme')}
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={settings.theme}
                onChange={(_e, value: ThemeMode | null) => value && update({ theme: value })} // null → bir xil tugma qayta bosilgan
              >
                {THEME_MODES.map((mode) => (
                  <ToggleButton key={mode} value={mode} sx={{ px: 2 }}>
                    {t(`settings.theme.${mode}`)}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.reminders === 'on'}
                  onChange={(e) => update({ reminders: e.target.checked ? 'on' : 'off' })} // Eslatmalarni yoqish/o'chirish
                />
              }
              label={t('settings.reminders')}
            />
          </Stack>
        </CardContent>
      </Card>

      {profile && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
              {t('settings.profile')}
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <Typography variant="body2">
                {t('onb.step.age')}: <strong>{profile.ageRange}</strong>
              </Typography>
              <Typography variant="body2">
                {t('onb.step.skin')}:{' '}
                <strong>{t(`skin.${profile.skinType}` as TranslationKey)}</strong>
              </Typography>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                {profile.concerns.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t('settings.profile.concernsNone')}
                  </Typography>
                ) : (
                  profile.concerns.map((c) => (
                    <Chip key={c} size="small" label={t(`concern.${c}` as TranslationKey)} />
                  ))
                )}
              </Stack>
              <Box>
                <Button variant="outlined" onClick={() => setEditing(true)}>
                  {t('settings.profile.edit')}
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      <AiKeyCard />

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
            {t('settings.about')}
          </Typography>
          <Typography variant="body2">GlowLab 1.0.0</Typography>
          {db && (
            <Stack spacing={0.5} sx={{ mt: 2 }}>
              <Typography variant="body2">
                {t('settings.database')}:{' '}
                {t('settings.dbStatus', { version: db.version, count: db.tables.length })}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                {db.path}
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}
