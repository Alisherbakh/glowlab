---
name: sqlite-feature
description: Use when adding a new SQLite table or a DB-backed feature to GlowLab — migration, model, service, IPC handler, preload API, and types.
---

# SQLite Feature

Add a DB-backed feature through all layers, in this order.

## 1. Plan (show, wait for permission)
- Table name, columns, types, constraints, foreign keys, indexes
- IPC channels (`domain:action`) and what each returns

## 2. Migration — `src/main/db/migrations/00X_<name>.sql`
- Next number after the latest migration. Never edit an old, applied migration — add a new one.
- Use `IF NOT EXISTS`, `NOT NULL`, `DEFAULT`, `REFERENCES ... ON DELETE CASCADE` where it fits.
- Dates as ISO text (`datetime('now')`).
- The migrator bumps `PRAGMA user_version` after each file, inside a transaction.

## 3. Model — `src/main/models/<name>.model.ts`
- Only SQL. Prepared statements with parameters (`db.prepare(sql).run/get/all(params)`).
- Never build SQL with string concatenation from user input.
- Export typed functions: `findAll`, `findById`, `create`, `update`, `remove`.

## 4. Service — `src/main/services/<name>.service.ts`
- Business logic and validation (zod). Example: compute `expires_at` from `opened_at + pao_months`.
- Multi-step writes inside `db.transaction(...)`.

## 5. IPC — `src/main/ipc/<name>.ipc.ts`
- `ipcMain.handle('<domain>:<action>', ...)` → call the service.
- Validate input. Return plain objects. Catch errors and return a clear message.
- Register in the IPC index.

## 6. Preload — `src/preload/index.ts` (+ `index.d.ts`)
- Expose `window.api.<domain>.<action>()` via `ipcRenderer.invoke`. Add types.

## 7. Docs
- Update `ai-docs/backend.md` (table status + IPC channels).

## Checklist
- [ ] `PRAGMA foreign_keys = ON` respected
- [ ] Prepared statements only
- [ ] Types shared between main and renderer
- [ ] Uzbek comments on important lines
