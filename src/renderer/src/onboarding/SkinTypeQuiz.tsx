import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { SkinType } from '../../../shared/profile'
import type { TranslationKey } from '../i18n'
import { useSettings } from '../hooks/useSettings'
import { QUIZ, isQuizComplete, scoreQuiz } from './quiz'

type Props = {
  onResult: (type: SkinType) => void // "Shu natijani tanlash" bosilganda
  onBack: () => void // Testdan chiqish
}

// 4 savollik teri turi testi
export function SkinTypeQuiz({ onResult, onBack }: Props): React.JSX.Element {
  const { t } = useSettings()
  const [answers, setAnswers] = useState<Record<string, string>>({}) // savol id → variant id

  const complete = isQuizComplete(answers) // Hammasiga javob berildimi
  const result = complete ? scoreQuiz(answers) : null // Natija faqat oxirida ko'rinadi

  return (
    <Stack spacing={3}>
      <Typography variant="h6">{t('quiz.title')}</Typography>
      <Alert severity="info">{t('quiz.note')}</Alert>

      {QUIZ.map((question) => (
        <FormControl key={question.id}>
          <FormLabel sx={{ mb: 1 }}>{t(`quiz.${question.id}.q` as TranslationKey)}</FormLabel>
          <RadioGroup
            value={answers[question.id] ?? ''}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
          >
            {question.options.map((option) => (
              <FormControlLabel
                key={option.id}
                value={option.id}
                control={<Radio />}
                label={t(`quiz.${question.id}.${option.id}` as TranslationKey)}
              />
            ))}
          </RadioGroup>
        </FormControl>
      ))}

      {result && (
        <Alert severity="success">
          {t('quiz.result', { type: t(`skin.${result}` as TranslationKey) })}
        </Alert>
      )}

      <Stack direction="row" spacing={1}>
        <Button variant="text" onClick={onBack}>
          {t('quiz.back')}
        </Button>
        <Button variant="contained" disabled={!result} onClick={() => result && onResult(result)}>
          {t('quiz.use')}
        </Button>
      </Stack>
    </Stack>
  )
}
