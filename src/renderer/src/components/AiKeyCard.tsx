import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { AiKeyStatus } from '../../../shared/analysis'
import { useSettings } from '../hooks/useSettings'

// Sozlamalar: Gemini API kaliti (kalitning o'zi hech qachon ko'rsatilmaydi)
export function AiKeyCard(): React.JSX.Element {
  const { t } = useSettings()
  const [status, setStatus] = useState<AiKeyStatus | null>(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  const refresh = async (): Promise<void> => setStatus(await window.api.ai.keyStatus())

  useEffect(() => {
    let active = true
    window.api.ai
      .keyStatus()
      .then((s) => active && setStatus(s))
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  const save = async (key: string | null): Promise<void> => {
    setError(false)
    try {
      await window.api.ai.setKey(key) // Main safeStorage bilan shifrlab saqlaydi
      setValue('')
      await refresh()
    } catch {
      setError(true)
    }
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
          {t('aiKey.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('aiKey.desc')}{' '}
          <Link href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
            Google AI Studio
          </Link>
        </Typography>
        {status && (
          <Alert severity={status.configured ? 'success' : 'warning'} sx={{ mb: 2 }}>
            {status.configured
              ? t(status.source === 'env' ? 'aiKey.fromEnv' : 'aiKey.saved', {
                  model: status.model
                })
              : t('aiKey.missing')}
          </Alert>
        )}
        {status?.source !== 'env' && (
          <Stack direction="row" spacing={1} sx={{ maxWidth: 560 }}>
            <TextField
              size="small"
              type="password"
              autoComplete="off"
              placeholder={t('aiKey.placeholder')}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              disabled={value.trim().length < 20}
              onClick={() => save(value)}
            >
              {t('aiKey.save')}
            </Button>
            {status?.configured && (
              <Button color="error" onClick={() => save(null)}>
                {t('aiKey.remove')}
              </Button>
            )}
          </Stack>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t('aiKey.error')}
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
