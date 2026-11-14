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

- [ ] Stage 11 check: `yarn install` (adds @mediapipe/tasks-vision, @techstark/opencv-js) → `yarn dev` → Face scan: (1) clear selfie in daylight → results + region circles on forehead/cheeks/nose/chin/under-eyes; (2) blurry / dark / turned head / two people → quality message; (3) camera → macOS asks permission once → capture works; (4) Save → appears in History; restart → still there. Send screenshots so thresholds can be calibrated.
- [ ] Calibrate face metric ranges (`main/ai/faceMetrics.ts` → `scale(...)` limits, `BLUR_MIN`, `SIDE_DIFF_MAX`) on 5–10 real photos in different light.

- [ ] Stage 12 check: `yarn dev` → Kundalik: with ≥ 2 saved face scans the 6 charts show (hover a dot → tooltip), Jadval toggle; "Yangi yozuv" → feeling + tags + note → Save; edit and delete work; restart → entries kept.
- [ ] Calibration data: in `yarn dev`, after each face scan copy the `[face] …` line from the terminal (5–6 scans: daylight, evening lamp, after washing, oily midday, camera) and send it.

- [x] Stage 13 check (done 2026-11-10: semantic answer with citations, unrelated question → not found without a Gemini call, offline → FTS5 passages): `yarn install` (adds sqlite-vec) → `yarn dev` → terminal shows `[db] migratsiya qo'llandi: 004_kb_search` and `[kb] bilim bazasi yangilandi: 26 ta bo'lak` (no `[kb] sqlite-vec yuklanmadi`). "GlowLab'dan so'rang": (1) with the key: tick consent → ask the 3 examples in Uzbek → answers with [1]/[2] + sources (click opens the browser); first question is slower (26 chunks embedded once); (2) "Fransiyaning poytaxti qaysi?" → "not found"; (3) Wi-Fi off → offline card with passages; (4) send the `[ask] distances …` lines from the terminal.

- [x] Stage 14 check + commit (23d541f).
- [x] Stage 15 done 2026-11-14: automated checks + build, and Alisher manually checked the installed .dmg (label scan with key, photo suggestion, camera face scan) — all OK.
- [ ] ~~Stage 15 on Mac~~ (superseded): `yarn install` → `yarn typecheck` → `yarn lint` → `yarn test` → `yarn test:db` → `yarn test:e2e` → `yarn build:mac` → open the .dmg, install, smoke test (onboarding, add product, AI Lab, Ask offline) → commit → merge develop → master.

- [ ] Local embeddings check (2026-11-11): `yarn install` → `yarn fetch:models` (279 MB) → `yarn dev` → Ask in uz / ko / en with and without the key; nonsense ("zzzz qqqq") → no matches; terminal `[ask] margin …` lines look sane; AI Lab shows `intfloat/multilingual-e5-base`. Optional: `GEMINI_API_KEY=… node scripts/eval-embeddings.mjs --gemini --verbose` for the Gemini baseline. `yarn build:mac` → the model is inside the .app (`Contents/Resources/app.asar.unpacked/resources/models/embedding/`). Then commit: `feat(rag): on-device multilingual e5 embeddings`.
- [ ] Gemini 504 fallback check: `yarn dev` → ask a question; if the terminal shows `[gemini] …: status=504 → gemini-3.5-flash-lite bilan qayta urinilmoqda…`, an answer should still arrive. Commit: `fix(gemini): retry 504 with flash-lite and a shorter timeout`.
- [ ] Multilingual titles check: `yarn dev` → terminal shows `[db] migratsiya qo'llandi: 005_kb_titles` and `[kb] 26 ta bo'lak, 78 ta vektor saqlandi` → ask "자외선 차단제는 얼마나 자주 발라야 하나요?" → first passage "Reapplying sunscreen…"; "zzzz qqqq" → not found.

## Next
✅ All 15 stages coded. After the Mac run: optional serum dataset cleanup + retrain, face metric calibration, notarisation if the app is shared.

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
