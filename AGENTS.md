# Agents

## Project Context

Film React is a personal film diary built with React, Vite, TypeScript, Supabase Auth, Supabase Postgres, and Netlify Functions. It has a public showcase side for guests and private signed-in tools for the owner.

Read these first before changing app behavior, routes, architecture, or long-running work:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/HANDOFF.md`
- `docs/OPEN_QUESTIONS.md`

## Documentation Maintenance

- After meaningful implementation work, update `docs/HANDOFF.md`.
- After architectural choices, update `docs/DECISIONS.md`.
- If the current task changes the structure of the app, update `docs/ARCHITECTURE.md`.

## Page-Structure Status

The route-map implementation slices that started in `docs/page-structure.md` are being tracked in the canonical docs listed above.

Completed:

1. Landing/diary split.
   - `/` now renders `LandingPage`.
   - `/diary` renders `DiaryPage`.
   - `/preview-public` redirects to `/`.
2. Public film page.
   - `FilmDetailPage` uses public film-entry fetching rather than the signed-in `useFilms()` data path.
3. Insights redesign.
   - `InsightsPage` has been rebuilt around richer public/private insights instead of the earlier flat-card version.
4. Public `/recommendations` preview.
   - `/recommendations` is now a public route.
   - Signed-out visitors use public film entries and get a limited recommendation preview.
   - Signed-in owner controls remain gated inside `RecommendationsPage`.

Next target:

5. Settings consolidation.

## Implementation Notes For Public Recommendations Preview

Implemented state:

- `src/App.tsx` renders `/recommendations` without `ProtectedRoute`, so guests can access it.
- `src/pages/RecommendationsPage.tsx` switches between public entries and signed-in private entries.
- Guest mode hides type/runtime filters, rewatch inclusion, scoring config, and ML dataset export.
- Owner mode keeps private `useFilms()` data plus the existing config and export tools.
- Public pages already load shared diary entries through `fetchPublicFilmEntries()` from `src/services/publicFilmProfileService.ts`.
- The recommender core in `src/features/recommendations/recommender.ts` can score any `FilmEntry[]`, so it can operate on public entries as long as those entries include usable TMDb metadata.

Watchouts:

- `fetchPublicFilmEntries()` maps row metadata to `tmdbMetadata` and sets `metadata` to defaults, so seed-id lookup must check both `film.metadata.tmdb` and `film.tmdbMetadata`.
- `buildPersonalRecommendations()` calls TMDb-backed services, so local testing of generation may require Netlify Dev and `TMDB_READ_ACCESS_TOKEN`.
- Do not move recommender config into public localStorage behavior unless the owner controls are visible; guests should get default scoring.
