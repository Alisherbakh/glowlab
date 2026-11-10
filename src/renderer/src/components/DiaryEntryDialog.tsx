import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import {
  DIARY_TAGS,
  MAX_NOTE_LENGTH,
  type DiaryEntry,
  type DiaryEntryInput,
  type DiaryTag
} from '../../../shared/diary'
import type { SavedFaceScan } from '../../../shared/faceScan'
import { todayLocal } from '../../../shared/products'
import type { TranslationKey } from '../i18n'
import { useSettings } from '../hooks/useSettings'
import { formatDateTime } from '../utils/format'
import { FEELING_ICONS } from './feelingIcons'

type Props = {
  entry: DiaryEntry | null // null → yangi yozuv
  scans: SavedFaceScan[] // Bog'lash uchun saqlangan yuz skanlari (yangilari birinchi)
  onSave: (input: DiaryEntryInput) => Promise<void>
  onClose: () => void
}

// Skan sanasi (UTC) → mahalliy YYYY-MM-DD
function localDay(createdAt: string): string {
  const d = new Date(createdAt.replace(' ', 'T') + 'Z')
  return todayLocal(d)
}

// Kundalik yozuvi: sana, his-tuyg'u (1–5), belgilar, izoh, ixtiyoriy yuz skani
export function DiaryEntryDialog({ entry, scans, onSave, onClose }: Props): React.JSX.Element {
  const { t, settings } = useSettings()
  const today = todayLocal()
  const [entryDate, setEntryDate] = useState(entry?.entryDate ?? today)
  const [feeling, setFeeling] = useState<number | null>(entry?.feeling ?? null)
  const [tags, setTags] = useState<DiaryTag[]>(entry?.tags ?? [])
  const [note, setNote] = useState(entry?.note ?? '')
  // Yangi yozuvda: shu kundagi eng so'nggi skan avtomatik taklif qilinadi
  const [faceScanId, setFaceScanId] = useState<number | null>(
    entry ? entry.faceScanId : (scans.find((s) => localDay(s.createdAt) === today)?.id ?? null)
  )
  const [error, setError] = useState<'empty' | 'future' | 'save' | null>(null)
  const [saving, setSaving] = useState(false)

  const toggleTag = (tag: DiaryTag): void =>
    setTags((cur) => (cur.includes(tag) ? cur.filter((x) => x !== tag) : [...cur, tag]))

  const handleSave = async (): Promise<void> => {
    if (entryDate === '' || entryDate > today) return setError('future')
    if (note.trim() === '' && feeling === null && tags.length === 0) return setError('empty')
    setSaving(true)
    setError(null)
    try {
      await onSave({ entryDate, feeling, tags, note: note.trim(), faceScanId })
      onClose()
    } catch {
      setError('save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{entry ? t('diary.dialog.editTitle') : t('diary.dialog.addTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            type="date"
            label={t('diary.date')}
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today } }}
            sx={{ maxWidth: 220 }}
          />

          <Stack spacing={1}>
            <Typography variant="subtitle2">{t('diary.feeling')}</Typography>
            <ToggleButtonGroup
              exclusive
              value={feeling}
              onChange={(_e, v: number | null) => setFeeling(v)}
              aria-label={t('diary.feeling')}
            >
              {FEELING_ICONS.map((Icon, i) => {
                const value = i + 1
                const label = t(`diary.feeling.${value}` as TranslationKey)
                return (
                  <Tooltip key={value} title={label}>
                    <ToggleButton value={value} aria-label={label}>
                      <Icon />
                    </ToggleButton>
                  </Tooltip>
                )
              })}
            </ToggleButtonGroup>
            {feeling !== null && (
              <Typography variant="body2" color="text.secondary">
                {t(`diary.feeling.${feeling}` as TranslationKey)}
              </Typography>
            )}
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle2">{t('diary.tags')}</Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
              {DIARY_TAGS.map((tag) => {
                const on = tags.includes(tag)
                return (
                  <Chip
                    key={tag}
                    label={t(`diary.tag.${tag}` as TranslationKey)}
                    color={on ? 'primary' : 'default'}
                    variant={on ? 'filled' : 'outlined'}
                    onClick={() => toggleTag(tag)}
                    aria-pressed={on}
                  />
                )
              })}
            </Stack>
          </Stack>

          <TextField
            label={t('diary.note')}
            placeholder={t('diary.notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            multiline
            minRows={3}
            helperText={`${note.length} / ${MAX_NOTE_LENGTH}`}
            slotProps={{ htmlInput: { maxLength: MAX_NOTE_LENGTH } }}
          />

          <TextField
            select
            label={t('diary.scan')}
            value={faceScanId ?? ''}
            onChange={(e) => setFaceScanId(e.target.value === '' ? null : Number(e.target.value))}
          >
            <MenuItem value="">{t('diary.noScan')}</MenuItem>
            {scans.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {formatDateTime(s.createdAt, settings.language)} · {t(`face.source.${s.source}`)}
              </MenuItem>
            ))}
          </TextField>

          {error && <Alert severity="error">{t(`diary.error.${error}`)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('diary.cancel')}</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {t('diary.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
