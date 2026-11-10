import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
import Typography from '@mui/material/Typography'
import LockOutlined from '@mui/icons-material/LockOutlined'
import {
  AGE_RANGES,
  CONCERNS,
  SKIN_TYPES,
  type AgeRange,
  type Concern,
  type SkinType
} from '../../../shared/profile'
import type { TranslationKey } from '../i18n'
import { useProfile } from '../hooks/useProfile'
import { useSettings } from '../hooks/useSettings'
import { SkinTypeQuiz } from './SkinTypeQuiz'

type Props = {
  mode: 'first' | 'edit' // first → birinchi ishga tushish, edit → Sozlamalardan
  onDone: () => void // Saqlangandan yoki bekor qilingandan keyin
}

const STEPS: TranslationKey[] = ['onb.step.age', 'onb.step.skin', 'onb.step.concerns']

// Tanlanadigan karta (yosh va teri turi uchun)
type OptionCardProps = {
  selected: boolean
  title: string
  desc?: string
  onClick: () => void
}

function OptionCard({ selected, title, desc, onClick }: OptionCardProps): React.JSX.Element {
  return (
    <Card
      sx={{
        borderColor: selected ? 'primary.main' : undefined,
        borderWidth: selected ? 2 : 1
      }}
    >
      <CardActionArea onClick={onClick} aria-pressed={selected}>
        <CardContent>
          <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
          {desc && (
            <Typography variant="body2" color="text.secondary">
              {desc}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

// Teri profili so'rovnomasi (3 qadam)
export function OnboardingFlow({ mode, onDone }: Props): React.JSX.Element {
  const { t } = useSettings()
  const { profile, save } = useProfile()

  const [step, setStep] = useState(0) // Hozirgi qadam (0, 1, 2)
  const [ageRange, setAgeRange] = useState<AgeRange | null>(profile?.ageRange ?? null) // Edit rejimida oldingi qiymat
  const [skinType, setSkinType] = useState<SkinType | null>(profile?.skinType ?? null)
  const [concerns, setConcerns] = useState<Concern[]>(profile?.concerns ?? [])
  const [showQuiz, setShowQuiz] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  // Joriy qadamda "Keyingi" bosish mumkinmi
  const canContinue = step === 0 ? ageRange !== null : step === 1 ? skinType !== null : true

  const toggleConcern = (c: Concern): void =>
    setConcerns((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])) // Bor bo'lsa olib tashlaydi, yo'q bo'lsa qo'shadi

  const handleFinish = async (): Promise<void> => {
    if (!ageRange || !skinType) return
    setSaving(true)
    setError(false)
    try {
      await save({ ageRange, skinType, concerns }) // Main zod bilan tekshirib saqlaydi
      onDone()
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', py: 6, px: 3 }}>
      <Stack spacing={4} sx={{ width: '100%', maxWidth: 720 }}>
        <Stack spacing={1}>
          <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
            {t('onb.title')}
          </Typography>
          <Typography color="text.secondary">{t('onb.subtitle')}</Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
            <LockOutlined fontSize="small" />
            <Typography variant="body2">{t('onb.privacy')}</Typography>
          </Stack>
        </Stack>

        <Stepper activeStep={step}>
          {STEPS.map((key) => (
            <Step key={key}>
              <StepLabel>{t(key)}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* 1-qadam: yosh oralig'i */}
        {step === 0 && (
          <Stack spacing={2}>
            <Typography variant="h6">{t('onb.age.question')}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
              {AGE_RANGES.map((range) => (
                <OptionCard
                  key={range}
                  selected={ageRange === range}
                  title={range}
                  onClick={() => setAgeRange(range)}
                />
              ))}
            </Box>
          </Stack>
        )}

        {/* 2-qadam: teri turi (yoki test) */}
        {step === 1 && !showQuiz && (
          <Stack spacing={2}>
            <Typography variant="h6">{t('onb.skin.question')}</Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 2
              }}
            >
              {SKIN_TYPES.map((type) => (
                <OptionCard
                  key={type}
                  selected={skinType === type}
                  title={t(`skin.${type}` as TranslationKey)}
                  desc={t(`skin.${type}.desc` as TranslationKey)}
                  onClick={() => setSkinType(type)}
                />
              ))}
            </Box>
            <Box>
              <Button variant="text" onClick={() => setShowQuiz(true)}>
                {t('onb.skin.notSure')}
              </Button>
            </Box>
          </Stack>
        )}
        {step === 1 && showQuiz && (
          <SkinTypeQuiz
            onBack={() => setShowQuiz(false)}
            onResult={(type) => {
              setSkinType(type) // Test natijasini tanlaymiz
              setShowQuiz(false)
            }}
          />
        )}

        {/* 3-qadam: tashvishlar (ixtiyoriy) */}
        {step === 2 && (
          <Stack spacing={2}>
            <Typography variant="h6">{t('onb.concerns.question')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('onb.concerns.hint')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {CONCERNS.map((c) => (
                <Chip
                  key={c}
                  label={t(`concern.${c}` as TranslationKey)}
                  color={concerns.includes(c) ? 'primary' : 'default'}
                  variant={concerns.includes(c) ? 'filled' : 'outlined'}
                  onClick={() => toggleConcern(c)}
                  aria-pressed={concerns.includes(c)}
                />
              ))}
            </Box>
          </Stack>
        )}

        {error && <Alert severity="error">{t('onb.saveError')}</Alert>}

        {!showQuiz && (
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Box>
              {mode === 'edit' && step === 0 && <Button onClick={onDone}>{t('onb.cancel')}</Button>}
              {step > 0 && <Button onClick={() => setStep(step - 1)}>{t('onb.back')}</Button>}
            </Box>
            {step < STEPS.length - 1 ? (
              <Button variant="contained" disabled={!canContinue} onClick={() => setStep(step + 1)}>
                {t('onb.next')}
              </Button>
            ) : (
              <Button variant="contained" disabled={saving} onClick={handleFinish}>
                {mode === 'first' ? t('onb.finish') : t('onb.save')}
              </Button>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  )
}
