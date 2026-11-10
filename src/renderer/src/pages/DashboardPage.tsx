import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { getExpiryStatus } from '../../../shared/products'
import { ExpiryBadge } from '../components/ExpiryBadge'
import { useNavigate } from '../hooks/navContext'
import { useProducts } from '../hooks/useProducts'
import { useSettings } from '../hooks/useSettings'

// Bosh sahifa: umumiy sonlar + e'tibor talab qiladigan mahsulotlar
export function DashboardPage(): React.JSX.Element {
  const { t } = useSettings()
  const navigate = useNavigate()
  const { products, loading } = useProducts()

  const withStatus = products.map((p) => ({ p, ...getExpiryStatus(p.expiresAt) }))
  const soon = withStatus.filter((x) => x.status === 'soon')
  const expired = withStatus.filter((x) => x.status === 'expired')
  const attention = [...expired, ...soon] // Avval o'tganlar, keyin yaqinlar

  if (loading) return <></>

  const stats = [
    { label: t('dash.total'), value: products.length, color: 'text.primary' },
    { label: t('dash.soon'), value: soon.length, color: 'warning.main' },
    { label: t('dash.expired'), value: expired.length, color: 'error.main' }
  ]

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {s.label}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 600, color: s.color }}>
                {s.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            {t('dash.expiringTitle')}
          </Typography>
          {attention.length === 0 ? (
            <Typography color="text.secondary">{t('dash.allGood')}</Typography>
          ) : (
            <Stack spacing={1.5}>
              {attention.map(({ p }) => (
                <Stack
                  key={p.id}
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap>{p.name}</Typography>
                    {p.brand && (
                      <Typography variant="caption" color="text.secondary">
                        {p.brand}
                      </Typography>
                    )}
                  </Box>
                  <ExpiryBadge expiresAt={p.expiresAt} />
                </Stack>
              ))}
            </Stack>
          )}
          <Button sx={{ mt: 2 }} onClick={() => navigate('shelf')}>
            {t('dash.goShelf')}
          </Button>
        </CardContent>
      </Card>
    </Stack>
  )
}
