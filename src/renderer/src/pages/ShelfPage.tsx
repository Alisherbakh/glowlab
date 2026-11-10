import { useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddOutlined from '@mui/icons-material/AddOutlined'
import MoreVertOutlined from '@mui/icons-material/MoreVertOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import { PRODUCT_CATEGORIES, type Product, type ProductCategory } from '../../../shared/products'
import type { TranslationKey } from '../i18n'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ExpiryBadge } from '../components/ExpiryBadge'
import { ProductDialog } from '../components/ProductDialog'
import { LabelScanDialog } from '../components/LabelScanDialog'
import { useProducts } from '../hooks/useProducts'
import { useSettings } from '../hooks/useSettings'
import { formatDate } from '../utils/format'

// Mening javonim: mahsulotlar ro'yxati, qidiruv, filtr va CRUD
export function ShelfPage(): React.JSX.Element {
  const { t, settings } = useSettings()
  const { products, loading, error, create, update, remove } = useProducts()

  const [query, setQuery] = useState('') // Qidiruv matni
  const [category, setCategory] = useState<ProductCategory | 'all'>('all') // Filtr
  const [dialog, setDialog] = useState<{ product: Product | null } | null>(null) // null → yopiq
  const [toDelete, setToDelete] = useState<Product | null>(null) // O'chirishni tasdiqlash
  const [menu, setMenu] = useState<{ anchor: HTMLElement; product: Product } | null>(null)
  const [scanFor, setScanFor] = useState<Product | null>(null) // Yorliq skani oynasi

  // Qidiruv + kategoriya bo'yicha filtrlangan ro'yxat
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter(
      (p) =>
        (category === 'all' || p.category === category) &&
        (q === '' || p.name.toLowerCase().includes(q) || (p.brand ?? '').toLowerCase().includes(q))
    )
  }, [products, query, category])

  if (loading) return <></>

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{t('shelf.loadError')}</Alert>}

      {/* Yuqori qator: qidiruv, filtr, qo'shish */}
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder={t('shelf.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ flex: 1, maxWidth: 360 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined fontSize="small" />
                </InputAdornment>
              )
            }
          }}
        />
        <TextField
          select
          size="small"
          value={category}
          onChange={(e) => setCategory(e.target.value as ProductCategory | 'all')}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">{t('shelf.allCategories')}</MenuItem>
          {PRODUCT_CATEGORIES.map((c) => (
            <MenuItem key={c} value={c}>
              {t(`cat.${c}` as TranslationKey)}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          startIcon={<AddOutlined />}
          onClick={() => setDialog({ product: null })}
        >
          {t('shelf.add')}
        </Button>
      </Stack>

      {/* Bo'sh holat */}
      {products.length === 0 && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Inventory2Outlined color="secondary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6">{t('shelf.empty.title')}</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {t('shelf.empty.body')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddOutlined />}
              onClick={() => setDialog({ product: null })}
            >
              {t('shelf.add')}
            </Button>
          </CardContent>
        </Card>
      )}

      {products.length > 0 && visible.length === 0 && (
        <Typography color="text.secondary">{t('shelf.noResults')}</Typography>
      )}

      {/* Mahsulot kartalari */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 2
        }}
      >
        {visible.map((p) => (
          <Card key={p.id}>
            <CardContent>
              <Stack
                direction="row"
                sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }} noWrap title={p.name}>
                    {p.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {p.brand ?? '—'}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  aria-label={t('shelf.actions')}
                  onClick={(e) => setMenu({ anchor: e.currentTarget, product: p })}
                >
                  <MoreVertOutlined fontSize="small" />
                </IconButton>
              </Stack>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {p.category && (
                  <Chip size="small" label={t(`cat.${p.category}` as TranslationKey)} />
                )}
                <ExpiryBadge expiresAt={p.expiresAt} />
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 1.5 }}
              >
                {p.openedAt
                  ? t('shelf.opened', { date: formatDate(p.openedAt, settings.language) })
                  : t('shelf.notOpened')}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Karta menyusi */}
      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            if (menu) setScanFor(menu.product)
            setMenu(null)
          }}
        >
          {t('shelf.scanLabel')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menu) setDialog({ product: menu.product })
            setMenu(null)
          }}
        >
          {t('shelf.edit')}
        </MenuItem>
        <MenuItem
          sx={{ color: 'error.main' }}
          onClick={() => {
            if (menu) setToDelete(menu.product)
            setMenu(null)
          }}
        >
          {t('shelf.delete')}
        </MenuItem>
      </Menu>

      {dialog && (
        <ProductDialog
          product={dialog.product}
          onClose={() => setDialog(null)}
          onSave={(input) => (dialog.product ? update(dialog.product.id, input) : create(input))}
        />
      )}

      {scanFor && <LabelScanDialog product={scanFor} onClose={() => setScanFor(null)} />}

      <ConfirmDialog
        open={toDelete !== null}
        title={t('confirm.deleteTitle', { name: toDelete?.name ?? '' })}
        body={t('confirm.deleteBody')}
        confirmLabel={t('confirm.delete')}
        cancelLabel={t('confirm.cancel')}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) void remove(toDelete.id)
          setToDelete(null)
        }}
      />
    </Stack>
  )
}
