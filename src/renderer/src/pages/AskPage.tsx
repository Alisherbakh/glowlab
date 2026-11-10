import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import DeleteSweepOutlined from '@mui/icons-material/DeleteSweepOutlined'
import OpenInNewOutlined from '@mui/icons-material/OpenInNewOutlined'
import SendOutlined from '@mui/icons-material/SendOutlined'
import type { AiKeyStatus } from '../../../shared/analysis'
import {
  MAX_QUESTION_LENGTH,
  type AskResult,
  type AskSource,
  type KbStatus
} from '../../../shared/ask'
import type { TranslationKey } from '../i18n'
import { AiDisclaimer } from '../components/AiDisclaimer'
import { useSettings } from '../hooks/useSettings'

const CONSENT_KEY = 'glowlab.askConsent' // Faqat shu kompyuterdagi qulaylik uchun (localStorage)

function readConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'yes'
  } catch {
    return false
  }
}
function writeConsent(): void {
  try {
    localStorage.setItem(CONSENT_KEY, 'yes')
  } catch {
    // localStorage ishlamasa — har safar so'raymiz
  }
}

type Turn = { id: number; question: string; result: AskResult | null } // null → javob kutilmoqda

const SUGGESTIONS: TranslationKey[] = ['ask.suggest.1', 'ask.suggest.2', 'ask.suggest.3']

// "GlowLab'dan so'rang": bilim bazasidan qidiradi, javob faqat manbalar asosida (RAG)
export function AskPage(): React.JSX.Element {
  const { t } = useSettings()
  const [keyStatus, setKeyStatus] = useState<AiKeyStatus | null>(null)
  const [kb, setKb] = useState<KbStatus | null>(null)
  const [consent, setConsent] = useState(readConsent())
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState<Turn[]>([]) // Suhbat faqat xotirada, bazaga yozilmaydi
  const nextId = useRef(1)
  const bottomRef = useRef<HTMLDivElement>(null)

  const refreshStatus = (): void => {
    window.api.ask
      .status()
      .then(setKb)
      .catch(() => setKb(null))
  }

  useEffect(() => {
    window.api.ai
      .keyStatus()
      .then(setKeyStatus)
      .catch(() => setKeyStatus(null))
    refreshStatus()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [turns])

  const online = keyStatus?.configured === true
  const busy = turns.some((x) => x.result === null)
  const trimmed = question.trim()
  const canSend = trimmed.length >= 2 && !busy && (!online || consent) && (kb?.chunks ?? 0) > 0

  const send = async (text: string): Promise<void> => {
    const q = text.trim()
    if (q.length < 2 || busy || (online && !consent)) return
    if (online) writeConsent()
    const id = nextId.current++
    setTurns((list) => [...list, { id, question: q, result: null }])
    setQuestion('')
    let result: AskResult
    try {
      result = await window.api.ask.question(q)
    } catch {
      result = { status: 'error', code: 'unknown' }
    }
    setTurns((list) => list.map((x) => (x.id === id ? { ...x, result } : x)))
    refreshStatus() // Birinchi savoldan keyin vektorlar tayyor bo'ladi
  }

  if (kb !== null && kb.chunks === 0) {
    return <Alert severity="error">{t('ask.error.kbEmpty')}</Alert>
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: 860 }}>
      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography color="text.secondary">{t('ask.intro')}</Typography>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
            {kb && (
              <Chip
                size="small"
                variant="outlined"
                label={t('ask.kbCount', { count: kb.chunks })}
              />
            )}
            {keyStatus && (
              <Chip
                size="small"
                variant="outlined"
                color={online ? 'success' : 'default'}
                label={online ? t('ask.mode.online') : t('ask.mode.offline')}
              />
            )}
          </Stack>
          {keyStatus && !online && <Alert severity="info">{t('ask.offlineInfo')}</Alert>}
        </CardContent>
      </Card>

      {turns.length === 0 && (
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }} aria-label={t('ask.suggestions')}>
          {SUGGESTIONS.map((key) => (
            <Chip
              key={key}
              label={t(key)}
              onClick={() => setQuestion(t(key))}
              variant="outlined"
              color="primary"
            />
          ))}
        </Stack>
      )}

      <Stack spacing={2} role="log" aria-live="polite">
        {turns.map((turn) => (
          <Stack key={turn.id} spacing={1}>
            <Box
              sx={{
                alignSelf: 'flex-end',
                maxWidth: '80%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderRadius: 2,
                px: 1.5,
                py: 1,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere'
              }}
            >
              <Typography variant="body2">{turn.question}</Typography>
            </Box>
            {turn.result === null ? (
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', color: 'text.secondary' }}
              >
                <CircularProgress size={18} />
                <Typography variant="body2">{t('ask.thinking')}</Typography>
              </Stack>
            ) : (
              <AnswerCard result={turn.result} />
            )}
          </Stack>
        ))}
        <div ref={bottomRef} />
      </Stack>

      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField
            multiline
            minRows={2}
            maxRows={6}
            fullWidth
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION_LENGTH))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault() // Enter → yuborish, Shift+Enter → yangi qator
                if (canSend) void send(question)
              }
            }}
            placeholder={t('ask.placeholder')}
            slotProps={{ htmlInput: { 'aria-label': t('ask.inputLabel') } }}
            helperText={`${t('ask.hint')} · ${question.length}/${MAX_QUESTION_LENGTH}`}
          />
          {online && (
            <FormControlLabel
              control={
                <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              }
              label={t('ask.consent')}
            />
          )}
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              startIcon={<DeleteSweepOutlined />}
              onClick={() => setTurns([])}
              disabled={turns.length === 0 || busy}
              color="inherit"
            >
              {t('ask.clear')}
            </Button>
            <Button
              variant="contained"
              endIcon={<SendOutlined />}
              onClick={() => void send(question)}
              disabled={!canSend}
            >
              {t('ask.send')}
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {t('ask.privacy')}
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  )
}

// Bitta javob kartasi
function AnswerCard({ result }: { result: AskResult }): React.JSX.Element {
  const { t } = useSettings()

  if (result.status === 'error') {
    return (
      <Alert severity="error">
        {result.code === 'bad_question' ? t('ask.error.short') : t('scan.error.unknown')}
      </Alert>
    )
  }

  if (result.status === 'not_found') {
    return <Alert severity="info">{t('ask.notFound')}</Alert>
  }

  if (result.status === 'offline') {
    const reasonKey = `scan.error.${result.reason}` as TranslationKey
    return (
      <Card variant="outlined">
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Alert severity={result.reason === 'no_key' ? 'info' : 'warning'}>
            {result.reason === 'no_key' ? t('ask.offlineResults') : t(reasonKey)}
          </Alert>
          {result.sources.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('ask.noMatches')}
            </Typography>
          ) : (
            <>
              <Typography variant="subtitle2">{t('ask.matches')}</Typography>
              <SourceList sources={result.sources} showSnippet />
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="outlined">
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{result.answer}</Typography>
        <Box>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="subtitle2">{t('ask.sources')}</Typography>
            <Chip
              size="small"
              variant="outlined"
              label={
                result.mode === 'semantic' ? t('ask.search.semantic') : t('ask.search.keyword')
              }
            />
          </Stack>
          <SourceList sources={result.sources} />
        </Box>
        <AiDisclaimer />
      </CardContent>
    </Card>
  )
}

// Manbalar ro'yxati: havola tashqi brauzerda ochiladi (main faqat http/https'ga ruxsat beradi)
function SourceList({
  sources,
  showSnippet = false
}: {
  sources: AskSource[]
  showSnippet?: boolean
}): React.JSX.Element {
  const { t } = useSettings()
  return (
    <Stack component="ol" spacing={1} sx={{ m: 0, pl: 0, listStyle: 'none' }}>
      {sources.map((s) => (
        <Box component="li" key={s.id} sx={{ display: 'flex', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 24 }}>
            [{s.n}]
          </Typography>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {s.title}
            </Typography>
            {showSnippet && (
              <Typography variant="body2" color="text.secondary">
                {s.snippet}
              </Typography>
            )}
            <Link
              href={s.url}
              target="_blank"
              rel="noreferrer"
              variant="caption"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
              aria-label={`${s.sourceTitle} — ${t('ask.openSource')}`}
            >
              {s.sourceTitle}
              <OpenInNewOutlined sx={{ fontSize: 14 }} />
            </Link>
          </Box>
        </Box>
      ))}
    </Stack>
  )
}
