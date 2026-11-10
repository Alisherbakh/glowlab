# Backend (main process)

## Folder structure
```
src/main/
├── index.ts      # window creation, app lifecycle
├── db/           # connection.ts, migrate.ts, migrations/*.sql
├── models/       # SQL queries per table (repository)
├── services/     # business logic
├── ipc/          # IPC handlers (like Express routes)
├── ai/           # gemini.ts, classifier.ts (ONNX), embeddings.ts, rag.ts
└── jobs/         # expiryReminder.ts (node-cron)
```
Flow: `renderer → preload (window.api) → ipc → service → model → SQLite`

## Database (SQLite, planned)
DB: `userData/glowlab.db` · Photos: `userData/photos/` · `PRAGMA foreign_keys = ON` · migrations via `PRAGMA user_version`.

| Table | Columns |
|---|---|
| `skin_profile` | id, age_range, skin_type, concerns (JSON), updated_at |
| `products` | id, name, brand, category, photo_path, opened_at, pao_months, expires_at, created_at |
| `ingredients` | id, name (UNIQUE), risk_level, note |
| `product_ingredients` | product_id, ingredient_id (PK both, ON DELETE CASCADE) |
| `label_analyses` | id, product_id, raw_text, result_json, created_at |
| `predictions` | id, image_path, top3_json, confidence, user_correction, created_at |
| `face_scans` | id, photo_path, quality_score, oiliness, redness, spots, dark_circles, created_at |
| `routines` | id, slot ('AM'/'PM') |
| `routine_steps` | id, routine_id, product_id, step_order |
| `diary_entries` | id, face_scan_id, note, created_at |
| `kb_chunks` + `kb_fts` + `vec_kb` + `kb_meta` | RAG knowledge base: text (slug, title, source, url), FTS5 index, vectors (sqlite-vec, created in code), seed hash + embedding model (Stage 13) |
| `vec_products` | product vectors for semantic search |
| `reminders_log` | id, product_id, sent_at |
| `settings` | key (PK), value |

Reminders job: `jobs/expiryReminder.ts` (startup + every 6 h, uses `reminders_log`).

Status: created in `001_init.sql` (Stage 3): skin_profile, products, ingredients, product_ingredients, label_analyses, predictions, face_scans, routines (AM/PM seeded), routine_steps, diary_entries, kb_chunks, reminders_log, settings. Vector tables (`vec_kb`, `vec_products`) come later with sqlite-vec.

## IPC channels (planned)
| Channel | Purpose |
|---|---|
| `profile:get` ✅, `profile:save` ✅ | Skin profile (zod-validated, single row id=1) |
| `products:list/create/update/delete` ✅ | Shelf CRUD (zod-validated; expires_at computed in main) |
| `ai:analyzeLabel` ✅ | Label photo → ingredients + risks (Gemini, zod-validated) |
| `ai:latestAnalysis` ✅ | Latest saved analysis of a product |
| `ai:keyStatus` ✅, `ai:setKey` ✅ | API key status / save (safeStorage) — key never returned |
| `ai:classifyProduct` ✅ | Photo → product type (ONNX) |
| `ai:checkCompatibility` ✅ | Rule-based AM/PM routine compatibility (sources from kb.json) |
| `ai:labInfo` ✅ | AI Lab data: metrics.json, Grad-CAM images, RAG status |
| `face:saveScan`, `face:history` | Face scan results |
| `routines:get` ✅, `routines:save` ✅ | AM/PM routine (whole slot replaced in one transaction) |
| `diary:list`, `diary:create` | Diary |
| `ask:question` ✅, `ask:status` ✅ | RAG chatbot over the knowledge base (semantic search via sqlite-vec, FTS5 fallback) |
| `settings:get` ✅, `settings:set` ✅ | Settings (zod-validated: language uz/ko/en, theme light/dark/system) |
| `app:ping` ✅ | IPC test |
| `app:dbInfo` ✅ | DB version, path, tables |

## Security
- Gemini API key only in main (dev: `.env` → `GEMINI_API_KEY`; prod: Electron `safeStorage`).
- Prepared statements only.
