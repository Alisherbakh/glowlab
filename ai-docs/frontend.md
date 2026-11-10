# Frontend (renderer)

## Stack
React + TypeScript + MUI + SCSS. Design rules live in the `ui-ux` skill.

## Folder structure
```
src/renderer/src/
├── pages/        # one folder per screen
├── components/   # shared: AiDisclaimer, QualityHint, ExpiryBadge, ...
├── hooks/        # useProducts, useProfile, ...
├── cv/           # qualityCheck.ts, faceZones.ts, skinMetrics.ts (opencv.js / MediaPipe)
├── i18n/         # uz, ko, en
└── styles/       # SCSS variables, theme
```

## Screens
| Screen | Purpose | Stage |
|---|---|---|
| Onboarding | Age range, skin type, concerns (+ optional quiz) | 5 |
| Dashboard | Summary: expiring soon, today's routine, last scan | 4/12 |
| My Shelf | Product cards with expiry badges | 6 |
| Add Product | Form + photo + classifier suggestion + label scan | 6/7/10 |
| Product Detail | Info, ingredients, risks, analysis history | 7 |
| Face Scan | Camera/photo → Quality Gate → skin observations | 11 |
| Routine | AM / PM ordered steps | 8 |
| Diary | Scan history + progress charts | 12 |
| Ask GlowLab | RAG chatbot with sources | 13 |
| AI Lab | Model metrics, confusion matrix, Grad-CAM | 14 |
| Settings | Language, theme, API key, delete all data | 4 |

## Shared components (planned)
- `AiDisclaimer` — required on every AI result.
- `QualityHint` — live camera/photo quality messages.
- `ExpiryBadge` — 🟢 OK / 🟡 soon / 🔴 expired.
- `ConfidenceBar` — top-3 predictions with %.

## Status (Stage 4)
- Built: layout (sidebar + top bar), theme light/dark/system, i18n uz/ko/en, Settings page, `ComingSoon` placeholder pages.
- Navigation: `PageId` state in `App.tsx`, registry in `pages/index.ts` (no router).
- Settings state: `components/SettingsProvider.tsx` + `hooks/useSettings.ts`.
- MUI v9: no system props on components (use `sx`).

## Rules
- Talk to main only through `window.api.*` (preload). No Node APIs in renderer.
- All user-facing text through i18n (uz / ko / en).
