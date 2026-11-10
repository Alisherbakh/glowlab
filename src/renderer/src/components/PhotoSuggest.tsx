import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined'
import { CLASSIFIER_CATEGORIES, type ClassifyResult } from '../../../shared/classifier'
import type { ProductCategory } from '../../../shared/products'
import type { TranslationKey } from '../i18n'
import { useSettings } from '../hooks/useSettings'
import type { QualityIssue } from '../utils/imageQuality'
import { prepareClassifierInput } from '../utils/classifierInput'
import { AiDisclaimer } from './AiDisclaimer'

type State =
  | { kind: 'idle' }
  | { kind: 'working'; previewUrl: string | null }
  | { kind: 'quality'; previewUrl: string; issues: QualityIssue[] }
  | { kind: 'result'; previewUrl: string; result: ClassifyResult }
  | { kind: 'error'; previewUrl: string | null }

type Props = {
  current: ProductCategory | '' // Formadagi hozirgi kategoriya
  onUse: (category: ProductCategory) => void // Foydalanuvchi taklifni tasdiqladi
}

// Rasmdan mahsulot turini taklif qilish (oflayn model). Taklif faqat foydalanuvchi bosganda qo'llanadi
export function PhotoSuggest({ current, onUse }: Props): React.JSX.Element {
  const { t } = useSettings()
  const [state, setState] = useState<State>({ kind: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)
  const requestId = useRef(0) // Eski so'rov natijasi yangisining ustiga yozilmasin

  const previewUrl = state.kind === 'idle' ? null : state.previewUrl
  useEffect(() => {
    // Ko'rinish rasmi almashganda yoki oyna yopilganda xotirani bo'shatamiz
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFile = async (file: File | undefined): Promise<void> => {
    if (!file) return
    const id = ++requestId.current
    setState({ kind: 'working', previewUrl: null })
    try {
      const prepared = await prepareClassifierInput(file)
      if (id !== requestId.current) return URL.revokeObjectURL(prepared.previewUrl)
      if (prepared.issues.length > 0) {
        // Sifatsiz rasm → taxmin qilmaymiz, yaxshiroq rasm so'raymiz
        setState({ kind: 'quality', previewUrl: prepared.previewUrl, issues: prepared.issues })
        return
      }
      setState({ kind: 'working', previewUrl: prepared.previewUrl })
      const result = await window.api.ai.classifyProduct(prepared.rgb)
      if (id !== requestId.current) return
      setState({ kind: 'result', previewUrl: prepared.previewUrl, result })
    } catch {
      if (id !== requestId.current) return
      setState({ kind: 'error', previewUrl: null })
    }
  }

  const supported = CLASSIFIER_CATEGORIES.map((c) => t(`cat.${c}` as TranslationKey)).join(', ')
  const working = state.kind === 'working'

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderStyle: 'dashed', borderRadius: 2, p: 1.5 }}>
      <input
        ref={inputRef}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          void handleFile(e.target.files?.[0])
          e.target.value = '' // Bir xil faylni qayta tanlash mumkin bo'lsin
        }}
      />
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        {previewUrl && (
          <Box
            component="img"
            src={previewUrl}
            alt={t('suggest.previewAlt')}
            sx={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
          />
        )}
        <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
          {working ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minHeight: 32 }}>
              <CircularProgress size={18} />
              <Typography variant="body2">{t('suggest.working')}</Typography>
            </Stack>
          ) : (
            <Box>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AutoAwesomeOutlined />}
                onClick={() => inputRef.current?.click()}
              >
                {state.kind === 'idle' ? t('suggest.button') : t('suggest.another')}
              </Button>
            </Box>
          )}

          {state.kind === 'idle' && (
            <Typography variant="caption" color="text.secondary">
              {t('suggest.hint', { list: supported })}
            </Typography>
          )}

          {state.kind === 'quality' && (
            <Alert severity="warning">
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {t('quality.title')}
              </Typography>
              <Stack component="ul" sx={{ m: 0, pl: 2 }}>
                {state.issues.map((issue) => (
                  <li key={issue}>{t(`quality.${issue}` as TranslationKey)}</li>
                ))}
              </Stack>
            </Alert>
          )}

          {state.kind === 'error' && <Alert severity="error">{t('scan.error.read_failed')}</Alert>}

          {state.kind === 'result' && state.result.status === 'unavailable' && (
            <Alert severity="info">{t('suggest.unavailable')}</Alert>
          )}

          {state.kind === 'result' && state.result.status === 'unsure' && (
            <Alert severity="info">{t('suggest.unsure')}</Alert>
          )}

          {state.kind === 'result' && state.result.status === 'ok' && (
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {t('suggest.result', {
                  category: t(`cat.${state.result.category}` as TranslationKey),
                  percent: Math.round(state.result.confidence * 100)
                })}
              </Typography>
              {current === state.result.category ? (
                <Typography variant="body2" color="success.main">
                  {t('suggest.applied')}
                </Typography>
              ) : (
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => {
                    if (state.kind === 'result' && state.result.status === 'ok')
                      onUse(state.result.category)
                  }}
                >
                  {t('suggest.use')}
                </Button>
              )}
            </Stack>
          )}
        </Stack>
      </Stack>

      {/* Har bir AI natijasi yonida majburiy ogohlantirish */}
      {state.kind === 'result' && state.result.status !== 'unavailable' && (
        <Box sx={{ mt: 1.5 }}>
          <AiDisclaimer />
        </Box>
      )}
    </Box>
  )
}
