# Page structure

A zoom-out review of what this app is, what each page is for, and how the route map should evolve.

## What this is

Film React is a personal film diary that doubles as a public showcase. It carries four pillars:

1. **Showcase reviews** — permalinkable, attractive per-film pages that read as published reviews.
2. **Public film diary** — recent watches with rating, tags, and notes, browsable and filterable.
3. **ML-driven recommendations** — guests can sample the engine; the owner tunes it.
4. **Private log + workshop** — the owner uses signed-in pages to log films, enrich metadata, import history, and configure the recommender.

Public pages are the showcase. Private pages are the workshop. The route map should make that split obvious and avoid duplicating concerns across pages.

## Current state

### Public routes (7)

| Route | Component | Status |
|---|---|---|
| `/` | `PublicPreviewPage` | Mislabeled "landing" — this is actually the diary grid. |
| `/preview-public` | `PublicPreviewPage` | **Duplicate** of `/`. |
| `/taste` | `PublicTastePage` | Strong: 6 curated sections, interactive recs. |
| `/insights` | `InsightsPage` | **Sparse** — 5 flat number cards + 1 histogram. |
| `/v/:userId` | `PublicProfilePage` | **Redundant** in single-owner model. |
| `/film/:filmId` | `FilmDetailPage` | **Broken for guests** — uses `useFilms()` which only loads the signed-in owner's films. |
| `/login`, `*` | — | Auth & 404. |

### Private routes (9)

| Route | Component | Status |
|---|---|---|
| `/home` | `HomePage` | **Placeholder.** |
| `/log` | `LogPage` | The daily-driver. Owns its own enrichment queue. |
| `/insights` | `InsightsPage` | Same component as public; auth unlocks more data. |
| `/recommendations` | `RecommendationsPage` | Monolith: build + config + ML export. |
| `/settings` | `SettingsPage` | Mostly links out + does TMDb backfill. |
| `/settings/taste-diagnostics` | `TasteDiagnosticsPage` | Feature audit on same data. |
| `/settings/tag-metadata` | `TagMetadataPage` | Editable tag table. |
| `/settings/recommender-config` | `RecommenderConfigPage` | **Duplicate** of config panel inside `/recommendations`. |
| `/admin/import/letterboxd` | `LetterboxdImportPage` | 1,248-line CSV/TMDb import. |

### Redundancy hotspots

- The public landing/profile concept exists three ways: `/`, `/preview-public`, `/v/:userId`.
- ML config is tunable in two places: the inline panel in `/recommendations` and `/settings/recommender-config`.
- TMDb enrichment exists in three places: the `/log` queue, the `/admin/import/letterboxd` review tab, and the `/settings` backfill button.
- Settings, diagnostics, tag metadata, and recommender config are four pages reading the same underlying tag and feature data from different angles.

## Proposed structure

### Public — 6 routes

| Route | Purpose | Source |
|---|---|---|
| `/` **Landing** | Hero, latest review, mini-stats row, top picks rails, recs teaser, CTAs to `/diary`, `/taste`, `/insights`. | new component |
| `/diary` | Today's `/` content — full filterable diary grid. | `PublicPreviewPage`, renamed |
| `/taste` | Keep as-is. Already the strongest public page. | `PublicTastePage` |
| `/insights` | Redesigned with real visual content (see below). | `InsightsPage`, redesigned |
| `/film/:filmId` | Public review page — fetched by film id from public entries, not via `useFilms()`. | `FilmDetailPage`, data layer rewritten |
| `/recommendations` | Public preview: seed picker → top neighbors with explanations. Owner sees extra controls when signed in on the same route. | extracted from `RecommendationsPage` |

**Delete:** `/preview-public` (duplicate), `/v/:userId` (redundant in single-owner).

### Private — 4 routes

| Route | Purpose | Absorbs |
|---|---|---|
| `/log` | Entry CRUD plus the single canonical TMDb enrichment queue. | `LogPage` + `SettingsPage` backfill + Letterboxd TMDb-review tab |
| `/recommendations` | Same path as public; signed-in unlocks build, ML dataset export, full config panel. | `RecommendationsPage` build/export |
| `/settings` | One tabbed page: General · Tags · ML config · Diagnostics · Import. | `SettingsPage` + `TagMetadataPage` + `TasteDiagnosticsPage` + `RecommenderConfigPage` + `LetterboxdImportPage` CSV step |
| (auth + 404 shared with public) | | |

**Delete:** `/home`, `/settings/tag-metadata`, `/settings/taste-diagnostics`, `/settings/recommender-config`, `/admin/import/letterboxd` (all become tabs in `/settings`).

Net: **16 → 10 routes**, eliminating duplicates and folding the settings constellation into one tabbed surface.

## Public-page critique

### `/` landing (new)

Today the root is the diary, with no orientation for a first-time guest. Replace with a true landing:

- Short intro block ("Films I've watched, with notes — and an experimental recommender")
- Featured "latest review" card (poster + opening line + CTA to full review page)
- Mini-stats row (films logged, this year, average rating, current streak)
- Three horizontal rails: *Recent watches*, *Personal canon top 5*, *Try a recommendation* (seed picker)
- CTAs to `/diary`, `/taste`, `/insights`

### `/diary`

Already rich and functional — poster grid, 6-column filter, ratings/tags/notes per card. Keep.

Optional later additions: pinned "currently watching / next up" strip, view toggle (grid ↔ timeline), sort options beyond recent-first.

### `/taste`

The standout page — 6 curated sections with explanations and an interactive "If You Like This." Keep as-is.

Optional: a 7th section, *"What I'm into right now,"* for the last 30 days' high-raters.

### `/insights` — biggest fix needed

Today: 5 flat cards plus one histogram. Reads like an admin dashboard.

Redesign with:

- Hero stat row (films, average rating, this year's pace) in big-type editorial style
- Calendar heatmap of watch dates (GitHub-style)
- Rating histogram, made the centerpiece chart
- Watch-pattern bars: by month + by day-of-week
- Decade donut + runtime histogram (TMDb-driven)
- Tag fingerprint (radar or grouped bars) — taste profile in one glance
- Auto-generated leaderboards: top of year, top directors, top decades

### `/film/:filmId` — fix to be genuinely public

Today the page requires the auth-only `useFilms()` hook, so guests see "Film not found." Fix the data source to fetch by film id from public-flagged entries. Layout:

- Hero: poster, title, year, rating in big numerals
- Review body (full notes, not the truncated card preview)
- Tags as chips
- Watch log (all dates if rewatched, with each watch's notes)
- TMDb sidebar (director, runtime, genre, original language)
- "Similar in my diary" rail using existing taste-neighbor logic from `/taste`
- Permalink + OpenGraph metadata so reviews are shareable

### `/recommendations` — new public preview

Single-purpose page: pick a seed film, see top 8 neighbors with one-line explanations ("shares your *slow burn* + *european* tags"). Owner-only controls (full builder, dataset export, weight tuning) appear when signed in on the same route.

## Files most relevant to a follow-up implementation

- `src/App.tsx` (or wherever React Router routes are declared) — route table edits
- `src/pages/PublicPreviewPage.tsx` — split into a new `LandingPage.tsx` and rename the remainder to `DiaryPage.tsx`
- `src/pages/InsightsPage.tsx` — major redesign; likely add a charts dep (recharts/visx) or keep dependency-free with hand-rolled SVG
- `src/pages/FilmDetailPage.tsx` — replace `useFilms()` with a public-by-id fetch
- `src/pages/RecommendationsPage.tsx` — split into public preview component + signed-in-only controls
- `src/pages/SettingsPage.tsx`, `TagMetadataPage.tsx`, `TasteDiagnosticsPage.tsx`, `RecommenderConfigPage.tsx`, `LetterboxdImportPage.tsx` — fold into one tabbed Settings page (each becomes a tab panel)
- `src/components/auth/ProtectedRoute.tsx` — unchanged, still gates the private surfaces
- `README.md` — keep the product-intent preamble in sync with this doc

## Implementation slices

Each slice is independently shippable and worth its own PR.

1. **Landing/diary split.** Create `LandingPage`, rename current `PublicPreviewPage` to `DiaryPage` at `/diary`, point `/` at the new landing, redirect `/preview-public` → `/`.
2. **Public film page.** Rewrite `FilmDetailPage` data layer to fetch by id from public entries; add OpenGraph tags.
3. **Insights redesign.** Replace flat cards with the chart set above.
4. **Public `/recommendations` preview.** Extract seed-picker + neighbor list from `RecommendationsPage` into a public component; gate owner controls behind auth.
5. **Settings consolidation.** Merge the four settings-flavor pages and Letterboxd import into one tabbed `/settings`.
6. **Cleanup.** Delete `/home`, `/v/:userId`, and the now-empty admin/settings sub-routes.

## Verification

- Smoke routes signed-out: `/`, `/diary`, `/taste`, `/insights`, `/film/:id`, `/recommendations` all render with content; `/preview-public` and `/v/:id` 301 or 404 cleanly.
- Smoke routes signed-in: `/log`, `/settings` (each tab loads), `/recommendations` shows owner controls.
- `/film/:id` works for guests using a known public film id.
- Insights renders all charts with the current dataset and degrades gracefully if a category is empty.
- `npm run build` passes; check Lighthouse on `/` and `/film/:id` for guest-facing perf.
