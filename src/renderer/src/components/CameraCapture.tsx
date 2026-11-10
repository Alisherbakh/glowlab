import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import PhotoCameraOutlined from '@mui/icons-material/PhotoCameraOutlined'
import { useSettings } from '../hooks/useSettings'

type CameraError = 'denied' | 'notFound' | 'error'

type Props = {
  onCapture: (frame: HTMLCanvasElement) => void
  onClose: () => void
}

// Kameradan bitta kadr olish. Ko'rinish oynadagidek (ko'zgu) ko'rsatiladi, lekin olingan rasm aylantirilmaydi
export function CameraCapture({ onCapture, onClose }: Props): React.JSX.Element {
  const { t } = useSettings()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<CameraError | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false // Mikrofon kerak emas
      })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((track) => track.stop())
          return
        }
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const name = err instanceof DOMException ? err.name : ''
        setError(
          name === 'NotAllowedError' || name === 'SecurityError'
            ? 'denied'
            : name === 'NotFoundError' || name === 'OverconstrainedError'
              ? 'notFound'
              : 'error'
        )
      })
    return () => {
      cancelled = true
      stream?.getTracks().forEach((track) => track.stop()) // Oyna yopilganda kamera o'chadi
    }
  }, [])

  const capture = (): void => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    onCapture(canvas)
  }

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('camera.title')}</DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="warning">{t(`camera.${error}`)}</Alert>
        ) : (
          <>
            <Box
              sx={{
                position: 'relative',
                bgcolor: 'black',
                borderRadius: 2,
                overflow: 'hidden',
                aspectRatio: '16 / 9'
              }}
            >
              <Box
                component="video"
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedData={() => setReady(true)}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transform: 'scaleX(-1)'
                }}
              />
              {!ready && (
                <CircularProgress
                  sx={{ position: 'absolute', top: '50%', left: '50%', ml: '-20px', mt: '-20px' }}
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t('camera.hint')}
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('camera.cancel')}</Button>
        {!error && (
          <Button
            variant="contained"
            startIcon={<PhotoCameraOutlined />}
            onClick={capture}
            disabled={!ready}
          >
            {t('camera.capture')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
