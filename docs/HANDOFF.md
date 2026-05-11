# Handoff

## Current Status

- The canonical documentation layout is now present:
  - `AGENTS.md`
  - `docs/ARCHITECTURE.md`
  - `docs/ROADMAP.md`
  - `docs/DECISIONS.md`
  - `docs/HANDOFF.md`
  - `docs/OPEN_QUESTIONS.md`
- Historical supporting docs remain available:
  - `docs/page-structure.md`
  - `docs/ml-dataset-export.md`
  - `docs/ml-improvement-roadmap.md`
- The app structure described in `docs/ARCHITECTURE.md` reflects the current route table in `src/App.tsx` as of this update.

## Last Meaningful Change

2026-05-11: Created the canonical root/docs handoff structure, promoted lowercase `agents.md` to `AGENTS.md`, added explicit doc-maintenance instructions for future agents, and summarized architecture, roadmap, decisions, and unresolved questions.

## Next Suggested Work

1. Continue the settings consolidation described in `docs/ROADMAP.md`.
2. When settings routes change, update `docs/ARCHITECTURE.md` and record any structural decisions in `docs/DECISIONS.md`.
3. If implementation work changes setup or deployment assumptions, update `README.md`.

## Verification Notes

Latest documentation-layout update verification:

- `npm run build` passed.
- `npm run lint` currently fails on pre-existing React Fast Refresh and React Hooks rule violations in `src/auth/AuthContext.tsx`, `src/auth/AuthProvider.tsx`, `src/hooks/useFilms.ts`, `src/pages/LogPage.tsx`, and `src/pages/RecommendationsPage.tsx`.

For documentation-only changes, run at least:

```bash
npm run build
```

If route behavior changes, also smoke-test signed-out and signed-in navigation for the affected routes.
