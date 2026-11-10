---
name: phase-runner
description: Use when starting or continuing any GlowLab roadmap stage or task. Reads ai-docs, plans, asks permission, works in small verified steps, and updates the docs.
---

# Phase Runner

Run one GlowLab roadmap stage (or one task) safely, step by step.

## Steps

1. **Read context**
   - `CLAUDE.md`
   - `ai-docs/next_steps.md` (current task) and `ai-docs/completed_tasks.md`
   - `ai-docs/backend.md` and/or `ai-docs/frontend.md` if relevant
2. **Plan** — show a short numbered plan:
   - goal of the stage, files to create/change, commands Alisher must run, "done when" check
   - any risk or new decision
3. **Wait for permission.** Do nothing new until Alisher agrees.
4. **Execute in small steps.** For each step:
   - do one small thing
   - verify it (run/read/check), or give Alisher the exact Mac-terminal command and expected output
   - briefly notify Alisher: "✅ step N done → next: step N+1"
5. **On error:** stop, explain the cause in simple Uzbek, propose a fix, don't touch unrelated code.
6. **Finish the stage:**
   - update `ai-docs/completed_tasks.md` (date, stage, what was done)
   - update `ai-docs/next_steps.md` (next stage + its steps)
   - update `ai-docs/backend.md` / `frontend.md` if tables, IPC channels, or screens changed
   - list any new decision so Alisher can add it to `Desktop/glowlab-career/decisions.md`
   - notify Alisher and **ask permission before the next stage**

## Rules
- Native/install/build commands (`yarn`, `electron`, `@electron/rebuild`, builds) run in Alisher's Mac terminal.
- Use real, verified facts only; check docs when unsure.
- Reply in Uzbek. Keep it concise.
