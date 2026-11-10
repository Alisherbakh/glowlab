# Next Steps

## Done
**Part B — Agent workspace**
- [x] B1 `CLAUDE.md`
- [x] B2 `ai-docs/`
- [x] B3 `.claude/skills/` — 7 project skills
- [x] B4 `Desktop/glowlab-career/decisions.md` + `interview-explainer` skill

## Now
- [ ] Stage 7 check: label scan on Mac (clear / blurry / non-label photo)
- [ ] Stage 8 check: `yarn dev` → Routine page: add products to Morning/Evening, reorder, remove, restart → order kept. With a product expiring in ≤ 30 days, a macOS notification appears ~5 s after start (allow notifications for "Electron" in System Settings → Notifications if asked). Settings switch turns reminders off.

- [x] Stage 9 run (done 2026-11-10): Alisher runs `ml/01` → `04` in Colab (GPU), then copies `product_classifier.onnx`, `classes.json`, `preprocess.json`, `metrics.json`, `confusion_matrix.png` into `resources/models/`. Share test accuracy + confusion matrix.

- [ ] Stage 10 check: `yarn add onnxruntime-node@^1.31.1` (or `yarn install`) → `yarn dev` → Shelf → Add product → "Suggest type from a photo": a clear serum/sunscreen photo → suggestion + "Use this"; a random non-cosmetic photo → "not sure"; a tiny/blurry photo → quality message.

## Next
✅ After Stage 7 + 8 + 10 checks pass → **Stage 11 — Face analysis** (Quality Gate + MediaPipe + OpenCV.js, age range + skin type from profile, AI disclaimer).
Stage 15 note: in the mac build, exclude non-mac onnxruntime binaries (`bin/napi-v6/{win32,linux}`) to save ~200 MB.

## Roadmap overview
| Stage | Topic | Est. |
|---|---|---|
| 2 | Electron setup | 1 day |
| 3 | SQLite + migrations | 1–2 days |
| 4 | UI base (MUI + SCSS, layout, i18n, dark mode) | 1–2 days |
| 5 | Onboarding questionnaire (`skin_profile`) | 1 day |
| 6 | My Shelf CRUD + expiry badges | 2 days |
| 7 | Label scan (Gemini vision + zod + AiDisclaimer) | 2–3 days |
| 8 | Routine + reminders (node-cron) | 2 days |
| ✅ | **MVP** | ~2 weeks |
| 9 | ML model (Colab → ONNX) | 5 days |
| 10 | Product classifier in app | 2 days |
| 11 | Face analysis (Quality Gate + MediaPipe + OpenCV) | 4–5 days |
| 12 | Skin diary + progress chart | 2 days |
| 13 | Semantic search + RAG chatbot | 4 days |
| 14 | Compatibility check + AI Lab | 2 days |
| 15 | Tests, build (.dmg), README, git init | 3 days |
