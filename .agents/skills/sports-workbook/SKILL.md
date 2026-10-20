---
name: sports-workbook
description: Implement or debug XLSX strategy and training-log imports and generated Sports notes in this repository. Use for workbook parsing, schedule display, sync, and generated-note preservation.
---

# Sports workbook workflow

Read the repository's AGENTS.md and inspect current changes before editing.

## Locate the behavior

- `src/workbook/parse.ts` selects the configured strategy and tracking sheets; either role can be disabled. Keep unrelated sheets irrelevant to import.
- `src/workbook/daily-log.ts` parses the daily Date/Block/Plan format. Completion checks and individual results are separate from whole-session status.
- `src/workbook/sync.ts` imports data, preserves completed history, and refreshes generated notes.
- `src/notes/render.ts` renders strategy, complete training log, and weekly Markdown. The complete log includes dates outside the dashboard's selected week.
- `src/notes/store.ts` and `blocks.ts` protect generated sections and preserve commentary. Retain their conflict detection when changing note generation.
- `src/ui/dashboard.ts` presents weekly sessions and opens the complete log.

## Preserve the data contract

Sync reads the explicitly configured XLSX file without changing it. Treat template creation as a separate operation that never overwrites existing files. Keep desktop file access behind the existing platform guards.

Do not infer completed training or measurements from plan prose. Preserve explicit false, blank, and true completion values. Keep session IDs stable and preserve completed-session date and part/version protections.

## Verify relevant changes

Run `npm run build`, `npm test`, and `npm run lint` from the repository root. Add focused regression coverage when changing parser behavior, history preservation, or note conflict handling. Existing tests use esbuild to load TypeScript modules in Node.

For UI changes, check in Obsidian when available: sync the selected sheets, open Training log, inspect dates outside the current week, and verify that commentary survives another sync. Distinguish manual checks actually performed from suggested checks.

Keep generated `main.js` available for local plugin loading, but do not commit it or local `data.json`.
