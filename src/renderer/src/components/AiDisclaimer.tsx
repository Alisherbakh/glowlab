import Alert from '@mui/material/Alert'
import { useSettings } from '../hooks/useSettings'

// Har bir AI natijasi yonida ko'rsatiladi (majburiy, CLAUDE.md §7)
export function AiDisclaimer(): React.JSX.Element {
  const { t } = useSettings()
  return (
    <Alert severity="info" variant="outlined">
      {t('ai.disclaimer')}
    </Alert>
  )
}
