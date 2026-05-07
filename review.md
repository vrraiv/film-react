# UX / UI Review

A page-by-page audit of the film-react app, capturing rough edges and concrete polish opportunities. Each page section follows the same shape: **Snapshot → Issues → Recommendations → Open questions**. Severity tags: `[High]` breaks or hurts core usability, `[Medium]` visual/hierarchy issues, `[Polish]` refinements.

---

## Shared Picks (`/taste`)

Source: `src/pages/PublicTastePage.tsx`, `src/components/FilmCard.tsx`, `src/index.css`.

### Snapshot
- Route `/taste`, rendered by `PublicTastePage` (124 lines).
- Layout: a single-column `.page` containing a hero/filter card (`page__hero`) and six stacked `panel` sections.
- Sections: *Starter Pack*, *Personal Canon*, *Best by Mood*, *Deep Cuts I Liked*, *Not For Everyone*, *If You Like This* (with a nested seed-film picker + conditional results sub-panel).
- Each section renders `FilmCard`s in a single-column `.film-list` grid; an explanation `<p class="meta">` sits *outside* the card in a wrapper `<div>`.
- Styling: vanilla CSS in `src/index.css` with CSS-variable design tokens. Only two breakpoints exist: `max-width: 860px` and `max-width: 720px`.

### Issues

#### [High] — Visible breaks / poor mobile experience

1. **Filter grid wastes desktop space.** `.filter-grid--compact` declares `grid-template-columns: repeat(4, minmax(0, 1fr))` (`index.css:400`) but only two filters render, leaving the right half of the row empty on desktop. Looks unbalanced and wastes premium real estate.
2. **Filter selects fall below the touch-target minimum on mobile.** `padding: 0.4rem 0.5rem` plus a `0.75rem` label (`index.css:407–414`) yields ~30 px tall hit areas — well below the 44 px / 48 px iOS / Android guideline.
3. **Tag row truncation has no visual cue.** `.tag-row--readonly { overflow: hidden }` (`index.css:586–592`) hard-clips chips with no fade or ellipsis. Users only learn tags were cut by spotting the `+N` chip; static chips also use a tiny `0.72rem` font that's hard to read on phones.
4. **No `<600px` breakpoint.** Below 720 px the filter grid stays at 2 columns and the poster jumps to 84 px, but nothing collapses the filter grid to a single column or further refines the layout for narrow phones.
5. **Card content cramped on small phones.** With an 84 px poster and a flex header that puts the rating pill beside the title, titles wrap awkwardly and the rating pill can crowd the year/director meta.

#### [Medium] — Visual hierarchy & rhythm

6. **All six section panels look identical.** `<h3>` inside `.panel` has no dedicated class (`PublicTastePage.tsx:111`) and `.panel h3` has no rule in CSS, so titles inherit the browser default (~1.17rem). *Starter Pack*, *Personal Canon*, etc. blur together — there's no differentiation, no eyebrow/subtitle, no spacing rhythm.
7. **"If You Like This" is a panel-within-a-panel.** The seed selector and the rendered `TasteSection` (which is itself a `.panel`) nest, producing a doubled card border/shadow (`PublicTastePage.tsx:91–101`). Visually noisy.
8. **The explanation paragraph is orphaned from its card.** `<FilmCard /> <p class="meta">{explanation}</p>` lives in a wrapper `<div>` (`PublicTastePage.tsx:115–118`), so the explanation floats below the card with no visual tie. It reads as unrelated text rather than commentary on the pick above it.
9. **Three lines of muted meta in the card header.** Year+watched, director, and the explanation are all rendered with `.meta` (muted gray). No visual hierarchy distinguishes the two most useful facts (year, director) from the chrome.
10. **No skeleton / progressive loading.** The loading state is a plain `Loading shared picks...` paragraph (`PublicTastePage.tsx:74`). Layout snaps when content arrives; no perception of structure during the fetch.
11. **`console.error` left in the load path** (`PublicTastePage.tsx:29`). Not a UX bug, but flag for cleanup before production.

#### [Polish] — Refinements

12. **Hero copy is verbose.** "Find favorites grouped by mood, length, and style." plus "Use the filters to explore highlights from films that were already watched and rated." is two takes on the same sentence.
13. **Single-column film list wastes width on desktop.** On a 1120 px container, each card spans the full width — at 8–12 cards per section, the page becomes a long vertical scroll.
14. **No feedback when filters change.** Filter changes silently re-render lists below the fold; nothing draws the eye to the updated content.
15. **Filters scroll out of view.** With six long sections, the filter row is gone after ~1.5 viewport-heights of scroll. Refining a filter requires scrolling all the way back up.
16. **No section anchor nav.** A long, multi-section page would benefit from a pill bar of section names (also acts as a scannable TOC on mobile).
17. **Empty-state copy repeats.** "No films match these filters yet." appears once per empty section — up to 5 times stacked on a narrow filter.
18. **Rating pill is always green.** `.film-card__rating` uses `--success` (`index.css:543–551`) regardless of value. A `2.0/5` rendered in success-green sends the wrong signal.

### Recommendations

Concrete changes, ordered to roughly mirror the issues above. Files: `src/index.css` for nearly all CSS edits; `src/pages/PublicTastePage.tsx` and `src/components/FilmCard.tsx` for structural changes.

**Filters**
- (#1) Change `.filter-grid--compact` to `repeat(2, minmax(0, 1fr))` on desktop, OR keep four columns and add two useful controls — a result count (`{count} films match`) on the left and a "Reset filters" pill on the right.
- (#2, #4) Add a phone breakpoint:
  ```css
  @media (max-width: 560px) {
    .filter-grid--compact { grid-template-columns: 1fr; gap: var(--space-6); }
    .filter-grid--compact .field label { font-size: 0.85rem; }
    .filter-grid--compact .field select {
      padding: 0.6rem 0.75rem;
      min-height: 44px;
      font-size: 0.95rem;
    }
  }
  ```
- (#15) Make the filter row sticky on viewports > 720 px:
  ```css
  @media (min-width: 720px) {
    .page__hero { position: sticky; top: 0; z-index: 5; backdrop-filter: blur(8px); }
  }
  ```
  Or extract just the `.filter-grid` into a slim sticky strip below the hero.

**Section structure & rhythm**
- (#6) Add explicit section title styling and an optional eyebrow:
  ```css
  .panel > h3 {
    font-family: var(--display);
    font-size: 1.35rem;
    margin: 0 0 var(--space-9);
  }
  .panel__eyebrow {
    font-size: 0.75rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  ```
  Then in `PublicTastePage.tsx`, give each `TasteSection` a one-line subtitle (e.g., *Starter Pack* → "A representative cross-section to start with").
- (#7) Either pass a `flush` prop to `TasteSection` so the *If You Like This* result list renders without its own `.panel` wrapper, or hoist the seed picker out of the panel and place the result panel beside/below it.
- (#16) Add a horizontal pill nav above the first panel:
  ```tsx
  <nav className="section-anchors">
    <a href="#starter-pack">Starter Pack</a>
    <a href="#personal-canon">Personal Canon</a>
    {/* … */}
  </nav>
  ```
  Style as a horizontally scrollable row on mobile (`overflow-x: auto; gap: var(--space-5);`).

**Card & list**
- (#3) Drop the hard-clip and use a fade mask plus a flush-right toggle:
  ```css
  .tag-row--readonly {
    flex-wrap: nowrap;
    overflow: hidden;
    -webkit-mask-image: linear-gradient(to right, #000 80%, transparent);
            mask-image: linear-gradient(to right, #000 80%, transparent);
  }
  .tag-row--readonly .tag-chip--toggle { margin-inline-start: auto; }
  .tag-row--readonly .tag-chip--static { font-size: 0.78rem; min-height: 1.6rem; }
  ```
- (#5) Below 480 px, stack poster above details:
  ```css
  @media (max-width: 480px) {
    .film-card__content { grid-template-columns: 1fr; }
    .film-card__poster-wrap { max-width: 140px; }
    .film-card__header { flex-wrap: wrap; }
    .film-card__rating { align-self: flex-start; }
  }
  ```
- (#8) Move the explanation inside the card. Add an optional `explanation` prop on `FilmCard`, render it as `<p class="film-card__explanation">…</p>` inside `.film-card__details`. Style with a subtle left border:
  ```css
  .film-card__explanation {
    margin: 0;
    padding-inline-start: var(--space-9);
    border-inline-start: 2px solid var(--accent-line);
    color: var(--text-muted);
    font-style: italic;
  }
  ```
- (#9) Combine year + watched into one line with a separator dot, promote director to non-muted text:
  ```tsx
  <p className="film-card__meta-line">{film.releaseYear ?? '—'} · Watched {formatDate(film.dateWatched)}</p>
  {director ? <p className="film-card__director">Dir. {director}</p> : null}
  ```
- (#13) On wide viewports, use a 2-up grid for the film list (subject to user preference — see open questions):
  ```css
  @media (min-width: 1024px) {
    .film-list { grid-template-columns: repeat(auto-fill, minmax(28rem, 1fr)); }
  }
  ```
- (#18) Either neutralize `.film-card__rating` (use the surface-strong palette like other meta-pills) or color-grade by band:
  ```css
  .film-card__rating { background: var(--surface-strong); color: var(--text); }
  .film-card__rating[data-band="high"] { background: var(--success-soft); color: var(--success); }
  .film-card__rating[data-band="low"]  { background: var(--accent-soft);  color: var(--accent-strong); }
  ```

**States & feedback**
- (#10) Replace the loading text with 2–3 skeleton cards inside a `.panel`. The `.placeholder-card` rule already exists at `index.css:565–571`; add a shimmer keyframe:
  ```css
  @keyframes placeholder-shimmer {
    from { background-position: -200% 0; } to { background-position: 200% 0; }
  }
  .placeholder-card { background: linear-gradient(90deg, var(--surface-muted) 0%, var(--surface) 50%, var(--surface-muted) 100%) 0/200% 100%; animation: placeholder-shimmer 1.4s linear infinite; }
  ```
- (#14) Add a 120 ms fade-in on `.film-list` when filters change (key the section by `${filters.tagOrMood}-${filters.runtimeBucket}` so React remounts and re-runs the animation).
- (#17) Hide empty `panel`s by default behind a "Show empty sections" toggle, OR vary the empty copy (e.g., *Deep Cuts*: "Try a broader runtime — no popularity data for this slice").

**Hero & cleanup**
- (#12) Tighten the hero. Drop `page__copy` or reduce it to one short line below the title; the eyebrow already labels the page.
- (#11) Remove the `console.error` (or wire to a real error reporter when one is added).

### Open questions for the user
1. **Multi-column film list on wide viewports?** Big readability tradeoff — 2-up grids feel modern but reduce the prominence of the explanation/notes per card.
2. **Sticky filter bar?** Worthwhile UX win on this long page, but adds z-index and backdrop-blur complexity that ripples to other pages using `.page__hero`.
3. **Promote the seed-film picker to the top filter row?** It is effectively a third filter; combining all three controls would simplify the layout but couples *If You Like This* to the page header.
4. **Polish scope:** are items 12–18 (`[Polish]`) in scope for this pass, or defer to a later iteration after the `[High]` and `[Medium]` items land?

---

## Insights (`/insights`)

Source: `src/pages/InsightsPage.tsx` (294 lines, no sub-components — entire page is inline), `src/index.css`.

### Snapshot
- Route `/insights` registered in `src/App.tsx:49`; nav link in `src/components/AppShell.tsx`.
- Layout: `<section class="page">` → `page__hero` header → `.shell-grid` (2-col desktop, 1-col at ≤860 px) holding 5 `.shell-card` stat blocks → an orphan footnote paragraph.
- Stat cards: *Film totals*, *Average rating*, *Rating distribution* (bullet list **and** CSS-grid histogram), *Rewatch stats*, *Top tags by average rating*.
- Data source switches by auth: signed-in users see private stats via `useFilms`; signed-out visitors see public diary stats via `fetchPublicFilmEntries`. The hero copy never reflects this.
- Same `page__hero` chrome as Shared Picks but with a different card primitive (`.shell-card` — dashed border + `min-height: 11rem`) instead of `.panel`.

### Issues

#### [High]

1. **Hero copy is misleading for signed-in users.** "A quick look at what shows up most often in the shared film diary." (`InsightsPage.tsx:191–193`) implies the data is community-wide, but signed-in users see *their own* private films. Either the copy needs to branch on auth state, or it needs neutral phrasing.
2. **Rating distribution is shown twice.** A bullet list and a 10-bar histogram render the identical data (`InsightsPage.tsx:228–251`). Doubles vertical space, dilutes the visual.
3. **Histogram unreadable on phones.** `.rating-histogram` is locked to `grid-template-columns: repeat(10, minmax(0, 1fr))` (`index.css:286`) with no breakpoint override. At a 360 px viewport the card has ~290 px of inner width → ~25 px per bar; the 0.68 rem labels (`index.css:314`) bunch and overlap.
4. **No count signal once the histogram dominates.** Bars are scaled relative to `maxRatingCount` only — the chart shows the *shape* but never an absolute count or Y-axis caption. The bullet list is currently the only place absolute counts appear, and once we follow rec #2 it disappears.
5. **`.shell-card` blends into the page background.** Dashed border in `--line-strong` over a `--surface-strong` fill gives a low-contrast, draft-looking treatment (`index.css:269–271`). On the warm beige page background, the card outlines are easy to miss.
6. **`min-height: 11rem` creates dead whitespace.** Cards like *Average rating* render ~3 lines of content but are forced to ~11 rem tall (`index.css:267`). On single-column mobile this stacks into a wall of half-empty cards.

#### [Medium]

7. **No `<860 px` breakpoint refinement.** The grid collapses to 1-col at 860 px and never adjusts again. There's no smaller breakpoint to tighten gap, drop `min-height`, or reflow the histogram.
8. **`.shell-grid` ignores the design token system.** `gap: 1.25rem` is the only raw value in this section of CSS (`index.css:262`); the rest of the file uses `var(--space-N)`. Inconsistency makes future spacing tweaks risky.
9. **Five stacked "Loading…" texts.** During the first paint each card renders its own `<p class="page__copy">Loading…</p>` (`InsightsPage.tsx:202, 214, 225, 261, 276`). On a slow connection the page looks like five broken cards rather than one loading page.
10. **Footnote is orphaned.** `<p class="page__copy">All averages are calculated using the most recent log…</p>` floats below the grid with no container, divider, or visual context (`InsightsPage.tsx:291`). It reads like leftover instructions rather than metadata.
11. **`console.error` in load path** (`InsightsPage.tsx:48`) — same issue as Shared Picks; flag for cleanup.
12. **Card titles lack hierarchy.** `.shell-card h3` is `1.1 rem` regular weight (`index.css:274–277`) — barely larger than body copy. Compare to the proposed `.panel > h3` styling (1.35 rem, `--display`) from the Shared Picks section.
13. **Histogram has no accessibility plumbing.** `<div class="rating-histogram" aria-label="Rating histogram">` (`InsightsPage.tsx:235`) labels the container, but the bullet list above it (currently the only screen-reader-friendly representation of the data) is *not* explicitly tied to the chart, and the bars themselves have no `role` / `aria-hidden`.

#### [Polish]

14. **Rewatch jargon.** "Average first watch" vs. "Average of all watches" (`InsightsPage.tsx:265–266`) is opaque to anyone who hasn't read the dedup logic. Needs an inline tooltip or a one-line explainer.
15. **Inconsistent list styling.** *Top tags* uses a bare `<ol>` (`InsightsPage.tsx:278`), while every other card uses `.insight-list`. Browser-default ordered-list styling differs visually from `.insight-list`'s padding-left override.
16. **Tag rank legibility.** `formatFilmTag(tag): 4.3 (5 rated films)` packs three pieces of info into one line; the parenthetical count is easy to miss. A small chip/badge for appearance count would scan better.
17. **Empty-state copy duplicates.** "More insights will appear as more films are rated." appears in two cards (`InsightsPage.tsx:217, 254`).
18. **No period filter.** Stats are always all-time. A "This year / Last 90 days / All time" toggle would make the page feel more dynamic.
19. **No skeleton.** Same issue as Shared Picks — could share the same `.placeholder-card` shimmer keyframe proposed there.

### Recommendations

Files: `src/index.css` and `src/pages/InsightsPage.tsx`.

**Hero copy & data scope (#1)**
- Branch on auth, keeping the eyebrow stable:
  ```tsx
  <h2 className="page__title">{user ? 'Your watch stats' : 'Diary insights'}</h2>
  <p className="page__copy">{user
    ? 'A snapshot of how you rate, rewatch, and tag the films you log.'
    : 'A quick look at what shows up most often in the shared film diary.'}</p>
  ```
- For signed-out visitors, also surface a small `<span class="meta-pill">Public preview</span>` near the eyebrow so the data source is unambiguous.

**Rating distribution (#2, #3, #4, #13)**
- Drop the bullet list and keep only the histogram; expose absolute counts on each bar via `<title>` (browser tooltip) and an inline-end caption like "12 films at 4.0".
- Add a chart caption above the histogram: `<p class="meta">Films per rating · {ratedCount} rated</p>` so the absolute scale is always visible.
- Add mobile rules:
  ```css
  @media (max-width: 720px) {
    .rating-histogram { height: 7rem; gap: var(--space-1); }
    .rating-histogram__label { font-size: 0.75rem; }
    .rating-histogram__label[data-minor="true"] { display: none; }
  }
  ```
  Then mark every other label with `data-minor="true"` on phones (keep 0.5, 1.5, 2.5, 3.5, 4.5 hidden so 1.0, 2.0, 3.0, 4.0, 5.0 anchor the axis).
- Mark the chart `role="img"` with a generated `aria-label` summarising the distribution (e.g., "Rating distribution: most films are rated 3.5 to 4.0, peak at 4.0 with 12 films"); keep the bars themselves `aria-hidden="true"`.

**Card chrome (#5, #6, #7, #8, #12)**
- Replace dashed border with solid border + soft shadow to lift cards off the page:
  ```css
  .shell-card {
    border: 1px solid var(--line);
    box-shadow: var(--shadow-soft);
  }
  ```
- Remove the global `min-height` and use it only on desktop where 2-up alignment matters:
  ```css
  .shell-card { min-height: auto; }
  @media (min-width: 861px) { .shell-card { min-height: 11rem; } }
  ```
- Switch the grid gap to a token: `.shell-grid { gap: var(--space-12); }` and add a phone breakpoint:
  ```css
  @media (max-width: 560px) {
    .shell-grid { gap: var(--space-9); }
    .shell-card { padding: var(--space-12); }
  }
  ```
- Promote card titles to match Shared Picks rec #6:
  ```css
  .shell-card h3 {
    font-family: var(--display);
    font-size: 1.25rem;
    margin: 0 0 var(--space-6);
  }
  ```

**Loading state (#9, #19)**
- Replace the 5 `<p>Loading…</p>` lines with a single render gate that shows skeleton cards (reuse the `.placeholder-card` rule + the shimmer keyframe proposed in the Shared Picks section). Render 4–5 placeholders inside `.shell-grid` while `isLoading`.

**Footnote (#10)**
- Move the explanation into an `<aside>` with a divider:
  ```tsx
  <aside className="page__footnote">
    All averages use the most recent log for each film when it's been logged multiple times.
  </aside>
  ```
  ```css
  .page__footnote {
    margin-top: var(--space-12);
    padding-top: var(--space-9);
    border-top: 1px dashed var(--line);
    color: var(--text-muted);
    font-size: 0.85rem;
  }
  ```

**Lists & badges (#15, #16)**
- Standardise on `.insight-list` for every card list, including *Top tags* (rendering as `<ol class="insight-list">`).
- For the top-tags row, render the appearance count as a chip:
  ```tsx
  <li>
    {formatFilmTag(item.tag)}
    <strong>{item.averageRating.toFixed(1)}</strong>
    <span className="meta-pill meta-pill--soft">{item.appearances} rated</span>
  </li>
  ```

**Copy & cleanup (#11, #14, #17)**
- Remove the `console.error` (or route through a real reporter once one exists).
- Add a small `<details>` block under the rewatch stats explaining the difference between "first watch" and "all watches" averages — keeps the chrome tight while letting curious users expand.
- Vary the second empty-state line: e.g., *Rating distribution* → "No rated films yet. Log a rating on any film to see this chart fill in."

**Period filter (#18 — optional)**
- If adopted, add a simple select in the header: "All time · This year · Last 90 days · Last 30 days". Recompute `insights` against a date-filtered `films` array.

### Cross-page consistency notes (for tracking)
- **Two card primitives in use** for what is essentially the same concept ("a section card"): `.panel` (Shared Picks) vs. `.shell-card` (Insights). Either consolidate to one and use modifier classes for the data-vs-content distinction, or keep both but document the rule in CSS comments.
- **Same `console.error` pattern** appears on both pages.
- **Same orphan-paragraph pattern**: Shared Picks has the per-film explanation outside `FilmCard`; Insights has the all-averages footnote outside the grid. A general rule of thumb worth adopting: meta/explainer copy lives inside the visual container it describes.
- **No skeletons anywhere.** A shared `.placeholder-card` + shimmer keyframe (proposed on both pages) would unify loading UX across the app.

### Open questions for the user
1. **Drop the bullet list under *Rating distribution*?** Keeps the page tighter and the histogram becomes the single source of truth — but only if we successfully surface absolute counts via tooltip/caption.
2. **Branch hero copy on auth state, or keep neutral wording?** Branching is more honest but adds a tiny bit of state-dependent UI.
3. **Consolidate `.panel` and `.shell-card` into one primitive?** Big consistency win, modest churn (touches multiple pages).
4. **Add a period filter?** Useful but requires recomputing stats; confirm before scoping.
