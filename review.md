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
