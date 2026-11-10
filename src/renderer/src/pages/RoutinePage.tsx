import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import ArrowDownwardOutlined from '@mui/icons-material/ArrowDownwardOutlined'
import ArrowUpwardOutlined from '@mui/icons-material/ArrowUpwardOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import NightsStayOutlined from '@mui/icons-material/NightsStayOutlined'
import WbSunnyOutlined from '@mui/icons-material/WbSunnyOutlined'
import { getExpiryStatus } from '../../../shared/products'
import { MAX_ROUTINE_STEPS, type RoutineSlot, type Routines } from '../../../shared/routine'
import type { TranslationKey } from '../i18n'
import { ExpiryBadge } from '../components/ExpiryBadge'
import { useNavigate } from '../hooks/navContext'
import { useProducts } from '../hooks/useProducts'
import { useSettings } from '../hooks/useSettings'

// Ertalabki (AM) va kechki (PM) parvarish tartibi
export function RoutinePage(): React.JSX.Element {
  const { t } = useSettings()
  const navigate = useNavigate()
  const { products, loading } = useProducts()
  const [routines, setRoutines] = useState<Routines | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    window.api.routines
      .get()
      .then((r) => active && setRoutines(r))
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
  }, [])

  // Yangi tartibni saqlaymiz (har bir o'zgarishdan keyin darhol)
  const save = async (slot: RoutineSlot, ids: number[]): Promise<void> => {
    setError(false)
    try {
      setRoutines(await window.api.routines.save(slot, ids))
    } catch {
      setError(true)
    }
  }

  if (loading || !routines)
    return <>{error && <Alert severity="error">{t('routine.error')}</Alert>}</>

  if (products.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6">{t('routine.empty.title')}</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t('routine.empty.body')}
          </Typography>
          <Button variant="contained" onClick={() => navigate('shelf')}>
            {t('dash.goShelf')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const slots: { slot: RoutineSlot; icon: React.JSX.Element; titleKey: TranslationKey }[] = [
    { slot: 'AM', icon: <WbSunnyOutlined color="warning" />, titleKey: 'routine.am' },
    { slot: 'PM', icon: <NightsStayOutlined color="secondary" />, titleKey: 'routine.pm' }
  ]

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{t('routine.error')}</Alert>}
      <Typography color="text.secondary">{t('routine.hint')}</Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 2
        }}
      >
        {slots.map(({ slot, icon, titleKey }) => {
          const steps = routines[slot]
          const ids = steps.map((p) => p.id)
          const available = products.filter((p) => !ids.includes(p.id)) // Hali qo'shilmaganlar

          // Ikki qadam o'rnini almashtiradi
          const move = (from: number, to: number): void => {
            const next = [...ids]
            ;[next[from], next[to]] = [next[to], next[from]]
            void save(slot, next)
          }

          return (
            <Card key={slot}>
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                  {icon}
                  <Typography variant="h6">{t(titleKey)}</Typography>
                  <Chip size="small" label={t('routine.steps', { count: steps.length })} />
                </Stack>

                {steps.length === 0 && (
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    {t('routine.noSteps')}
                  </Typography>
                )}

                <Stack spacing={1} sx={{ mb: 2 }}>
                  {steps.map((p, i) => {
                    const expired = getExpiryStatus(p.expiresAt).status === 'expired'
                    return (
                      <Stack
                        key={p.id}
                        direction="row"
                        spacing={1}
                        sx={{
                          alignItems: 'center',
                          p: 1,
                          borderRadius: 2,
                          border: 1,
                          borderColor: expired ? 'error.main' : 'divider' // Muddati o'tgan → qizil chegara
                        }}
                      >
                        <Typography sx={{ fontWeight: 600, width: 24, textAlign: 'center' }}>
                          {i + 1}
                        </Typography>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography noWrap>{p.name}</Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}
                          >
                            {p.category && (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={t(`cat.${p.category}` as TranslationKey)}
                              />
                            )}
                            <ExpiryBadge expiresAt={p.expiresAt} />
                          </Stack>
                        </Box>
                        <Tooltip title={t('routine.up')}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={i === 0}
                              onClick={() => move(i, i - 1)}
                              aria-label={t('routine.up')}
                            >
                              <ArrowUpwardOutlined fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={t('routine.down')}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={i === steps.length - 1}
                              onClick={() => move(i, i + 1)}
                              aria-label={t('routine.down')}
                            >
                              <ArrowDownwardOutlined fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={t('routine.remove')}>
                          <IconButton
                            size="small"
                            onClick={() =>
                              void save(
                                slot,
                                ids.filter((id) => id !== p.id)
                              )
                            }
                            aria-label={t('routine.remove')}
                          >
                            <CloseOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )
                  })}
                </Stack>

                {steps.some((p) => getExpiryStatus(p.expiresAt).status === 'expired') && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    {t('routine.expiredWarning')}
                  </Alert>
                )}

                <TextField
                  select
                  size="small"
                  fullWidth
                  label={t('routine.add')}
                  value=""
                  disabled={available.length === 0 || steps.length >= MAX_ROUTINE_STEPS}
                  onChange={(e) => void save(slot, [...ids, Number(e.target.value)])} // Oxiriga qo'shamiz
                >
                  {available.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                      {p.brand ? ` · ${p.brand}` : ''}
                    </MenuItem>
                  ))}
                </TextField>
              </CardContent>
            </Card>
          )
        })}
      </Box>
    </Stack>
  )
}
