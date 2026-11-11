import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import type { ClassifierMetrics, GradCamImage, LabInfo } from '../../../shared/aiLab'
import type { TranslationKey } from '../i18n'
import { useSettings } from '../hooks/useSettings'

const pct = (v: number): string => `${(v * 100).toFixed(1)}%`

// AI Lab: ilovadagi modellar qanday ishlashi va qanchalik aniqligi (haqiqiy raqamlar)
export function AiLabPage(): React.JSX.Element {
  const { t } = useSettings()
  const [info, setInfo] = useState<LabInfo | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    window.api.ai
      .labInfo()
      .then(setInfo)
      .catch(() => setError(true))
  }, [])

  if (error) return <Alert severity="error">{t('lab.error')}</Alert>
  if (!info) return <></>

  return (
    <Stack spacing={2} sx={{ maxWidth: 1000 }}>
      <Typography color="text.secondary">{t('lab.intro')}</Typography>

      {info.classifier ? (
        <ClassifierSection m={info.classifier} gradcam={info.gradcam} />
      ) : (
        <Alert severity="info">{t('lab.clf.missing')}</Alert>
      )}

      <InfoCard
        title={t('lab.face.title')}
        chips={[t('lab.face.chip1'), t('lab.face.chip2'), t('lab.face.chip3')]}
        steps={['lab.face.s1', 'lab.face.s2', 'lab.face.s3', 'lab.face.s4']}
        note={t('lab.face.note')}
      />

      <InfoCard
        title={t('lab.rag.title')}
        chips={[
          t('lab.rag.chunks', { chunks: info.rag.chunks, pages: info.rag.sourcePages }),
          `${info.rag.embeddingModel} · ${info.rag.dimensions}d`,
          info.rag.vectorReady
            ? t('lab.rag.ready')
            : info.rag.vectorAvailable
              ? t('lab.rag.notYet')
              : t('lab.rag.noVec')
        ]}
        steps={['lab.rag.s1', 'lab.rag.s2', 'lab.rag.s3', 'lab.rag.s4']}
        params={{ k: info.rag.topK, d: info.rag.maxDistance, m: info.rag.minMargin }}
        note={t('lab.rag.note')}
      />

      <InfoCard
        title={t('lab.compat.title')}
        chips={[t('lab.compat.rules', { count: info.compatRules }), t('lab.compat.offline')]}
        steps={['lab.compat.s1', 'lab.compat.s2']}
        note={t('lab.compat.note')}
      />
    </Stack>
  )
}

type Cell = { from: number; to: number; n: number }

// Eng ko'p uchragan xato: diagonaldan tashqaridagi eng katta katak
function worstMistake(confusion: number[][]): Cell | null {
  let worst: Cell | null = null
  confusion.forEach((row, i) =>
    row.forEach((n, j) => {
      if (i !== j && n > 0 && (worst === null || n > worst.n)) worst = { from: i, to: j, n }
    })
  )
  return worst
}

function ClassifierSection({
  m,
  gradcam
}: {
  m: ClassifierMetrics
  gradcam: GradCamImage[]
}): React.JSX.Element {
  const { t } = useSettings()
  const label = (c: string): string => t(`cat.${c}` as TranslationKey)
  const w = worstMistake(m.confusion)

  return (
    <Card>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Typography variant="h6">{t('lab.clf.title')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('lab.clf.desc')}
          </Typography>
        </Box>

        {/* Asosiy raqamlar */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 1.5
          }}
        >
          <Stat label={t('lab.clf.accuracy')} value={pct(m.testAccuracy)} />
          <Stat label={t('lab.clf.testImages')} value={String(m.testImages)} />
          <Stat label={t('lab.clf.classes')} value={String(m.classes.length)} />
          <Stat label={t('lab.clf.threshold')} value={`${Math.round(m.appThreshold * 100)}%`} />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 3
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('lab.clf.recallTitle')}
            </Typography>
            <RecallBars classes={m.classes} recall={m.recall} label={label} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('lab.clf.cmTitle')}
            </Typography>
            <ConfusionMatrix m={m} label={label} />
          </Box>
        </Box>

        <Stack spacing={1}>
          {w && (
            <Alert severity="info">
              {t('lab.clf.worst', {
                from: label(m.classes[w.from]),
                to: label(m.classes[w.to]),
                n: w.n
              })}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            {t('lab.clf.thresholdNote', {
              model: Math.round(m.modelThreshold * 100),
              app: Math.round(m.appThreshold * 100)
            })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('lab.clf.dataNote')}
          </Typography>
        </Stack>

        {gradcam.length > 0 && (
          <Box>
            <Typography variant="subtitle2">{t('lab.clf.gradcamTitle')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t('lab.clf.gradcamDesc')}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 1.5
              }}
            >
              {gradcam.map((g) => (
                <Box key={g.cls} component="figure" sx={{ m: 0 }}>
                  <Box
                    component="img"
                    src={g.dataUrl}
                    alt={`Grad-CAM: ${label(g.cls)}`}
                    sx={{ width: '100%', borderRadius: 2, border: 1, borderColor: 'divider' }}
                  />
                  <Typography component="figcaption" variant="caption" color="text.secondary">
                    {label(g.cls)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 600, fontFamily: 'inherit' }}>
        {/* Raqamlar matn shriftida (serif emas) — o'lchov asbobidek aniq */}
        {value}
      </Typography>
    </Box>
  )
}

// Sinflar bo'yicha natija: bitta rang, ingichka chiziq, qiymat matn rangida
function RecallBars({
  classes,
  recall,
  label
}: {
  classes: string[]
  recall: number[]
  label: (c: string) => string
}): React.JSX.Element {
  return (
    <Stack spacing={1}>
      {classes.map((c, i) => (
        <Tooltip key={c} title={`${label(c)}: ${pct(recall[i])}`} placement="top">
          <Box
            tabIndex={0}
            aria-label={`${label(c)}: ${pct(recall[i])}`}
            sx={{
              display: 'grid',
              gridTemplateColumns: '130px 1fr 56px',
              alignItems: 'center',
              gap: 1
            }}
          >
            <Typography variant="body2" noWrap>
              {label(c)}
            </Typography>
            <Box sx={{ height: 12, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Box
                sx={{
                  height: '100%',
                  width: `${recall[i] * 100}%`,
                  bgcolor: 'primary.main',
                  borderRadius: 1
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: 500 }}>
              {pct(recall[i])}
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Stack>
  )
}

// Confusion matrix: qator = haqiqiy sinf, ustun = bashorat. Rang to'yinganligi = qatordagi ulush
function ConfusionMatrix({
  m,
  label
}: {
  m: ClassifierMetrics
  label: (c: string) => string
}): React.JSX.Element {
  const { t } = useSettings()
  const theme = useTheme()
  const base = theme.palette.primary.main
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box
        component="table"
        sx={{ borderCollapse: 'separate', borderSpacing: '2px', fontSize: 12, width: '100%' }}
      >
        <caption style={{ captionSide: 'bottom', textAlign: 'left', paddingTop: 6 }}>
          <Typography variant="caption" color="text.secondary">
            {t('lab.clf.cmCaption')}
          </Typography>
        </caption>
        <thead>
          <tr>
            <Box component="th" scope="col" sx={{ textAlign: 'left', fontWeight: 400 }}>
              <Typography variant="caption" color="text.secondary">
                {t('lab.clf.cmAxes')}
              </Typography>
            </Box>
            {/* Ustunlar raqam bilan (uzun nomlar sig'maydi); raqam qator boshida ham bor */}
            {m.classes.map((c, j) => (
              <Box
                component="th"
                scope="col"
                key={c}
                title={label(c)}
                aria-label={label(c)}
                sx={{ fontWeight: 500, color: 'text.secondary', px: 0.5 }}
              >
                {j + 1}
              </Box>
            ))}
          </tr>
        </thead>
        <tbody>
          {m.confusion.map((row, i) => {
            const total = row.reduce((a, b) => a + b, 0) || 1
            return (
              <tr key={m.classes[i]}>
                <Box
                  component="th"
                  scope="row"
                  sx={{
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'text.secondary',
                    pr: 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {i + 1} · {label(m.classes[i])}
                </Box>
                {row.map((n, j) => {
                  const share = n / total
                  const tip = `${t('lab.clf.cmTrue')}: ${label(m.classes[i])} → ${t('lab.clf.cmPred')}: ${label(m.classes[j])} · ${n} (${pct(share)})`
                  return (
                    <Tooltip key={j} title={tip}>
                      <Box
                        component="td"
                        tabIndex={0}
                        aria-label={tip}
                        sx={{
                          textAlign: 'center',
                          py: 0.75,
                          borderRadius: 1,
                          minWidth: 36,
                          // Bir rang, och→to'q; 0 bo'lsa fon yo'q
                          bgcolor: n === 0 ? 'transparent' : alpha(base, 0.12 + 0.6 * share),
                          color: n === 0 ? 'text.disabled' : 'text.primary',
                          fontWeight: i === j ? 600 : 400,
                          outline: i !== j && n > 0 ? `1px solid ${base}` : 'none' // Xato kataklari ajralib tursin
                        }}
                      >
                        {n}
                      </Box>
                    </Tooltip>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </Box>
    </Box>
  )
}

function InfoCard({
  title,
  chips,
  steps,
  params,
  note
}: {
  title: string
  chips: string[]
  steps: TranslationKey[]
  params?: Record<string, string | number>
  note: string
}): React.JSX.Element {
  const { t } = useSettings()
  return (
    <Card>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="h6">{title}</Typography>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          {chips.map((c) => (
            <Chip key={c} size="small" variant="outlined" label={c} />
          ))}
        </Stack>
        <Box
          component="ol"
          sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}
        >
          {steps.map((s) => (
            <Typography component="li" variant="body2" key={s}>
              {t(s, params)}
            </Typography>
          ))}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {note}
        </Typography>
      </CardContent>
    </Card>
  )
}
