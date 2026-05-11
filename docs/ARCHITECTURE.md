# Architecture

Film React is a Vite-powered React and TypeScript app for a personal film diary. It serves two audiences from the same codebase:

- **Public visitors** browse the landing page, shared diary entries, film details, taste summaries, insights, and a limited recommendations preview.
- **The owner** signs in with Supabase Auth to log films, maintain metadata, import Letterboxd history, tune recommendations, and export ML datasets.

## Runtime Stack

- **Frontend:** React, React Router, TypeScript, and Vite.
- **Auth and data:** Supabase Auth plus Supabase Postgres tables accessed from browser-safe client code.
- **Server-side API boundary:** Netlify Functions proxy TMDb requests so the TMDb read token stays server-side.
- **Build and hosting:** Netlify builds with `npm run build` and serves the Vite `dist` output.

## Route Map

Routes are defined in `src/App.tsx` and rendered inside `src/components/AppShell.tsx`, except for auth pages.

### Public Routes

| Route | Component | Purpose |
| --- | --- | --- |
| `/` | `LandingPage` | Public landing page. |
| `/diary` | `DiaryPage` | Public film diary. |
| `/insights` | `InsightsPage` | Public/private insights view, depending on auth state. |
| `/recommendations` | `RecommendationsPage` | Guest recommendation preview plus owner controls when signed in. |
| `/taste` | `PublicTastePage` | Shared taste browser. |
| `/film/:filmId` | `FilmDetailPage` | Public film detail page backed by public film-entry data. |
| `/preview-public` | `Navigate` | Legacy redirect to `/`. |
| `/v/:userId` | `PublicProfilePage` | Legacy/public profile route retained for compatibility. |
| `/login` | `LoginPage` | Sign-in page. |
| `/sign-in` | `Navigate` | Legacy redirect to `/login`. |

### Protected Owner Routes

| Route | Component | Purpose |
| --- | --- | --- |
| `/home` | `HomePage` | Signed-in owner home/dashboard. |
| `/log` | `LogPage` | Film logging and editing. |
| `/settings` | `SettingsPage` | Diary maintenance tools and links to specialty settings pages. |
| `/settings/taste-diagnostics` | `TasteDiagnosticsPage` | Taste/tag diagnostics. |
| `/settings/tag-metadata` | `TagMetadataPage` | Tag notes and metadata editor. |
| `/settings/recommender-config` | `RecommenderConfigPage` | Recommender scoring configuration. |
| `/settings/watch-date-backlog` | `WatchDateBacklogPage` | Missing watch-date backlog tooling. |
| `/admin/import/letterboxd` | `LetterboxdImportPage` | Lazy-loaded Letterboxd import flow. |

## Data Flow

### Public Diary Data

Public-facing pages fetch shareable film entries through `fetchPublicFilmEntries()` in `src/services/publicFilmProfileService.ts`. Public data is mapped into the shared `FilmEntry` shape so pages and recommendation logic can reuse the same rendering and scoring utilities.

### Private Diary Data

Signed-in owner pages use `useFilms()` and `createFilmLogService(user.id)` to read and write the owner diary. The app must use only the Supabase anon/public key in browser code; never put a service role key in Vite environment variables.

### TMDb Enrichment

TMDb search, movie details, keyword, discover, and candidate lookup requests go through Netlify Functions under `netlify/functions/`. Local TMDb testing should use `npm run dev:netlify` so these functions and `TMDB_READ_ACCESS_TOKEN` are available.

## Recommendation System

The recommendation core lives in `src/features/recommendations/`:

- `recommender.ts` builds explainable V1 recommendations from diary entries and TMDb candidate data.
- `recommenderConfig.ts` defines scoring weights and defaults.
- `recommenderConfigStorage.ts` persists owner-visible scoring configuration.

`/recommendations` is intentionally public. Guest mode uses public diary entries, defaults, and limited controls; owner mode uses private diary entries and exposes config and ML export tools.

## ML Dataset Export

The app can export a typed JSON dataset for offline experiments from the owner recommendation page. The export is documented in `docs/ml-dataset-export.md`, while modelling priorities are tracked in `docs/ml-improvement-roadmap.md` and summarized in `docs/ROADMAP.md`.

## Documentation Map

- `README.md`: setup, environment variables, and deployment checks.
- `AGENTS.md`: agent instructions and required doc-maintenance habits.
- `docs/ARCHITECTURE.md`: current system shape and route/data flow.
- `docs/ROADMAP.md`: active implementation and modelling priorities.
- `docs/DECISIONS.md`: architectural decision log.
- `docs/HANDOFF.md`: current status, verification, and next-step context.
- `docs/OPEN_QUESTIONS.md`: unresolved product/technical questions.
- `docs/page-structure.md`: historical page-structure plan retained as supporting detail.
- `docs/ml-*.md`: deeper ML export and improvement notes.
