import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined'
import type { AnalyzeErrorCode, LabelAnalysis, RiskLevel } from '../../../shared/analysis'
import type { Product } from '../../../shared/products'
import type { TranslationKey } from '../i18n'
import { useSettings } from '../hooks/useSettings'
import { prepareImage, type QualityIssue } from '../utils/imageQuality'
import { AiDisclaimer } from './AiDisclaimer'

const CONSENT_KEY = 'glowlab.labelConsent' // Faqat shu kompyuterdagi qulaylik uchun (localStorage)

function readConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'yes'
  } catch {
    return false
  }
}
function writeConsent(): void {
  try {
    localStorage.setItem(CONSENT_KEY, 'yes')
  } catch {
    // localStorage ishlamasa — har safar so'raymiz
  }
}

const RISK_COLOR: Record<RiskLevel, 'success' | 'warning' | 'error' | 'default'> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
  unknown: 'default'
}

type Prepared = { previewUrl: string; issues: QualityIssue[]; jpeg: Uint8Array }
type Props = { product: Product; onClose: () => void }

// Yorliq rasmini tanlash → sifat tekshiruvi → rozilik → Gemini tahlili → natija
export function LabelScanDialog({ product, onClose }: Props): React.JSX.Element {
  const { t } = useSettings()
  const inputRef = useRef<HTMLInputElement>(null)

  const [result, setResult] = useState<{ analysis: LabelAnalysis; createdAt: string } | null>(null)
  const [prepared, setPrepared] = useState<Prepared | null>(null)
  const [consent, setConsent] = useState(readConsent())
  const [busy, setBusy] = useState(false) // Rasm tayyorlanmoqda yoki AI ishlamoqda
  const [error, setError] = useState<AnalyzeErrorCode | 'read_failed' | null>(null)
  const [unreadable, setUnreadable] = useState<string | null>(null) // AI o'qiy olmadi
  const [scanning, setScanning] = useState(false) // Yangi skan rejimi (oldingi natija bo'lsa ham)

  // Oldingi tahlil bo'lsa, darhol ko'rsatamiz
  useEffect(() => {
    let active = true
    window.api.ai
      .latestAnalysis(product.id)
      .then(
        (saved) =>
          active && saved && setResult({ analysis: saved.analysis, createdAt: saved.createdAt })
      )
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [product.id])

  // Preview URL'ni xotiradan bo'shatamiz
  useEffect(() => {
    return () => {
      if (prepared) URL.revokeObjectURL(prepared.previewUrl)
    }
  }, [prepared])

  const handleFile = async (file: File | undefined): Promise<void> => {
    if (!file) return
    setError(null)
    setUnreadable(null)
    if (!file.type.startsWith('image/')) {
      setError('bad_image')
      return
    }
    setBusy(true)
    try {
      setPrepared(await prepareImage(file)) // Sifat + JPEG
    } catch {
      setError('read_failed')
    } finally {
      setBusy(false)
    }
  }

  const handleAnalyze = async (): Promise<void> => {
    if (!prepared || prepared.issues.length > 0 || !consent) return
    writeConsent()
    setBusy(true)
    setError(null)
    setUnreadable(null)
    try {
      const res = await window.api.ai.analyzeLabel({
        productId: product.id,
        mimeType: 'image/jpeg',
        bytes: prepared.jpeg
      })
      if (res.status === 'ok') {
        setResult({ analysis: res.analysis, createdAt: res.createdAt })
        setScanning(false)
        setPrepared(null)
      } else if (res.status === 'unreadable') {
        setUnreadable(res.reason || t('scan.unreadableDefault'))
      } else {
        setError(res.code)
      }
    } catch {
      setError('unknown')
    } finally {
      setBusy(false)
    }
  }

  const showPicker = scanning || !result // Natija yo'q yoki "qayta skan" bosilgan
  const canAnalyze = Boolean(prepared) && prepared!.issues.length === 0 && consent && !busy

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {t('scan.title')} · {product.name}
      </DialogTitle>
      <DialogContent>
        {/* ---------- Natija ---------- */}
        {!showPicker && result && (
          <Stack spacing={2}>
            <AiDisclaimer />
            {result.analysis.summary && <Typography>{result.analysis.summary}</Typography>}
            {result.analysis.warnings.length > 0 && (
              <Alert severity="warning">
                <Stack component="ul" sx={{ m: 0, pl: 2 }}>
                  {result.analysis.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </Stack>
              </Alert>
            )}
            <Typography variant="subtitle2" color="text.secondary">
              {t('scan.ingredientsCount', { count: result.analysis.ingredients.length })}
            </Typography>
            <Stack divider={<Divider flexItem />} spacing={1}>
              {result.analysis.ingredients.map((ing) => (
                <Stack key={ing.name} direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <Chip
                    size="small"
                    color={RISK_COLOR[ing.risk]}
                    variant={ing.risk === 'low' || ing.risk === 'unknown' ? 'outlined' : 'filled'}
                    label={t(`risk.${ing.risk}` as TranslationKey)}
                    sx={{ minWidth: 88 }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600 }}>{ing.name}</Typography>
                    {ing.note && (
                      <Typography variant="body2" color="text.secondary">
                        {ing.note}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Stack>
        )}

        {/* ---------- Rasm tanlash ---------- */}
        {showPicker && (
          <Stack spacing={2}>
            <Typography color="text.secondary">{t('scan.intro')}</Typography>
            <Box
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                void handleFile(e.dataTransfer.files[0]) // Sudrab tashlangan fayl
              }}
              sx={{
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 3,
                p: 3,
                textAlign: 'center'
              }}
            >
              {prepared ? (
                <Box
                  component="img"
                  src={prepared.previewUrl}
                  alt={t('scan.previewAlt')}
                  sx={{ maxWidth: '100%', maxHeight: 280, borderRadius: 2 }}
                />
              ) : (
                <UploadFileOutlined color="secondary" sx={{ fontSize: 40 }} />
              )}
              <Box sx={{ mt: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => inputRef.current?.click()}
                  disabled={busy}
                >
                  {prepared ? t('scan.chooseAnother') : t('scan.choose')}
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {t('scan.tips')}
              </Typography>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => {
                  void handleFile(e.target.files?.[0])
                  e.target.value = '' // Bir xil faylni qayta tanlash mumkin bo'lsin
                }}
              />
            </Box>

            {/* Quality Gate natijasi: muammo bo'lsa tahlil qilinmaydi */}
            {prepared && prepared.issues.length > 0 && (
              <Alert severity="warning">
                <Typography sx={{ fontWeight: 600, mb: 0.5 }}>{t('quality.title')}</Typography>
                <Stack component="ul" sx={{ m: 0, pl: 2 }}>
                  {prepared.issues.map((issue) => (
                    <li key={issue}>{t(`quality.${issue}` as TranslationKey)}</li>
                  ))}
                </Stack>
              </Alert>
            )}

            {unreadable && (
              <Alert severity="warning">
                <Typography sx={{ fontWeight: 600 }}>{t('scan.unreadableTitle')}</Typography>
                {unreadable}
              </Alert>
            )}
            {error && <Alert severity="error">{t(`scan.error.${error}` as TranslationKey)}</Alert>}

            {prepared && prepared.issues.length === 0 && (
              <FormControlLabel
                control={
                  <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                }
                label={t('scan.consent')}
              />
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {busy && <CircularProgress size={20} sx={{ mr: 1 }} />}
        {!showPicker && result && (
          <Button onClick={() => setScanning(true)}>{t('scan.again')}</Button>
        )}
        {showPicker && result && (
          <Button onClick={() => setScanning(false)} disabled={busy}>
            {t('scan.backToResult')}
          </Button>
        )}
        <Button onClick={onClose} disabled={busy}>
          {t('scan.close')}
        </Button>
        {showPicker && (
          <Button variant="contained" onClick={handleAnalyze} disabled={!canAnalyze}>
            {busy ? t('scan.analyzing') : t('scan.analyze')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
