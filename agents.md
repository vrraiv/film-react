# Agents

## Project Context

Film React is a personal film diary built with React, Vite, TypeScript, Supabase Auth, and Supabase Postgres. It has a public showcase side for guests and private signed-in tools for the owner.

Read these first before changing route or page structure:

- `README.md`
- `docs/page-structure.md`

## Page-Structure Status

The route-map implementation slices in `docs/page-structure.md` are being handled incrementally.

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

## Implementation Notes For #4: Public Recommendations Preview

Goal: `/recommendations` is a public route where guests can choose a public diary seed film and see a small explainable recommendation set, while signed-in owner controls remain available on the same URL.

Implemented state:

- `src/App.tsx` renders `/recommendations` without `ProtectedRoute`, so guests can access it.
- `src/pages/RecommendationsPage.tsx` switches between public entries and signed-in private entries.
- Guest mode hides type/runtime filters, rewatch inclusion, scoring config, and ML dataset export.
- Owner mode keeps private `useFilms()` data plus the existing config and export tools.
- Public pages already load shared diary entries through `fetchPublicFilmEntries()` from `src/services/publicFilmProfileService.ts`.
- The recommender core in `src/features/recommendations/recommender.ts` can score any `FilmEntry[]`, so it can operate on public entries as long as those entries include usable TMDb metadata.

Implementation steps:

1. Split the page into public and owner sections.
   - Keep `RecommendationsPage` as the route component.
   - Add `useAuth()` in `RecommendationsPage`.
   - Load public entries with `fetchPublicFilmEntries()` when signed out.
   - Load private entries with `useFilms(undefined, { enabled: Boolean(user) })` when signed in.
   - Treat the selected film list as `activeFilms`.

2. Make `/recommendations` public in the route table.
   - In `src/App.tsx`, remove `ProtectedRoute` from the `/recommendations` route.
   - Keep owner-only tools gated inside the page instead of at the route level.
   - Add `/recommendations` to public navigation in `src/components/AppShell.tsx`.

3. Extract reusable recommendation UI.
   - Keep or move `RecommendationCard`, `ScorePill`, and `ExplanationBlock` so both public preview and owner mode can render the same result cards.
   - Public cards should show title, poster, year, runtime/director, recommendation label, top score pills, overview, and the strongest "why it fits" reasons.
   - Owner mode can continue showing the deeper cautions, override effects, and ML-oriented details.

4. Adjust public controls.
   - Public mode should focus on a seed picker and a single generate action.
   - Seed options should come from public films with `metadata.tmdb?.id` or `tmdbMetadata?.id` and a rating.
   - Generate at most 8 public recommendations using `buildPersonalRecommendations(activeFilms, { seedTmdbId, maxSeeds: 1, maxEnrichedCandidates: 8, config })`.
   - Hide `includeWatched`, type/runtime filters, scoring config, and ML export when signed out.

5. Keep owner controls behind auth.
   - Show the current full builder controls only when `user` exists.
   - Keep `RecommenderConfigPanel` and ML dataset export signed-in only.
   - Keep owner mode using private `useFilms()` data, not public entries.

6. Handle loading and errors clearly.
   - Signed-out loading/error states should mention public diary data.
   - Signed-in loading/error states should continue to mention private diary data.
   - Empty public state should say that recommendations need public films with TMDb metadata.
   - Disable generation when there are no usable seed films.

7. Verification.
   - Signed out: `/recommendations` renders without redirecting to `/login`.
   - Signed out: a public seed can generate up to 8 recommendation cards.
   - Signed out: config and ML export controls are not present.
   - Signed in: `/recommendations` uses private films and still shows config/export controls.
   - `npm run build` passes.

Watchouts:

- `fetchPublicFilmEntries()` maps row metadata to `tmdbMetadata` and sets `metadata` to defaults, so seed-id lookup must check both `film.metadata.tmdb` and `film.tmdbMetadata`.
- `buildPersonalRecommendations()` calls TMDb-backed services, so local testing of generation may require Netlify Dev and `TMDB_READ_ACCESS_TOKEN`.
- Do not move recommender config into public localStorage behavior unless the owner controls are visible; guests should get default scoring.
