import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import { useSettings } from '../hooks/useSettings'
import type { TranslationKey } from '../i18n'

type Props = {
  descKey: TranslationKey // Sahifa nima qilishi haqida qisqa matn
  stage: number // Qaysi bosqichda tayyor bo'ladi
}

// Hali qurilmagan sahifalar uchun vaqtinchalik karta
export function ComingSoon({ descKey, stage }: Props): React.JSX.Element {
  const { t } = useSettings()
  return (
    <Card>
      <CardContent
        sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'flex-start' }}
      >
        <Typography color="text.secondary">{t(descKey)}</Typography>
        <Chip
          size="small"
          color="secondary"
          variant="outlined"
          label={t('common.comingSoon', { stage })}
        />
      </CardContent>
    </Card>
  )
}
