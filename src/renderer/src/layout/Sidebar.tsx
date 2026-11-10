import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import { BOTTOM_NAV, MAIN_NAV, type NavItem, type PageId } from '../navigation'
import { useSettings } from '../hooks/useSettings'
import styles from './Layout.module.scss'

type Props = {
  active: PageId // Hozir ochiq sahifa
  onNavigate: (id: PageId) => void // Menyu bosilganda
}

// Chap tomondagi navigatsiya paneli
export function Sidebar({ active, onNavigate }: Props): React.JSX.Element {
  const { t } = useSettings()

  // Bitta menyu bandini chizadi
  const renderItem = ({ id, icon: Icon, labelKey }: NavItem): React.JSX.Element => (
    <ListItemButton
      key={id}
      selected={active === id} // Faol band ajralib turadi
      onClick={() => onNavigate(id)}
      sx={{ mb: 0.5 }}
    >
      <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
        <Icon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary={t(labelKey)} slotProps={{ primary: { variant: 'body2' } }} />
    </ListItemButton>
  )

  return (
    <Box component="nav" className={styles.sidebar} sx={{ bgcolor: 'background.paper' }}>
      <Box className={styles.brand}>
        <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
          GlowLab
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t('app.tagline')}
        </Typography>
      </Box>
      <List sx={{ flex: 1 }}>{MAIN_NAV.map(renderItem)}</List>
      <List>{BOTTOM_NAV.map(renderItem)}</List>
    </Box>
  )
}
