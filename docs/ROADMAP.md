# Roadmap

This roadmap summarizes current product and technical priorities. Keep detailed implementation notes in `docs/HANDOFF.md` as work progresses.

## Recently Completed

1. **Landing/diary split**
   - `/` renders `LandingPage`.
   - `/diary` renders `DiaryPage`.
   - `/preview-public` redirects to `/`.
2. **Public film detail page**
   - `/film/:filmId` fetches public film-entry data rather than relying on signed-in diary state.
3. **Insights redesign**
   - `/insights` now presents richer public/private insights instead of the earlier flat-card version.
4. **Public recommendations preview**
   - `/recommendations` is available to signed-out visitors.
   - Guest controls are intentionally limited.
   - Signed-in owner configuration and export tools remain gated inside the page.

## Active Product Priority

### 1. Settings Consolidation

Goal: consolidate the remaining specialty settings/admin routes into a coherent `/settings` experience.

Candidate scope:

- Fold taste diagnostics, tag metadata, recommender config, watch-date backlog, and Letterboxd import into a tabbed or sectioned `/settings` page.
- Keep dangerous or long-running data maintenance actions clearly labelled and owner-only.
- Preserve deep links or add redirects for existing settings/admin URLs.
- Update `docs/ARCHITECTURE.md` if the route table changes.

Verification:

- Signed-in `/settings` exposes all maintenance workflows.
- Existing settings/admin URLs either still work or redirect clearly.
- Signed-out visitors cannot access owner tools.
- `npm run build` passes.

## Recommendation and ML Priorities

The current V1 recommender remains the production ranking baseline. ML work should stay offline until it proves a measurable ranking benefit.

Next modelling priorities are summarized from `docs/ml-improvement-roadmap.md`:

1. Run multi-seed decade-stratified evaluation.
2. Add watched-date holdout evaluation for recent-taste realism.
3. Report metrics by release decade.
4. Add first-watch, recency, and release-decade features.
5. Improve sparse feature controls for cast, crew, keywords, countries, and tags.
6. Evaluate normalized-rating regression and pairwise preference approaches.
7. Consider blended V1+ML scores only after ML beats V1 on held-out ranking metrics.

## Maintenance Priorities

- Keep `README.md` focused on setup and deployment.
- Keep `docs/ARCHITECTURE.md` current when routes, data flow, or app boundaries change.
- Record meaningful architectural choices in `docs/DECISIONS.md`.
- Update `docs/HANDOFF.md` after meaningful implementation work.
- Move unresolved assumptions into `docs/OPEN_QUESTIONS.md` rather than burying them in task notes.
