# GlowLab — Project Instructions

GlowLab is an AI-powered personal skincare assistant **desktop app** (offline, private).
Users manage their cosmetics, scan ingredient labels, check facial skin condition with the
camera, build AM/PM routines, and get expiry reminders. All data stays on the user's computer.

Owner: Alisher (beginner–intermediate, Full-Stack & AI Engineer student). Portfolio project.

---

## 1. Always start here (every session)

1. Read `ai-docs/next_steps.md` → know the current task.
2. Read `ai-docs/completed_tasks.md` → know what is already done.
3. Read `ai-docs/backend.md` / `ai-docs/frontend.md` when the task touches that side.
4. Make a **plan** first and show it. **Wait for Alisher's permission** before doing anything new.
5. Work in **small steps**. After each step, check that it works, then continue.
6. When a part (phase) is finished: notify Alisher and **ask permission before moving to the next part**.

## 2. Communication

- Reply to Alisher in **Uzbek** (technical terms may stay in English).
- Be concise. Use tables, diagrams, and "Qisqasi:" (in short) summaries.
- Only state real, verified facts. If unsure, say so and check docs — never guess.

## 3. Tech stack

| Area | Choice |
|---|---|
| Desktop | Electron + electron-vite |
| UI | React + TypeScript + MUI + SCSS |
| Database | SQLite (better-sqlite3) + sqlite-vec (vector search) |
| Computer vision | opencv.js + MediaPipe Face Mesh (renderer) |
| Own ML model | PyTorch (Colab) → ONNX → onnxruntime-node |
| LLM | Google Gemini (vision + text) |
| Validation | zod |
| Reminders | node-cron + Electron Notification |
| Tests / Build | Vitest / electron-builder |
| Package manager | **yarn** (never npm) |

## 4. Architecture (one project, two sides)

```
src/main/       → "backend" (Node): db/, models/, services/, ipc/, ai/, jobs/
src/preload/    → contextBridge: the only bridge between main and renderer
src/renderer/   → "frontend" (React): pages/, components/, hooks/, cv/, i18n/, styles/
src/shared/      → types shared by main + preload + renderer
ml/             → Python notebooks (Colab): dataset, train, evaluate, export
resources/models/ → product_classifier.onnx
```

- Layered like autore: `ipc (like routes) → services → models (SQL)`.
- IPC channel names: `domain:action` (e.g. `products:list`, `ai:analyzeLabel`).
- Renderer never touches Node, the DB, or API keys directly — only via `window.api` (preload).
- `contextIsolation: true`, `nodeIntegration: false`.

## 5. Code style

- TypeScript everywhere (strict). No `any` unless commented why.
- Add short **Uzbek comments** on important lines. Keep any existing comments.
- Point out bugs and risks in the code you touch.
- Small files, clear names. One responsibility per module.

## 6. Database rules

- DB file: `app.getPath('userData')/glowlab.db`. Photos: `userData/photos/` (store only the path in DB).
- Migrations: `src/main/db/migrations/00X_name.sql`, tracked with `PRAGMA user_version`.
- Always use prepared statements with parameters (never string-concatenate SQL).
- `PRAGMA foreign_keys = ON`.

## 7. Responsible AI rules (required for every AI feature)

- Show `<AiDisclaimer />`: "AI can make mistakes; not medical advice."
- **Quality Gate** before any image analysis (blur, brightness, face count, size, resolution).
  If it fails → do NOT analyze; ask the user to upload a better photo or retake with the camera.
- Low confidence (< threshold) → show "Not sure", never a confident wrong answer.
- Validate all LLM JSON output with zod.
- Photos never leave the computer. Gemini API key stays in the main process only.
- Never present results as a medical diagnosis. Never estimate age from the face.

## 8. Skills (`.claude/skills/`)

| Skill | Use when |
|---|---|
| `phase-runner` | Starting/doing any roadmap task |
| `sqlite-feature` | Adding a table or DB-backed feature |
| `ui-ux` | Building or changing any screen/component |
| `responsible-ai-check` | Building or reviewing any AI feature |
| `opencv-feature` | Face analysis / image processing code |
| `ml-pipeline` | Colab notebooks: dataset → train → evaluate → ONNX |
| `testing` | Writing or running Vitest tests (SQLite ABI note, Gemini mocks) |
| `release-check` | Before building a release |

## 9. Important environment notes

- Alisher's machine: macOS (Apple Silicon, arm64).
- Run `yarn`, `electron`, `electron-rebuild`, and builds **in Alisher's Mac terminal** (native modules
  must be built for macOS arm64). Claude may create/edit text files directly.
- Git: Alisher will run `git init` at the end of the project.

## 10. After finishing a task

- Update `ai-docs/completed_tasks.md` (date + phase + what was done).
- Update `ai-docs/next_steps.md`.
- If a new decision was made → tell Alisher so it can be added to `Desktop/glowlab-career/decisions.md`.
