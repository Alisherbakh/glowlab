import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

export type TrendPoint = {
  time: number // ms (sana-vaqt)
  score: number // 0..100
  dateLabel: string // Tooltip uchun
  levelLabel: string // "Past" / "O'rtacha" / "Yuqori"
}

type Props = {
  title: string
  points: TrendPoint[] // Vaqt bo'yicha o'sish tartibida
  firstLabel: string // X o'qi: birinchi sana
  lastLabel: string // X o'qi: oxirgi sana
  ariaLabel: string
}

// Bitta ko'rsatkichning vaqt bo'yicha o'zgarishi (small multiple: bitta chiziq, legend kerak emas)
const W = 320
const H = 130
const PAD = { left: 30, right: 30, top: 12, bottom: 24 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom
const TICKS = [0, 50, 100]

export function MetricTrend({
  title,
  points,
  firstLabel,
  lastLabel,
  ariaLabel
}: Props): React.JSX.Element {
  const theme = useTheme()
  const [active, setActive] = useState<number | null>(null)

  const tMin = points[0]?.time ?? 0
  const tMax = points[points.length - 1]?.time ?? 0
  const span = tMax - tMin
  // Vaqtga mutanosib; hammasi bir paytda bo'lsa — teng oraliqda
  const x = (p: TrendPoint, i: number): number =>
    PAD.left +
    (span > 0
      ? ((p.time - tMin) / span) * PLOT_W
      : points.length > 1
        ? (i / (points.length - 1)) * PLOT_W
        : PLOT_W / 2)
  const y = (score: number): number => PAD.top + (1 - score / 100) * PLOT_H

  const line = theme.palette.primary.main
  const surface = theme.palette.background.paper
  const grid = theme.palette.divider
  const muted = theme.palette.text.secondary
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p, i).toFixed(1)},${y(p.score).toFixed(1)}`)
    .join(' ')
  const last = points[points.length - 1]
  const activePoint = active !== null ? points[active] : null

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}
      >
        <Typography variant="subtitle2">{title}</Typography>
        {last && (
          <Typography variant="caption" color="text.secondary">
            {last.levelLabel}
          </Typography>
        )}
      </Stack>
      <Box sx={{ position: 'relative' }}>
        <Box
          component="svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={ariaLabel}
          sx={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        >
          {/* Panjara: ingichka, bir tekis, e'tiborni tortmaydi */}
          {TICKS.map((tk) => (
            <g key={tk}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(tk)}
                y2={y(tk)}
                stroke={grid}
                strokeWidth={1}
              />
              <text x={PAD.left - 6} y={y(tk) + 3.5} textAnchor="end" fontSize={10} fill={muted}>
                {tk}
              </text>
            </g>
          ))}
          <text x={PAD.left} y={H - 6} fontSize={10} fill={muted}>
            {firstLabel}
          </text>
          {points.length > 1 && (
            <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize={10} fill={muted}>
              {lastLabel}
            </text>
          )}

          {/* Hover chizig'i */}
          {activePoint && active !== null && (
            <line
              x1={x(activePoint, active)}
              x2={x(activePoint, active)}
              y1={PAD.top}
              y2={PAD.top + PLOT_H}
              stroke={muted}
              strokeWidth={1}
              opacity={0.5}
            />
          )}

          <path
            d={path}
            fill="none"
            stroke={line}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={x(p, i)}
              cy={y(p.score)}
              r={active === i ? 5.5 : 4}
              fill={line}
              stroke={surface}
              strokeWidth={2}
            />
          ))}
          {/* Faqat oxirgi qiymat yoziladi (har nuqtaga son yozilmaydi) */}
          {last && (
            <text
              x={x(last, points.length - 1) + 8}
              y={y(last.score) + 4}
              fontSize={11}
              fontWeight={600}
              fill={theme.palette.text.primary}
            >
              {Math.round(last.score)}
            </text>
          )}
          {/* Ko'rinmas katta nishonlar: sichqoncha va klaviatura uchun */}
          {points.map((p, i) => (
            <circle
              key={`hit-${i}`}
              cx={x(p, i)}
              cy={y(p.score)}
              r={12}
              fill="transparent"
              tabIndex={0}
              aria-label={`${p.dateLabel}: ${Math.round(p.score)} / 100, ${p.levelLabel}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              style={{ cursor: 'default', outline: 'none' }}
            />
          ))}
        </Box>

        {activePoint && active !== null && (
          <Box
            sx={{
              position: 'absolute',
              left: `${(x(activePoint, active) / W) * 100}%`,
              top: `${(y(activePoint.score) / H) * 100}%`,
              transform: `translate(${x(activePoint, active) > W / 2 ? 'calc(-100% - 10px)' : '10px'}, -50%)`,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              boxShadow: 2,
              px: 1,
              py: 0.5,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 1
            }}
          >
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              {activePoint.dateLabel}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {Math.round(activePoint.score)} / 100 · {activePoint.levelLabel}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
