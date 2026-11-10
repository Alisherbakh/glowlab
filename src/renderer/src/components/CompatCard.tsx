import { useEffect, useState } from 'react'
import Alert, { type AlertColor } from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined'
import OpenInNewOutlined from '@mui/icons-material/OpenInNewOutlined'
import type { CompatResult, CompatSeverity } from '../../../shared/compatibility'
import type { TranslationKey } from '../i18n'
import { useSettings } from '../hooks/useSettings'

const ALERT: Record<CompatSeverity, AlertColor> = {
  warning: 'warning',
  caution: 'info',
  info: 'info'
}

type Props = {
  version: number // Tartib o'zgarganda oshadi → qayta tekshiriladi
}

// Tartib moslik tekshiruvi (qoidaga asoslangan, oflayn)
export function CompatCard({ version }: Props): React.JSX.Element {
  const { t } = useSettings()
  const [result, setResult] = useState<CompatResult | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    window.api.ai
      .checkCompatibility()
      .then((r) => {
        if (!active) return
        setResult(r)
        setError(false)
      })
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
  }, [version])

  return (
    <Card>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <FactCheckOutlined color="primary" />
          <Typography variant="h6">{t('compat.title')}</Typography>
          {result && result.checkedProducts > 0 && (
            <Chip
              size="small"
              variant="outlined"
              label={t('compat.counts', {
                scanned: result.scannedProducts,
                checked: result.checkedProducts
              })}
            />
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {t('compat.subtitle')}
        </Typography>

        {error && <Alert severity="error">{t('compat.error')}</Alert>}

        {result && result.checkedProducts === 0 && (
          <Typography color="text.secondary">{t('compat.empty')}</Typography>
        )}

        {result && result.checkedProducts > 0 && result.findings.length === 0 && (
          <Alert severity="success">{t('compat.allClear')}</Alert>
        )}

        {result?.findings.map((f, i) => (
          <Alert key={`${f.rule}-${f.slot ?? 'all'}-${i}`} severity={ALERT[f.severity]}>
            <AlertTitle>
              {t(`compat.rule.${f.rule}.title` as TranslationKey)}
              {f.slot &&
                f.rule !== 'retinoid_morning' && // Sarlavhada "ertalab" allaqachon bor
                ` · ${t(f.slot === 'AM' ? 'routine.am' : 'routine.pm')}`}
            </AlertTitle>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t(`compat.rule.${f.rule}.body` as TranslationKey)}
            </Typography>
            <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
              {f.products.map((p) => (
                <Typography component="li" variant="body2" key={p.id}>
                  <Box component="span" sx={{ fontWeight: 600 }}>
                    {p.name}
                  </Box>
                  {p.matches.length > 0 && ` — ${p.matches.join(', ')}`}
                  {p.fromName && (
                    <Box component="span" sx={{ color: 'text.secondary' }}>
                      {` (${t('compat.fromName')})`}
                    </Box>
                  )}
                </Typography>
              ))}
            </Stack>
            {f.sources.length > 0 && (
              <Stack direction="row" sx={{ mt: 1, gap: 1.5, flexWrap: 'wrap' }}>
                {f.sources.map((s) => (
                  <Link
                    key={s.url + s.title}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    variant="caption"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                  >
                    {s.sourceTitle}
                    <OpenInNewOutlined sx={{ fontSize: 14 }} />
                  </Link>
                ))}
              </Stack>
            )}
          </Alert>
        ))}

        <Typography variant="caption" color="text.secondary">
          {t('compat.disclaimer')}
        </Typography>
      </CardContent>
    </Card>
  )
}
