import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import {
  PAO_OPTIONS,
  PRODUCT_CATEGORIES,
  computeExpiresAt,
  todayLocal,
  type Product,
  type ProductCategory,
  type ProductInput
} from '../../../shared/products'
import type { TranslationKey } from '../i18n'
import { useSettings } from '../hooks/useSettings'
import { formatDate } from '../utils/format'
import { PhotoSuggest } from './PhotoSuggest'

type Props = {
  product: Product | null // null → yangi mahsulot
  onSave: (input: ProductInput) => Promise<void>
  onClose: () => void
}

// Mahsulot qo'shish / tahrirlash formasi (ochilganda har safar yangidan yaratiladi)
export function ProductDialog({ product, onSave, onClose }: Props): React.JSX.Element {
  const { t, settings } = useSettings()
  const [name, setName] = useState(product?.name ?? '')
  const [brand, setBrand] = useState(product?.brand ?? '')
  const [category, setCategory] = useState<ProductCategory | ''>(product?.category ?? '')
  const [openedAt, setOpenedAt] = useState(product?.openedAt ?? '')
  const [paoMonths, setPaoMonths] = useState<number>(product?.paoMonths ?? 12)
  const [touched, setTouched] = useState(false) // Saqlash bosilganmi (xatolarni shundan keyin ko'rsatamiz)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)

  const today = todayLocal()
  const nameError = touched && name.trim() === ''
  const futureError = openedAt !== '' && openedAt > today // Kelajakdagi sana
  const preview = computeExpiresAt(openedAt || null, paoMonths) // Muddatni darhol ko'rsatamiz

  // PAO ro'yxatida bo'lmagan eski qiymat ham tanlovda ko'rinsin
  const paoOptions = (PAO_OPTIONS as readonly number[]).includes(paoMonths)
    ? [...PAO_OPTIONS]
    : [...PAO_OPTIONS, paoMonths].sort((a, b) => a - b)

  const handleSave = async (): Promise<void> => {
    setTouched(true)
    if (name.trim() === '' || futureError) return
    setSaving(true)
    setSaveError(false)
    try {
      await onSave({
        name: name.trim(),
        brand: brand.trim() || null,
        category: category || null,
        openedAt: openedAt || null,
        paoMonths
      })
      onClose()
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{product ? t('product.editTitle') : t('product.addTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            label={t('product.name')}
            placeholder={t('product.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={nameError}
            helperText={nameError ? t('product.error.name') : ' '}
            required
            autoFocus
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
          <TextField
            label={t('product.brand')}
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 80 } }}
          />
          <TextField
            select
            label={t('product.category')}
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategory | '')}
          >
            <MenuItem value="">{t('product.noCategory')}</MenuItem>
            {PRODUCT_CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {t(`cat.${c}` as TranslationKey)}
              </MenuItem>
            ))}
          </TextField>
          {/* Rasmdan turini taklif qilish: tanlov faqat foydalanuvchi "Qo'llash"ni bosganda o'zgaradi */}
          <PhotoSuggest current={category} onUse={setCategory} />
          <Stack direction="row" spacing={2}>
            <TextField
              type="date"
              label={t('product.openedAt')}
              value={openedAt}
              onChange={(e) => setOpenedAt(e.target.value)}
              error={futureError}
              helperText={futureError ? t('product.error.future') : t('product.openedHint')}
              sx={{ flex: 1 }}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today } }}
            />
            <TextField
              select
              label={t('product.pao')}
              value={paoMonths}
              onChange={(e) => setPaoMonths(Number(e.target.value))}
              helperText={t('product.paoHint')}
              sx={{ flex: 1 }}
            >
              {paoOptions.map((m) => (
                <MenuItem key={m} value={m}>
                  {t('product.paoMonths', { months: m })}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          {preview && !futureError && (
            <Typography variant="body2" color="text.secondary">
              {t('product.expiresPreview', { date: formatDate(preview, settings.language) })}
            </Typography>
          )}
          {saveError && <Alert severity="error">{t('product.error.save')}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('product.cancel')}</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {t('product.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
