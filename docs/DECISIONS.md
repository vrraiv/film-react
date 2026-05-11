# Architectural Decisions

Record meaningful architectural choices here. New entries should include the date, decision, context, and consequences.

## 2026-05-11 — Adopt canonical project docs

**Decision:** Keep the root and docs directory organized around `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`, `docs/HANDOFF.md`, and `docs/OPEN_QUESTIONS.md`.

**Context:** Project knowledge was split across README, lowercase agent notes, page-structure planning, ML notes, and implementation handoff details. A predictable documentation layout makes it easier for future agents and maintainers to understand where to update context.

**Consequences:**

- Agents must read the canonical docs before structural or architectural changes.
- Meaningful implementation work should update `docs/HANDOFF.md`.
- Architectural choices should be recorded in this file.
- App-structure changes should update `docs/ARCHITECTURE.md`.

## 2026-05-11 — Keep `/recommendations` public with owner-only controls inside the page

**Decision:** `/recommendations` remains a public route rather than being wrapped in `ProtectedRoute`.

**Context:** Guests should be able to preview explainable recommendations from public diary data, while the owner still needs access to private data, scoring configuration, and ML dataset export from the same area.

**Consequences:**

- Auth checks belong inside `RecommendationsPage` for owner-only controls.
- Guest mode must use public entries and default scoring behavior.
- Owner mode can use private `useFilms()` data and persisted config.
- Recommender storage/config behavior should not leak owner settings into guest usage.

## 2026-05-11 — Keep TMDb credentials behind Netlify Functions

**Decision:** TMDb access continues to go through Netlify Functions instead of direct browser calls with private credentials.

**Context:** Vite exposes `VITE_*` environment variables to browser code. The TMDb read access token must stay server-side.

**Consequences:**

- Local TMDb testing should use `npm run dev:netlify`.
- `TMDB_READ_ACCESS_TOKEN` must not be prefixed with `VITE_`.
- Browser code should call the app's function-backed services rather than embedding TMDb secrets.
