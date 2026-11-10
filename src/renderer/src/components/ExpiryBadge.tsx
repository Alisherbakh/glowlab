import Chip from '@mui/material/Chip'
import { getExpiryStatus } from '../../../shared/products'
import { useSettings } from '../hooks/useSettings'
import { formatDate } from '../utils/format'

// Muddat belgisi: 🟢 yaxshi / 🟡 tez orada / 🔴 o'tgan / kulrang noma'lum
export function ExpiryBadge({ expiresAt }: { expiresAt: string | null }): React.JSX.Element {
  const { t, settings } = useSettings()
  const { status, daysLeft } = getExpiryStatus(expiresAt)

  const color = { ok: 'success', soon: 'warning', expired: 'error', unknown: 'default' } as const
  let label: string
  if (status === 'unknown' || !expiresAt) label = t('expiry.unknown')
  else if (status === 'expired')
    label = t('expiry.expired', { date: formatDate(expiresAt, settings.language) })
  else if (status === 'soon')
    label = daysLeft === 0 ? t('expiry.today') : t('expiry.soon', { days: daysLeft ?? 0 })
  else label = t('expiry.ok', { date: formatDate(expiresAt, settings.language) })

  return (
    <Chip
      size="small"
      color={color[status]}
      variant={status === 'ok' || status === 'unknown' ? 'outlined' : 'filled'} // Muammolilar ko'proq ajralib turadi
      label={label}
    />
  )
}
