import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import PhotoCameraOutlined from '@mui/icons-material/PhotoCameraOutlined'
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined'
import type { FaceRegion } from '../../../shared/faceGeometry'
import type {
  FaceAnalysisResult,
  FaceMetricResult,
  FaceQualityIssue,
  MetricLevel,
  SavedFaceScan,
  ScanSource
} from '../../../shared/faceScan'
import type { TranslationKey } from '../i18n'
import { AiDisclaimer } from '../components/AiDisclaimer'
import { CameraCapture } from '../components/CameraCapture'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { prepareFace } from '../cv/faceCapture'
import { useProfile } from '../hooks/useProfile'
import { useSettings } from '../hooks/useSettings'
import { formatDateTime } from '../utils/format'

type State =
  | { kind: 'idle' }
  | { kind: 'working'; source: ScanSource }
  | { kind: 'quality'; source: ScanSource; issues: FaceQualityIssue[]; previewUrl: string | null }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | {
      kind: 'result'
      source: ScanSource
      previewUrl: string
      regions: FaceRegion[]
      cropWidth: number
      cropHeight: number
      result: Extract<FaceAnalysisResult, { status: 'ok' }>
      savedId: number | null
    }

const LEVEL_COLOR: Record<MetricLevel, 'success' | 'warning' | 'error'> = {
  low: 'success',
  moderate: 'warning',
  high: 'error'
}

const TIP_KEYS: TranslationKey[] = ['face.tip1', 'face.tip2', 'face.tip3', 'face.tip4', 'face.tip5']

// Yuz terisi skani: rasm yoki kamera → kompyuterda tahlil → ko'rsatkichlar (tashxis emas)
export function FaceScanPage(): React.JSX.Element {
  const { t, settings } = useSettings()
  const { profile } = useProfile()
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [cameraOpen, setCameraOpen] = useState(false)
  const [history, setHistory] = useState<SavedFaceScan[]>([])
  const [toDelete, setToDelete] = useState<SavedFaceScan | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const runId = useRef(0) // Eski tahlil natijasi yangisining ustiga yozilmasin

  useEffect(() => {
    let active = true
    window.api.face
      .list()
      .then((list) => active && setHistory(list))
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  const previewUrl = state.kind === 'result' || state.kind === 'quality' ? state.previewUrl : null
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl) // Xotirani bo'shatamiz
    }
  }, [previewUrl])

  const analyze = async (
    source: ScanSource,
    image: ImageBitmap | HTMLCanvasElement
  ): Promise<void> => {
    const id = ++runId.current
    setState({ kind: 'working', source })
    try {
      const prepared = await prepareFace(image)
      if (id !== runId.current) return
      if (prepared.status === 'unavailable') return setState({ kind: 'unavailable' })
      if (prepared.status === 'quality') {
        return setState({
          kind: 'quality',
          source,
          issues: prepared.issues,
          previewUrl: prepared.previewUrl
        })
      }
      const result = await window.api.face.analyze(prepared.input)
      if (id !== runId.current) return
      if (result.status === 'quality') {
        return setState({
          kind: 'quality',
          source,
          issues: result.issues,
          previewUrl: prepared.previewUrl
        })
      }
      if (result.status !== 'ok') return setState({ kind: 'error' })
      setState({
        kind: 'result',
        source,
        previewUrl: prepared.previewUrl,
        regions: prepared.regions,
        cropWidth: prepared.input.width,
        cropHeight: prepared.input.height,
        result,
        savedId: null
      })
    } catch (err) {
      console.error('[face] analysis failed:', err)
      if (id === runId.current) setState({ kind: 'error' })
    } finally {
      if ('close' in image) image.close() // ImageBitmap xotirasini bo'shatamiz
    }
  }

  const handleFile = async (file: File | undefined): Promise<void> => {
    if (!file) return
    let bitmap: ImageBitmap
    try {
      bitmap = await createImageBitmap(file) // EXIF bo'yicha avtomatik to'g'ri buriladi
    } catch {
      setState({ kind: 'error' })
      return
    }
    await analyze('photo', bitmap)
  }

  const save = async (): Promise<void> => {
    if (state.kind !== 'result' || state.savedId) return
    setSaving(true)
    try {
      const saved = await window.api.face.save({
        source: state.source,
        qualityScore: state.result.qualityScore,
        raw: state.result.raw
      })
      setHistory((h) => [saved, ...h])
      setState({ ...state, savedId: saved.id })
    } catch {
      setState({ kind: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (scan: SavedFaceScan): Promise<void> => {
    setToDelete(null)
    try {
      await window.api.face.remove(scan.id)
      setHistory((h) => h.filter((s) => s.id !== scan.id))
    } catch {
      setState({ kind: 'error' })
    }
  }

  const actions = (labels?: {
    photo: TranslationKey
    camera: TranslationKey
  }): React.JSX.Element => (
    <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
      <Button
        variant="contained"
        startIcon={<UploadFileOutlined />}
        onClick={() => fileRef.current?.click()}
      >
        {t(labels?.photo ?? 'face.upload')}
      </Button>
      <Button
        variant="outlined"
        startIcon={<PhotoCameraOutlined />}
        onClick={() => setCameraOpen(true)}
      >
        {t(labels?.camera ?? 'face.camera')}
      </Button>
    </Stack>
  )

  return (
    <Stack spacing={2}>
      <input
        ref={fileRef}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          void handleFile(e.target.files?.[0])
          e.target.value = '' // Bir xil faylni qayta tanlash mumkin bo'lsin
        }}
      />

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography color="text.secondary">{t('face.intro')}</Typography>
            {profile && (
              <Typography variant="body2">
                {t('face.profileNote', {
                  age: profile.ageRange,
                  skin: t(`skin.${profile.skinType}` as TranslationKey)
                })}
              </Typography>
            )}

            {state.kind === 'idle' && (
              <>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    {t('face.tipsTitle')}
                  </Typography>
                  <Stack component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {TIP_KEYS.map((k) => (
                      <Typography component="li" variant="body2" key={k}>
                        {t(k)}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
                {actions()}
              </>
            )}

            {state.kind === 'working' && (
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 2 }}>
                <CircularProgress size={22} />
                <Typography>{t('face.working')}</Typography>
              </Stack>
            )}

            {state.kind === 'unavailable' && <Alert severity="info">{t('face.unavailable')}</Alert>}

            {state.kind === 'error' && (
              <>
                <Alert severity="error">{t('face.error')}</Alert>
                {actions()}
              </>
            )}

            {state.kind === 'quality' && (
              <>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  {state.previewUrl && (
                    <Box
                      component="img"
                      src={state.previewUrl}
                      alt={t('face.previewAlt')}
                      sx={{ width: 160, maxHeight: 200, objectFit: 'contain', borderRadius: 1 }}
                    />
                  )}
                  <Alert severity="warning" sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {t('face.qualityTitle')}
                    </Typography>
                    <Stack component="ul" sx={{ m: 0, pl: 2 }}>
                      {state.issues.map((issue) => (
                        <li key={issue}>{t(`face.issue.${issue}` as TranslationKey)}</li>
                      ))}
                    </Stack>
                  </Alert>
                </Stack>
                {actions({ photo: 'face.tryPhoto', camera: 'face.tryCamera' })}
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      {state.kind === 'result' && (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">{t('face.resultTitle')}</Typography>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2.5}
                sx={{ alignItems: 'flex-start' }}
              >
                <RegionsPreview
                  url={state.previewUrl}
                  regions={state.regions}
                  width={state.cropWidth}
                  height={state.cropHeight}
                  caption={t('face.regionsCaption')}
                />
                <Box
                  sx={{
                    flex: 1,
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: 1.5
                  }}
                >
                  {state.result.metrics.map((m) => (
                    <MetricCard key={m.metric} metric={m} />
                  ))}
                </Box>
              </Stack>
              <AiDisclaimer />
              <Alert severity="info" variant="outlined">
                {t('face.notDiagnosis')}
              </Alert>
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="contained"
                  onClick={save}
                  disabled={saving || state.savedId !== null}
                >
                  {state.savedId ? t('face.saved') : t('face.save')}
                </Button>
                <Button onClick={() => setState({ kind: 'idle' })}>{t('face.again')}</Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            {t('face.historyTitle')}
          </Typography>
          {history.length === 0 ? (
            <Typography color="text.secondary">{t('face.historyEmpty')}</Typography>
          ) : (
            <Stack spacing={1.5}>
              {history.map((scan) => (
                <Stack
                  key={scan.id}
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}
                >
                  <Typography variant="body2" sx={{ minWidth: 170 }}>
                    {formatDateTime(scan.createdAt, settings.language)} ·{' '}
                    {t(`face.source.${scan.source}`)}
                  </Typography>
                  {scan.metrics.map((m) => (
                    <Chip
                      key={m.metric}
                      size="small"
                      variant="outlined"
                      color={LEVEL_COLOR[m.level]}
                      label={`${t(`face.metric.${m.metric}` as TranslationKey)}: ${t(`face.level.${m.level}`)}`}
                    />
                  ))}
                  <Tooltip title={t('face.delete')}>
                    <IconButton
                      size="small"
                      onClick={() => setToDelete(scan)}
                      aria-label={t('face.delete')}
                    >
                      <DeleteOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {cameraOpen && (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(frame) => {
            setCameraOpen(false)
            void analyze('camera', frame)
          }}
        />
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title={t('face.delete')}
        body={t('face.deleteConfirm')}
        confirmLabel={t('face.delete')}
        cancelLabel={t('confirm.cancel')}
        onConfirm={() => {
          if (toDelete) void remove(toDelete)
        }}
        onCancel={() => setToDelete(null)}
      />
    </Stack>
  )
}

// Bitta ko'rsatkich kartochkasi: nomi, darajasi, shkala, izoh va (kerak bo'lsa) maslahat
function MetricCard({ metric }: { metric: FaceMetricResult }): React.JSX.Element {
  const { t } = useSettings()
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2">
          {t(`face.metric.${metric.metric}` as TranslationKey)}
        </Typography>
        <Chip
          size="small"
          color={LEVEL_COLOR[metric.level]}
          label={t(`face.level.${metric.level}`)}
        />
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.round(metric.score * 100)}
        color={LEVEL_COLOR[metric.level]}
        sx={{ height: 6, borderRadius: 3, mb: 1 }}
      />
      <Typography variant="body2" color="text.secondary">
        {t(`face.desc.${metric.metric}` as TranslationKey)}
      </Typography>
      {metric.level !== 'low' && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          {t(`face.advice.${metric.metric}` as TranslationKey)}
        </Typography>
      )}
    </Box>
  )
}

// Kesilgan yuz rasmi + tahlil qilingan zonalar (doiralar)
function RegionsPreview(props: {
  url: string
  regions: FaceRegion[]
  width: number
  height: number
  caption: string
}): React.JSX.Element {
  const { url, regions, width, height, caption } = props
  return (
    <Box sx={{ width: 260, flexShrink: 0 }}>
      <Box sx={{ position: 'relative', width: '100%', aspectRatio: `${width} / ${height}` }}>
        <Box
          component="img"
          src={url}
          alt={caption}
          sx={{ width: '100%', height: '100%', borderRadius: 2, display: 'block' }}
        />
        <Box
          component="svg"
          viewBox={`0 0 ${width} ${height}`}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          aria-hidden
        >
          {regions.map((r) => (
            <circle
              key={r.name}
              cx={r.x}
              cy={r.y}
              r={r.r}
              fill="none"
              stroke="#ffffff"
              strokeWidth={3}
              strokeDasharray="6 4"
              opacity={0.9}
            />
          ))}
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary">
        {caption}
      </Typography>
    </Box>
  )
}
