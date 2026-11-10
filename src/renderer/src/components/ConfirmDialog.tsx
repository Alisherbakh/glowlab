import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

type Props = {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

// Xavfli amallar (o'chirish) uchun tasdiqlash oynasi
export function ConfirmDialog(props: Props): React.JSX.Element {
  return (
    <Dialog open={props.open} onClose={props.onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{props.title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{props.body}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onCancel}>{props.cancelLabel}</Button>
        <Button color="error" variant="contained" onClick={props.onConfirm}>
          {props.confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
