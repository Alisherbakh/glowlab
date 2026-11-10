import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddOutlined from '@mui/icons-material/AddOutlined'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import LinkOutlined from '@mui/icons-material/LinkOutlined'
import ShowChartOutlined from '@mui/icons-material/ShowChartOutlined'
import TableRowsOutlined from '@mui/icons-material/TableRowsOutlined'
import type { DiaryEntry, DiaryEntryInput } from '../../../shared/diary'
import { FACE_METRICS, type SavedFaceScan } from '../../../shared/faceScan'
import { todayLocal } from '../../../shared/products'
import type { TranslationKey } from '../i18n'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DiaryEntryDialog } from '../components/DiaryEntryDialog'
import { MetricTrend, type TrendPoint } from '../components/MetricTrend'
import { FEELING_ICONS } from '../components/feelingIcons'
import { useNavigate } from '../hooks/navContext'
import { useSettings } from '../hooks/useSettings'
import { formatDate, formatDateTime } from '../utils/format'

const scanTime = (createdAt: string): number =>
  new Date(createdAt.replace(' ', 'T') + 'Z').getTime()

// Teri kundaligi: yuz skanlari bo'yicha o'zgarishlar grafigi + kundalik yozuvlari
export function DiaryPage(): React.JSX.Element {
  const { t, settings } = useSettings()
  const navigate = useNavigate()
  const [scans, setScans] = useState<SavedFaceScan[]>([]) // Yangilari birinchi (API tartibi)
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const [editing, setEditing] = useState<DiaryEntry | 'new' | null>(null)
  const [toDelete, setToDelete] = useState<DiaryEntry | null>(null)
  const [actionError, setActionError] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([window.api.face.list(), window.api.diary.list()])
      .then(([s, e]) => {
        if (!active) return
        setScans(s)
        setEntries(e)
        setLoaded(true)
      })
      .catch(() => active && setLoadError(true))
    return () => {
      active = false
    }
  }, [])

  // Grafik uchun: eskidan yangiga
  const chronological = useMemo(
    () => [...scans].sort((a, b) => scanTime(a.createdAt) - scanTime(b.createdAt)),
    [scans]
  )
  const scansById = useMemo(() => new Map(scans.map((s) => [s.id, s])), [scans])

  const save = async (input: DiaryEntryInput): Promise<void> => {
    if (editing && editing !== 'new') {
      const updated = await window.api.diary.update(editing.id, input)
      setEntries((list) => sortEntries(list.map((x) => (x.id === updated.id ? updated : x))))
    } else {
      const created = await window.api.diary.create(input)
      setEntries((list) => sortEntries([created, ...list]))
    }
  }

  const remove = async (entry: DiaryEntry): Promise<void> => {
    setToDelete(null)
    try {
      await window.api.diary.remove(entry.id)
      setEntries((list) => list.filter((x) => x.id !== entry.id))
    } catch {
      setActionError(true)
    }
  }

  if (loadError) return <Alert severity="error">{t('diary.error.load')}</Alert>

  const firstLabel = chronological[0]
    ? formatDate(dayOf(chronological[0].createdAt), settings.language)
    : ''
  const lastScan = chronological[chronological.length - 1]
  const lastLabel = lastScan ? formatDate(dayOf(lastScan.createdAt), settings.language) : ''

  return (
    <Stack spacing={2}>
      {actionError && <Alert severity="error">{t('diary.error.save')}</Alert>}

      <Card>
        <CardContent>
          <Stack
            direction="row"
            sx={{
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1,
              flexWrap: 'wrap',
              gap: 1
            }}
          >
            <Typography variant="h6">{t('diary.progressTitle')}</Typography>
            {chronological.length >= 2 && (
              <ToggleButtonGroup
                size="small"
                exclusive
                value={view}
                onChange={(_e, v: 'chart' | 'table' | null) => v && setView(v)}
              >
                <ToggleButton value="chart" aria-label={t('diary.viewChart')}>
                  <ShowChartOutlined fontSize="small" sx={{ mr: 0.5 }} />
                  {t('diary.viewChart')}
                </ToggleButton>
                <ToggleButton value="table" aria-label={t('diary.viewTable')}>
                  <TableRowsOutlined fontSize="small" sx={{ mr: 0.5 }} />
                  {t('diary.viewTable')}
                </ToggleButton>
              </ToggleButtonGroup>
            )}
          </Stack>

          {!loaded ? null : chronological.length < 2 ? (
            <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <Typography color="text.secondary">{t('diary.needScans')}</Typography>
              <Button variant="outlined" onClick={() => navigate('faceScan')}>
                {t('diary.goScan')}
              </Button>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                {t('diary.progressHint')}
              </Typography>
              {view === 'chart' ? (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 1.5
                  }}
                >
                  {FACE_METRICS.map((metric) => {
                    const points: TrendPoint[] = chronological.map((s) => {
                      const m = s.metrics.find((x) => x.metric === metric)!
                      return {
                        time: scanTime(s.createdAt),
                        score: m.score * 100,
                        dateLabel: formatDateTime(s.createdAt, settings.language),
                        levelLabel: t(`face.level.${m.level}`)
                      }
                    })
                    const title = t(`face.metric.${metric}` as TranslationKey)
                    const latest = points[points.length - 1]
                    return (
                      <MetricTrend
                        key={metric}
                        title={title}
                        points={points}
                        firstLabel={firstLabel}
                        lastLabel={lastLabel}
                        ariaLabel={t('diary.trendAria', {
                          metric: title,
                          count: points.length,
                          score: Math.round(latest.score),
                          level: latest.levelLabel
                        })}
                      />
                    )
                  })}
                </Box>
              ) : (
                <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('diary.table.date')}</TableCell>
                        {FACE_METRICS.map((m) => (
                          <TableCell key={m} align="right">
                            {t(`face.metric.${m}` as TranslationKey)}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[...chronological].reverse().map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{formatDateTime(s.createdAt, settings.language)}</TableCell>
                          {FACE_METRICS.map((metric) => {
                            const m = s.metrics.find((x) => x.metric === metric)!
                            return (
                              <TableCell
                                key={metric}
                                align="right"
                                sx={{ fontVariantNumeric: 'tabular-nums' }}
                              >
                                {Math.round(m.score * 100)} · {t(`face.level.${m.level}`)}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack
            direction="row"
            sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}
          >
            <Typography variant="h6">{t('diary.entriesTitle')}</Typography>
            <Button
              variant="contained"
              startIcon={<AddOutlined />}
              onClick={() => setEditing('new')}
            >
              {t('diary.add')}
            </Button>
          </Stack>

          {loaded && entries.length === 0 && (
            <Typography color="text.secondary">{t('diary.empty')}</Typography>
          )}

          <Stack spacing={1.5}>
            {entries.map((entry) => {
              const Icon = entry.feeling ? FEELING_ICONS[entry.feeling - 1] : null
              const linked = entry.faceScanId ? scansById.get(entry.faceScanId) : undefined
              return (
                <Box
                  key={entry.id}
                  sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}
                >
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2">
                      {formatDate(entry.entryDate, settings.language)}
                    </Typography>
                    {Icon && entry.feeling && (
                      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
                        <Icon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {t(`diary.feeling.${entry.feeling}` as TranslationKey)}
                        </Typography>
                      </Stack>
                    )}
                    <Box sx={{ flex: 1 }} />
                    <Tooltip title={t('diary.edit')}>
                      <IconButton
                        size="small"
                        onClick={() => setEditing(entry)}
                        aria-label={t('diary.edit')}
                      >
                        <EditOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('diary.delete')}>
                      <IconButton
                        size="small"
                        onClick={() => setToDelete(entry)}
                        aria-label={t('diary.delete')}
                      >
                        <DeleteOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  {entry.tags.length > 0 && (
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                      {entry.tags.map((tag) => (
                        <Chip
                          key={tag}
                          size="small"
                          label={t(`diary.tag.${tag}` as TranslationKey)}
                        />
                      ))}
                    </Stack>
                  )}
                  {entry.note && (
                    <Typography
                      variant="body2"
                      sx={{ mt: 1, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                    >
                      {entry.note}
                    </Typography>
                  )}
                  {linked && (
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, mt: 1 }}>
                      <LinkOutlined fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {t('diary.linkedScan', {
                          date: formatDateTime(linked.createdAt, settings.language)
                        })}
                      </Typography>
                    </Stack>
                  )}
                </Box>
              )
            })}
          </Stack>
        </CardContent>
      </Card>

      {editing && (
        <DiaryEntryDialog
          entry={editing === 'new' ? null : editing}
          scans={scans}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title={t('diary.delete')}
        body={t('diary.deleteConfirm')}
        confirmLabel={t('diary.delete')}
        cancelLabel={t('confirm.cancel')}
        onConfirm={() => {
          if (toDelete) void remove(toDelete)
        }}
        onCancel={() => setToDelete(null)}
      />
    </Stack>
  )
}

// SQLite UTC vaqti → mahalliy YYYY-MM-DD
function dayOf(createdAt: string): string {
  return todayLocal(new Date(createdAt.replace(' ', 'T') + 'Z'))
}

// Bazadagi tartib bilan bir xil: sana kamayish bo'yicha, bir kunda — yangi id birinchi
function sortEntries(list: DiaryEntry[]): DiaryEntry[] {
  return [...list].sort((a, b) =>
    a.entryDate === b.entryDate ? b.id - a.id : a.entryDate < b.entryDate ? 1 : -1
  )
}
