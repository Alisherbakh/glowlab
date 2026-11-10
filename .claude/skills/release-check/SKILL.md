---
name: release-check
description: Use before building or publishing a GlowLab release — tests, native module rebuild, build, app smoke test, README, and git readiness.
---

# Release Check

Go through each item, report ✅ / ❌, fix ❌ before building.

1. `yarn typecheck` (or `tsc --noEmit`) passes.
2. `yarn test` (Vitest) passes.
3. Native modules match Electron (`better-sqlite3` rebuilt with `@electron/rebuild` if Electron changed).
4. No secrets in the repo: `.env` in `.gitignore`; no API keys in code or logs.
5. `resources/models/` contains the ONNX model + `classes.json` and electron-builder includes them.
6. Build on Mac: `yarn build:mac` → `.dmg` created.
7. Smoke test the installed app: fresh start → onboarding → add product → label scan → face scan
   (good + bad photo) → routine → reminder → settings "delete all data".
8. README: overview, features, screenshots/GIF, architecture diagram, tech stack, how to run,
   AI limitations + disclaimer, privacy note.
9. `ai-docs/completed_tasks.md` and `next_steps.md` up to date.
10. Git: `git init` (if not yet), `.gitignore` checked, first commit, push to GitHub.
