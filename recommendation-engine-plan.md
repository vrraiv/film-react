# Personal Film Diary Recommendation Engine — V1/V2 Scope and Phasing

## Project context

The app is a personal film diary and rating system. The current state is:

- Live and hosted on Netlify with a custom domain.
- Supabase integration completed.
- TMDb integration completed.
- Letterboxd import completed successfully.
- Main remaining data-population task: manually add tags to imported Letterboxd films.

Once tagging is complete, the database should contain enough structured data to support a recommendation engine.

The core recommender should serve two product goals:

1. **Personal recommendations for me**: help me decide what to watch next.
2. **Public taste/recommendation view**: help friends, family, or visitors understand what I like and find films from my diary they may want to watch.

The system should account for selection bias: because I chose to watch the logged films, features known before watching—such as genre, director, country, decade, cast, or broad premise—should often be interpreted as signs of **affinity**, even if ratings are mixed. Low ratings should not automatically mean dislike of the genre or feature.

---

# Guiding principles

## 1. Ratings and tags do different jobs

Ratings measure **preference / satisfaction**.

Tags describe **why a film may have appealed or failed**.

The recommender should avoid treating every low-rated film as a negative signal for all of its features. A watched low-rated film may mean:

- I was interested in the film’s category.
- The execution disappointed me.
- The broad genre has high upside but uneven hit rate.
- The specific sub-traits matter more than the broad category.

## 2. Separate interest, satisfaction, and risk

Each candidate recommendation should eventually have separate scores:

- **Interest score**: how likely the film is to be something I would select into.
- **Expected satisfaction score**: how likely I am to rate it highly, conditional on interest.
- **Risk score**: how volatile or uncertain the recommendation is.
- **Confidence score**: how much evidence supports the recommendation.

This prevents the engine from falsely concluding that I dislike categories I often watch but rate unevenly.

## 3. V1 should be explainable before it is clever

V1 should be deterministic, inspectable, and debuggable.

Avoid ML in V1. Use rules, helper functions, summary statistics, residuals, and transparent classifications.

The first version should focus on building a reliable **taste profile** and **diagnostic views** before generating assertive recommendations.

## 4. V2 can add ML, but only on top of V1

ML should not replace the V1 taste engine.

V2 should use V1 outputs as features in a hybrid supervised ranking model. The ML layer should improve ranking and learn interactions, while V1 remains the fallback and explanation layer.

---

# Key data concepts

## Feature categories

Features should be classified by how they should be interpreted.

```ts
type FeatureRole =
  | "selection_affinity"
  | "satisfaction_predictor"
  | "negative_experience_signal"
  | "neutral_descriptor"
  | "manual_override";
```

### Selection-affinity features

These are usually known before watching and often indicate that I selected into the film intentionally.

Examples:

- Genre
- Director
- Writer
- Cast
- Country
- Language
- Decade
- Runtime range
- Franchise/series
- TMDb keywords, cautiously
- Broad descriptive tags such as mystery, noir, political thriller, screwball comedy

For these, high prevalence in watched films should generally increase affinity. Low ratings should reduce confidence or satisfaction, but should not automatically become a strong negative preference signal.

### Satisfaction-predictor features

These are traits that may explain why something landed well or poorly.

Examples:

- Restrained
- Melancholy
- Morally ambiguous
- Procedural
- Shaggy structure
- Didactic
- Sentimental
- Tonally uneven
- Forced quirk
- Thin characterization

These can be weighted more directly by ratings and residuals.

### Neutral descriptors

These may be useful for filtering or browsing but should not strongly drive recommendations.

Examples:

- Black and white
- Based on a novel
- Christmas setting
- Courtroom
- Road movie

### Manual overrides

Some tags or features should support manual override.

```ts
type FeatureOverride =
  | "seek"
  | "like_when_done_well"
  | "neutral"
  | "avoid"
  | "ignore";
```

Example:

```ts
{
  "mystery-comedy": "like_when_done_well",
  "forced quirk": "avoid",
  "noir scaffolding": "seek",
  "crime": "neutral"
}
```

---

# V1 scope: deterministic recommendation foundation

## V1 objective

Build an explainable, selection-aware taste profile and recommendation foundation using:

- Personal ratings
- Manual tags
- TMDb metadata
- TMDb keywords
- Letterboxd-imported watch/rating history
- Derived affinity, satisfaction, residual, risk, and confidence scores

V1 should produce:

1. Taste diagnostics.
2. Public taste-browsing modules based on watched films.
3. Personal recommendation scaffolding using deterministic scoring.
4. A configuration layer for tuning and overrides.

---

# V1 phases

## Phase 1 — Tag audit and normalization

### Goal

Ensure manual tags are reliable enough to model.

### Tasks

- Review imported Letterboxd films and add tags.
- Normalize duplicate tags.
- Identify low-information tags.
- Separate descriptive tags from judgment tags.
- Assign each tag a modelling role.
- Add support for manual tag/feature overrides.

### Outputs

- Clean tag dictionary.
- Tag role metadata.
- Optional override config.
- Admin/debug view for tag usage counts.

### Design decisions

- Should tag roles be stored in Supabase or a local config file?
- Should users edit tag roles in the UI, or should this be developer-configured only?
- Should judgment-like tags such as `great ending` or `weak ending` be allowed?
- Should tags be grouped into families such as tone, theme, style, structure, genre, and flaw?
- What is the minimum number of films required before a tag becomes model-relevant?

### Suggested Codex prompt

```md
You are working in my React + Vite + TypeScript film diary app with Supabase and TMDb already integrated.

Goal: implement a V1 tag-audit and tag-normalization foundation for the future recommendation engine.

Please inspect the existing project structure and data model first. Then implement the lowest-debt version of the following:

1. Add a tag metadata/config layer that can classify tags by modelling role:
   - selection_affinity
   - satisfaction_predictor
   - negative_experience_signal
   - neutral_descriptor
   - manual_override

2. Add optional feature overrides:
   - seek
   - like_when_done_well
   - neutral
   - avoid
   - ignore

3. Add helper functions that summarize tag usage across logged films:
   - count of films per tag
   - average rating by tag
   - share of films with rating >= 4.0
   - share of films with rating >= 4.5
   - list of tags with very low usage
   - list of tags used very frequently

4. Add a simple admin/debug UI, hidden from the public viewer, showing tag usage diagnostics.

Constraints:
- Do not build the recommendation engine yet.
- Do not introduce ML.
- Do not break the public viewer.
- Keep implementation simple, typed, and easy to extend.
- If the current schema does not support persistent tag metadata yet, propose the least invasive Supabase addition and implement it if appropriate.

Return a summary of files changed, schema changes if any, and any follow-up decisions I need to make.
```

---

## Phase 2 — TMDb keyword and metadata enrichment

### Goal

Collect and store external metadata that can support recommendations, especially for unseen candidate films.

### Tasks

- Fetch TMDb keywords for logged movies.
- Confirm existing metadata coverage:
  - TMDb ID
  - title
  - release year
  - poster
  - genres
  - runtime
  - director
  - writer, if available
  - cast, if available
  - country/language
- Store TMDb keywords separately from manual tags.
- Add helper functions to normalize TMDb keywords.
- Add safe re-run/backfill behaviour.

### Outputs

- TMDb keyword table or JSON field.
- Backfill script for logged movies.
- Metadata completeness diagnostic.

### Design decisions

- Should TMDb keywords be stored as raw imported keywords, normalized keywords, or both?
- Should keywords be attached to movies in a join table or JSON column?
- Should TMDb keywords be shown in the UI or remain internal to the recommender?
- Should keywords ever be promoted into manual tags?
- Should keyword fetching run on demand, during import, or through a backfill script?

### Suggested Codex prompt

```md
You are working in my React + Vite + TypeScript film diary app. Supabase, TMDb, and Letterboxd import are already implemented.

Goal: add TMDb keyword enrichment for logged movies as preparation for the recommendation engine.

Please inspect the existing TMDb integration and Supabase schema first. Then implement the lowest-debt version of the following:

1. Add a data structure for TMDb keywords associated with logged movies.
   - Keep TMDb keywords separate from my manual tags.
   - Preserve the source as TMDb.
   - Avoid overwriting manual tags.

2. Add a backfill script or admin-only action that fetches TMDb keywords for all logged films with a TMDb ID.

3. Make the backfill safe to re-run:
   - skip movies already enriched unless forced
   - handle missing TMDb IDs
   - handle TMDb API failures gracefully
   - log useful progress and errors

4. Add metadata completeness diagnostics:
   - number of logged films
   - number with TMDb ID
   - number with keywords
   - number with genres
   - number with director
   - number with runtime

5. Keep this as an enrichment step only. Do not build recommendations yet.

Constraints:
- Do not merge TMDb keywords into manual tags.
- Do not expose noisy keywords prominently in the public UI.
- Do not introduce ML.
- Keep functions typed and reusable for later recommender work.

Return a summary of files changed, any Supabase migration/schema changes, and how to run the enrichment.
```

---

## Phase 3 — Taste profile engine

### Goal

Create deterministic helper functions that convert logged movie data into a structured taste profile.

### Core calculations

```ts
calculateBaselineRating()
calculateFeatureStats()
calculateAffinityScore()
calculateExpectedSatisfactionScore()
calculateResiduals()
calculateHitRate()
calculateVariance()
calculateConfidence()
classifyFeature()
```

### Feature stats object

```ts
type FeatureStats = {
  featureId: string;
  featureLabel: string;
  featureType: "tag" | "genre" | "director" | "keyword" | "decade" | "country" | "language" | "runtime_bucket";
  role?: FeatureRole;
  count: number;
  affinityScore: number;
  avgRating: number;
  expectedSatisfactionScore: number;
  hitRate4Plus: number;
  hitRate45Plus: number;
  residualMean: number;
  residualVariance: number;
  riskScore: number;
  confidence: number;
  classification: FeatureClassification;
};
```

### Feature classifications

```ts
type FeatureClassification =
  | "safe_bet_zone"
  | "high_interest_mixed_results"
  | "underexplored_high_upside"
  | "low_priority"
  | "neutral_or_insufficient_data"
  | "possible_avoid";
```

### Outputs

- Taste profile object.
- Feature-level statistics.
- Classifications.
- Unit tests or fixture tests using a small mock dataset.

### Design decisions

- What rating threshold defines “positive”? Suggested: 4.0+.
- What rating threshold defines “strong positive”? Suggested: 4.5+.
- What minimum sample size is required for feature classification?
- Should residuals be calculated against global baseline, genre baseline, tag-family baseline, or hybrid baseline?
- How much should negative ratings affect selection-affinity features?
- Should confidence use simple sample-size rules or Bayesian/shrinkage logic?

### Suggested Codex prompt

```md
You are working in my React + Vite + TypeScript film diary app with Supabase, TMDb metadata, manual tags, ratings, and TMDb keywords.

Goal: implement the deterministic V1 taste-profile engine. This is not yet a recommendation UI. It should produce reusable typed outputs that can power diagnostics and recommendations later.

Please inspect the existing movie/rating/tag data model first. Then implement typed helper functions for:

1. Baseline rating:
   - calculate overall average rating
   - calculate rating distribution

2. Feature extraction:
   - manual tags
   - TMDb genres
   - TMDb keywords
   - director
   - decade
   - country/language if available
   - runtime bucket if available

3. Feature stats:
   - count
   - average rating
   - hit rate for rating >= 4.0
   - hit rate for rating >= 4.5
   - affinity score based primarily on watched prevalence
   - expected satisfaction score based on ratings, with shrinkage for low sample size
   - residual mean and residual variance
   - risk score based on variance and high-affinity/mixed-rating patterns
   - confidence score based on sample size and metadata completeness

4. Feature classification:
   - safe_bet_zone
   - high_interest_mixed_results
   - underexplored_high_upside
   - low_priority
   - neutral_or_insufficient_data
   - possible_avoid

Important modelling rule:
Features known before watching, such as genre, director, country, decade, and broad keywords, should mostly be treated as selection-affinity signals. Low ratings should reduce satisfaction/confidence but should not create strong negative penalties unless manually overridden.

5. Add tests or fixtures for the taste-profile helpers, including a case where a high-sample genre has mixed ratings and should be classified as high_interest_mixed_results rather than possible_avoid.

Constraints:
- No ML.
- No recommendation UI yet unless needed for debugging.
- Keep functions pure where possible.
- Keep the model explainable.
- Use clear TypeScript types.

Return a summary of files changed, model assumptions, and any tuning constants I should review.
```

---

## Phase 4 — Taste diagnostics UI

### Goal

Show what the engine thinks it has learned before using it to recommend films.

### Diagnostic views

1. **Feature map**
   - Feature
   - Type
   - Count
   - Affinity
   - Avg rating
   - Hit rate
   - Risk
   - Confidence
   - Classification

2. **High-interest, mixed-result zones**
   - High affinity
   - Medium/low satisfaction or high variance
   - Example: mystery-comedy, if often watched but unevenly rated

3. **Safe-bet zones**
   - High affinity
   - High satisfaction
   - Low risk

4. **Underexplored high-upside zones**
   - Low/medium sample
   - High average rating or hit rate
   - Lower confidence

5. **Low-information tags**
   - Too rare
   - Too common
   - Too ambiguous

6. **Tag-pair winners**
   - Combinations with strong positive residuals or high hit rates

### Outputs

- Admin/private diagnostics page.
- Filters by feature type and classification.
- Basic charts/tables.
- No public exposure unless intentionally enabled.

### Design decisions

- Should diagnostics live under an admin route, hidden route, or authenticated-only route?
- Should users be able to edit overrides from diagnostics?
- Should charts be added now, or should V1 start with tables?
- Should tag-pair analysis be included in V1 or deferred?
- Should diagnostic outputs be computed client-side, via Supabase queries, or via a Netlify function?

### Suggested Codex prompt

```md
You are working in my React + Vite + TypeScript film diary app. The deterministic taste-profile helper functions now exist.

Goal: build a private/admin Taste Diagnostics UI so I can inspect what the future recommendation engine thinks it has learned.

Please implement an authenticated-only or hidden admin page that displays the taste-profile outputs in readable tables and simple visual sections.

Include:

1. Feature map table:
   - feature label
   - feature type
   - count
   - affinity score
   - average rating
   - hit rate >= 4.0
   - hit rate >= 4.5
   - residual mean
   - residual variance
   - risk score
   - confidence score
   - classification

2. Sections for:
   - safe-bet zones
   - high-interest, mixed-result zones
   - underexplored high-upside zones
   - low-priority or possible-avoid features
   - low-information tags

3. Basic filters:
   - feature type
   - classification
   - minimum count

4. Clear empty/loading/error states.

Important product rule:
This page is diagnostic. It should not yet claim to recommend movies. Its purpose is to make false signals visible before we build the recommender UI.

Constraints:
- Do not expose this in the public viewer unless explicitly configured.
- Do not introduce ML.
- Keep styling consistent with the existing app.
- Keep components modular so recommendation pages can reuse them later.

Return a summary of files changed and any data/model assumptions surfaced by the UI.
```

---

## Phase 5 — Public taste browser

### Goal

Create public-facing recommendation-like modules based only on watched films.

This is for visitors who want to understand what I like.

### Candidate universe

Only films already watched, rated, and tagged.

Do **not** recommend unseen TMDb candidates publicly in V1.

### Public modules

- Starter pack
- Personal canon
- Best by mood/tag
- Deep cuts I liked
- If you liked this, try this from my diary
- Not for everyone
- Representative favourites

### Outputs

- Public taste modules.
- Explanation text generated from ratings/tags, not ML.
- Public-safe recommendation labels.

### Design decisions

- Should public modules appear on the main public page or a separate route?
- Should all ratings be visible publicly?
- Should public recommendations include lower-rated “interesting but flawed” films?
- Should visitors be able to filter by mood/tag/runtime?
- Should explanations be deterministic or partly generated by an LLM later?

### Suggested Codex prompt

```md
You are working in my React + Vite + TypeScript film diary app. The app has public viewing, Supabase data, manual tags, ratings, TMDb metadata, and deterministic taste-profile helpers.

Goal: build a V1 public taste browser using only films I have already watched and rated. This is for friends/family/visitors who want to understand what I like.

Please implement public-facing modules that do not recommend unseen movies. Use only logged films.

Modules to build:

1. Starter Pack
   - accessible, highly rated, representative films
   - should avoid only obscure or extremely high-risk picks dominating the list

2. Personal Canon
   - strongest rated films, grouped or filterable by tags/mood

3. Best by Mood/Tag
   - let visitors pick a tag or mood and see highly rated matching films

4. Deep Cuts I Liked
   - highly rated films with lower TMDb popularity if popularity data is available

5. Not For Everyone
   - highly rated by me but tagged with traits such as bleak, slow, abrasive, strange, difficult, or similar if present

6. If You Like This, Try This From My Diary
   - for a selected logged film, show other watched films with overlapping tags/metadata

Each item should include a short deterministic explanation, such as:
"Included because it is highly rated and matches recurring high-satisfaction tags: political, procedural, morally ambiguous."

Constraints:
- Use watched/logged films only.
- Do not introduce ML.
- Do not recommend unseen TMDb candidates in this public view.
- Keep explanations grounded in available tags, ratings, and metadata.
- Preserve existing public viewer behaviour.

Return a summary of files changed, routes/components added, and any design decisions still needed.
```

---

## Phase 6 — Personal deterministic recommender

### Goal

Recommend unseen or rewatchable films for personal use using deterministic scoring.

### Candidate sources

- TMDb similar films from highly rated movies.
- TMDb recommendations from highly rated movies.
- TMDb discover queries based on high-affinity features.
- Optional manual watchlist later.
- Optional director filmographies later.

### Recommendation output

```ts
type RecommendationResult = {
  filmId: string;
  recommendationType:
    | "safe_bet"
    | "worth_the_gamble"
    | "stretch_pick"
    | "deep_cut"
    | "underexplored_fit"
    | "rewatch_candidate";
  interestScore: number;
  satisfactionScore: number;
  riskScore: number;
  confidenceScore: number;
  explanation: {
    primaryReasons: string[];
    cautions: string[];
    similarLikedFilms: string[];
    matchingTags: string[];
  };
};
```

### Modes

- Safe bet
- Worth the gamble
- Stretch pick
- Deep cut
- Under 100 minutes
- Exclude watched
- Include rewatches
- Something like this

### Design decisions

- Should candidate generation happen client-side, server-side, or in Netlify functions?
- Should candidates be cached in Supabase?
- Should unseen candidate metadata be stored permanently or temporarily?
- How much should TMDb popularity influence ranking?
- Should recommendations be generated live or precomputed?
- Should users be able to dismiss recommendations and use that as feedback?

### Suggested Codex prompt

```md
You are working in my React + Vite + TypeScript film diary app. The app has Supabase, TMDb, ratings, manual tags, TMDb keywords, and deterministic taste-profile helpers.

Goal: build the V1 personal deterministic recommender. This should recommend films for me, using an explainable scoring model. No ML.

Please implement the lowest-debt version of the following:

1. Candidate generation:
   - use TMDb similar/recommendation endpoints seeded from my highly rated films
   - optionally use TMDb discover queries based on high-affinity genres/keywords/directors if straightforward
   - exclude films already logged by default
   - support an option to include rewatch candidates later

2. Candidate enrichment:
   - title
   - TMDb ID
   - poster
   - year
   - genres
   - runtime if available
   - director if available
   - keywords if available
   - TMDb popularity/vote average as low-weight priors

3. Deterministic scoring:
   - interestScore
   - expectedSatisfactionScore
   - riskScore
   - confidenceScore
   - final display classification

4. Recommendation types:
   - safe_bet
   - worth_the_gamble
   - stretch_pick
   - deep_cut
   - underexplored_fit
   - rewatch_candidate, if watched films are included

5. Explanation generation:
   - primary reasons from matching tags/features
   - cautions from high-risk/mixed-result zones
   - similar liked films from my diary
   - avoid vague explanations not grounded in data

Important modelling rule:
A feature that appears frequently in watched films but has mixed ratings should be treated as high-interest/mixed-results, not as automatic dislike.

6. Build a private/personal recommendations page with filters:
   - safe bet / worth the gamble / stretch / deep cut
   - exclude watched
   - runtime filter if available
   - seed film: "something like this" if feasible

Constraints:
- No ML.
- Keep the scorer explainable and easy to tune.
- Do not over-weight TMDb popularity.
- Cache API results where appropriate to avoid excessive TMDb calls.
- Preserve public viewer behaviour.

Return a summary of files changed, scoring assumptions, and any tuning constants I should review.
```

---

## Phase 7 — Configuration and tuning

### Goal

Add a small configuration/override layer so the model can be corrected when it learns false signals.

### Config example

```ts
type RecommenderConfig = {
  minimumFeatureCount: number;
  ratingPositiveThreshold: number;
  ratingStrongPositiveThreshold: number;
  maxNegativePenaltyForSelectionFeatures: number;
  tagRoleOverrides: Record<string, FeatureRole>;
  featureOverrides: Record<string, FeatureOverride>;
  weights: {
    manualTags: number;
    tmdbKeywords: number;
    director: number;
    genre: number;
    decade: number;
    country: number;
    popularityPrior: number;
  };
};
```

### Design decisions

- Config file versus Supabase settings table?
- Should override editing be exposed in the app?
- Should overrides be versioned?
- Should every recommendation record store the model/config version used?
- Should dismissed recommendations become feedback for V2?

### Suggested Codex prompt

```md
You are working in my React + Vite + TypeScript film diary app. The deterministic recommendation helpers and UI exist.

Goal: add a lightweight V1 recommender configuration and override layer so I can tune false signals without changing core code.

Please implement:

1. A typed recommender config object with:
   - minimumFeatureCount
   - ratingPositiveThreshold
   - ratingStrongPositiveThreshold
   - maxNegativePenaltyForSelectionFeatures
   - weights for manual tags, TMDb keywords, director, genre, decade, country, and TMDb popularity prior

2. Feature/tag overrides:
   - seek
   - like_when_done_well
   - neutral
   - avoid
   - ignore

3. Make the taste-profile and recommendation scoring helpers consume this config.

4. Add a simple private/admin UI to view and, if low-risk, edit overrides.
   - If editing persistent config is too invasive, implement a config file first and expose it read-only in the UI.

5. Ensure recommendation explanations mention when a manual override materially affected a recommendation.

Constraints:
- No ML.
- Keep the config simple.
- Do not expose override controls publicly.
- Preserve deterministic fallback behaviour.

Return a summary of files changed and any config values I should tune manually.
```

---

# V2 scope: ML-assisted hybrid recommender

## V2 objective

Add ML to improve ranking, interaction detection, and candidate prioritization while preserving V1’s explainability and selection-aware structure.

V2 should not be a black-box replacement. It should be a hybrid layer that uses V1 features and outputs as model inputs.

Recommended V2 approach:

1. Start with a supervised high-rating classifier.
2. Move to pairwise or listwise learning-to-rank.
3. Add embeddings later for candidate expansion and natural-language search.

---

# V2 architecture

## Model structure

### Model 1 — Selection / interest model

Predicts:

```text
Would I have chosen to watch this?
```

Labels:

- Positive: watched films.
- Negative: sampled unwatched candidate films.

Features:

- Genre
- Director
- Cast
- Country/language
- Decade
- Runtime
- TMDb keywords
- Similarity to watched films
- V1 affinity features

Purpose:

- Capture selection affinity.
- Avoid treating watched low-rated films as pure negative examples.

### Model 2 — Satisfaction model

Predicts:

```text
Conditional on interest, would I rate this highly?
```

Labels:

- Positive: watched and rated >= 4.0.
- Strong positive: watched and rated >= 4.5.
- Neutral/negative: watched and rated below threshold.

Features:

- Manual tags
- TMDb keywords
- Genres
- Director/writer/cast
- V1 interest score
- V1 satisfaction score
- V1 risk score
- Residual features
- High-affinity/mixed-result flags
- Similarity to high-rated films
- Similarity to low-rated-but-selected films

### Model 3 — Ranking model

Predicts:

```text
Which candidate should rank above another candidate?
```

Training pairs:

- 5-star film > 3-star film
- 4.5-star film > 2.5-star film
- 4-star film > 3-star film

Recommended approach:

- Start with high-rating classification.
- Move to pairwise ranking after the data pipeline is stable.

---

# Recommended V2 models

## V2.1 — Gradient-boosted classifier

Recommended options:

- LightGBM
- XGBoost
- CatBoost

Prediction target:

```text
P(rating >= 4.0)
P(rating >= 4.5)
```

Why:

- Works well on tabular metadata.
- Handles nonlinear interactions.
- More interpretable than neural models.
- Suitable for smaller datasets.
- Can use V1 outputs as features.

## V2.2 — Learning-to-rank

Recommended options:

- LightGBM ranker
- XGBoost ranker

Goal:

- Rank candidate films by likely personal value rather than predicting exact star rating.

Why:

- Recommendation quality is more important than exact rating prediction.
- Pairwise preference is often more stable than exact stars.
- Better matches the product need.

## V2.3 — Embeddings for candidate expansion

Use embeddings later for:

- Semantic similarity.
- Tag clustering.
- Keyword-to-tag mapping.
- Natural-language search.
- Seed-film similarity.

Do not make embeddings the first ML recommender.

Embeddings should expand the candidate pool; the hybrid recommender should still rank candidates.

---

# V2 phases

## Phase 1 — ML dataset and feature export

### Goal

Create a clean, reproducible training dataset from the app’s Supabase data and V1 feature engine.

### Outputs

- Training rows for logged films.
- Candidate/unwatched negative samples.
- Feature matrix.
- Labels.
- Model version metadata.

### Design decisions

- Where should ML training happen: local script, notebook, serverless function, or external job?
- Should the app store model outputs only, or also model artifacts?
- How should negative samples be generated?
- Should watchlist items be treated differently from arbitrary unwatched candidates?
- How should time-based train/test splits be implemented?

### Suggested Codex prompt

```md
You are working in my React + Vite + TypeScript film diary app with Supabase and a deterministic V1 recommendation/taste-profile engine.

Goal: prepare the V2 ML dataset export. Do not train a model yet.

Please implement a reproducible dataset export pipeline that produces feature rows for logged films and candidate/unwatched films.

Requirements:

1. Export logged film rows with:
   - movie ID
   - TMDb ID
   - rating
   - watched date if available
   - manual tags
   - TMDb genres
   - TMDb keywords
   - director/writer/cast if available
   - runtime/year/country/language if available
   - V1 interest score
   - V1 satisfaction score
   - V1 risk score
   - V1 confidence score
   - feature classifications and residual stats where applicable

2. Generate labels:
   - rating >= 4.0
   - rating >= 4.5
   - normalized rating if useful
   - watched = true

3. Add a way to generate or export candidate/unwatched rows for selection modelling.
   - Use TMDb candidates already generated by V1 if available.
   - Clearly mark these as sampled negatives/unknowns, not true dislikes.

4. Support time-based train/test splitting:
   - older watched films for training
   - newer watched films for validation

5. Output to a local JSON or CSV file suitable for Python model training.

Constraints:
- Do not train ML inside the app yet.
- Do not change recommendation ranking yet.
- Keep export reproducible and typed.
- Document how to run the export.

Return a summary of files changed and any assumptions about labels or negative sampling.
```

---

## Phase 2 — High-rating classifier prototype

### Goal

Train a first ML model to predict high-rating probability.

### Target

```text
P(rating >= 4.0)
P(rating >= 4.5)
```

### Evaluation

Use time-based validation.

Metrics:

- Precision@K
- Recall@K
- NDCG@K
- Hit rate@K
- Calibration
- Comparison against deterministic V1 ranking

### Design decisions

- Which model library should be used?
- Should model training live outside the app repo or inside a `/ml` directory?
- How often should the model be retrained?
- Should model predictions be stored in Supabase?
- How should model failures fall back to V1?

### Suggested Codex prompt

```md
You are working in my film diary app repo. A V2 ML dataset export now exists. The app itself is React + Vite + TypeScript with Supabase, but this task can add a local Python ML prototype under a clearly separated directory such as /ml.

Goal: train a first high-rating classifier prototype for the recommendation engine.

Please implement a local, reproducible ML prototype that:

1. Loads the exported ML dataset.
2. Uses time-based validation if watched dates are available.
3. Trains a simple tabular model to predict:
   - rating >= 4.0
   - rating >= 4.5, if enough positives exist

Preferred model:
- Start with a simple, maintainable approach.
- If using gradient boosting, prefer LightGBM, XGBoost, or CatBoost.
- If dependencies are too heavy, start with scikit-learn logistic regression / random forest as a baseline and document the tradeoff.

4. Evaluates against the V1 deterministic baseline using:
   - Precision@K
   - Recall@K
   - NDCG@K if practical
   - Hit rate@K
   - calibration or probability bucket checks if practical

5. Exports predictions in a format the app can later consume:
   - movie/candidate ID
   - mlHighRatingProbability
   - mlStrongRatingProbability if available
   - model version

Constraints:
- Do not wire ML into the production UI yet.
- Do not remove or replace the deterministic V1 recommender.
- Keep all ML code isolated from the app runtime.
- Include a README explaining how to run training and evaluation.

Return a summary of files changed, evaluation results if run locally, and any limitations.
```

---

## Phase 3 — Hybrid score integration

### Goal

Integrate ML predictions as a supplemental ranking signal, not a replacement.

### Hybrid score example

```text
finalScore =
  0.50 * v1SatisfactionScore
+ 0.30 * mlHighRatingProbability
+ 0.10 * interestScore
+ 0.10 * noveltyOrDiversityScore
- riskPenalty
```

The exact weights should be configurable.

### Outputs

- ML prediction import path.
- Hybrid recommender mode.
- Model version display.
- Fallback to deterministic V1.

### Design decisions

- Should ML scores be imported manually, stored in Supabase, or loaded from static files?
- Should hybrid mode be default or opt-in?
- What should happen when ML predictions are missing?
- How visible should ML scores be in the UI?
- Should explanations mention ML, or only use grounded V1 features?

### Suggested Codex prompt

```md
You are working in my React + Vite + TypeScript film diary app. The V1 deterministic recommender exists, and an offline ML prototype can export prediction scores.

Goal: integrate ML predictions as a supplemental hybrid scoring signal without replacing V1.

Please implement:

1. A typed structure for ML prediction imports:
   - movie/candidate ID
   - mlHighRatingProbability
   - mlStrongRatingProbability, optional
   - modelVersion
   - generatedAt

2. A way to load/store ML predictions.
   - Prefer the lowest-debt approach consistent with the existing Supabase architecture.
   - If a Supabase table is appropriate, propose and implement a migration.
   - If static JSON is better for now, implement that and document the limitation.

3. A hybrid scoring mode:
   - keep V1 deterministic scores
   - add ML score as a configurable component
   - default to V1 when ML prediction is missing
   - preserve interest, satisfaction, risk, and confidence outputs

4. Update private recommendation UI to optionally show:
   - deterministic V1 rank
   - hybrid rank
   - model version
   - whether ML contributed to the ranking

5. Keep explanations grounded in tags, ratings, and metadata.
   - Do not generate vague explanations like "the ML model thinks you will like this."

Constraints:
- Do not make ML mandatory.
- Do not remove V1 deterministic ranking.
- Keep fallback behaviour robust.
- Keep hybrid weights configurable.

Return a summary of files changed, schema changes if any, and how to load ML predictions.
```

---

## Phase 4 — Learning-to-rank

### Goal

Move from classification to ranking.

### Training setup

Use pairwise/listwise ranking where possible.

Examples:

- 5-star film should rank above 3-star film.
- 4.5-star film should rank above 2.5-star film.
- 4-star film should rank above 3-star film.

### Design decisions

- Pairwise or listwise ranking?
- Should ranking be trained globally on all logged films or separately by mode?
- Should different recommendation modes have different ranking objectives?
- Should “public starter pack” use a different model than personal watch-next?

### Suggested Codex prompt

```md
You are working in my film diary app repo. A V2 high-rating classifier prototype exists under the ML workflow, and the production app still uses deterministic V1 with optional hybrid ML scores.

Goal: prototype a learning-to-rank model for recommendations.

Please implement an isolated ML prototype that:

1. Builds training pairs or ranking groups from rated films.
   - Higher-rated films should rank above lower-rated films.
   - Use rating gaps to avoid noisy near-ties where appropriate.
   - Preserve time-based validation if possible.

2. Trains a ranking model.
   - Prefer LightGBM Ranker or XGBoost ranking if dependencies are manageable.
   - Otherwise implement a simpler pairwise baseline and document limitations.

3. Evaluates ranking quality against:
   - V1 deterministic rank
   - V2 high-rating classifier rank

Use metrics such as:
   - NDCG@K
   - Precision@K
   - Hit rate@K

4. Exports candidate rank scores:
   - candidate ID
   - mlRankScore
   - modelVersion
   - generatedAt

Constraints:
- Do not wire this into production UI yet unless explicitly asked.
- Keep this isolated in the ML workflow.
- Do not remove the classifier prototype.
- Document whether ranking outperforms the simpler classifier.

Return a summary of files changed, evaluation results if run locally, and whether the ranker appears worth integrating.
```

---

## Phase 5 — Embedding-assisted candidate expansion

### Goal

Use embeddings to find better candidate films, not to replace the ranking model.

### Embedding use cases

- Find films similar to a seed film.
- Cluster tags and TMDb keywords.
- Map TMDb keywords to manual tags.
- Support natural-language requests:
  - “something shaggy, funny, and noir-ish”
  - “political but not too bleak”
  - “a safe bet under 100 minutes”

### Design decisions

- Which text should be embedded?
  - plot overview
  - manual tags
  - TMDb keywords
  - genres
  - director/cast metadata
- Where should embeddings be generated and stored?
- Should embeddings use Supabase vector search, local files, or another service?
- How often should embeddings be refreshed?
- Should embedding candidates be ranked only after passing through the hybrid recommender?

### Suggested Codex prompt

```md
You are working in my film diary app repo. V1 deterministic recommendations exist, and V2 ML ranking/classification is being prototyped.

Goal: prototype embedding-assisted candidate expansion. Embeddings should help find candidate films, not replace the recommender scoring model.

Please implement a design/prototype for:

1. Building a text representation for each movie/candidate using available fields:
   - title
   - overview
   - manual tags
   - TMDb keywords
   - genres
   - director/writer if available
   - country/language/year if useful

2. Generating embeddings for logged films and candidates.
   - Choose the lowest-debt implementation path.
   - Keep API keys and secrets secure.
   - If actual embedding generation is not appropriate in this environment, create the interfaces and document the expected provider.

3. Candidate expansion workflows:
   - find candidates similar to a seed film
   - find candidates similar to a cluster of high-rated films
   - support a natural-language query that retrieves semantically similar candidates

4. Ensure all embedding-generated candidates are still passed through the V1/V2 recommender scoring layer before display.

Constraints:
- Do not use embeddings as the final ranking score.
- Do not remove deterministic explanations.
- Keep this as an optional candidate expansion layer.
- Document storage and cost implications.

Return a summary of files changed, interfaces added, and implementation decisions still required.
```

---

# Cross-cutting design decisions

## Data and schema

- Should feature stats be calculated live or materialized in Supabase?
- Should recommendation results be stored, cached, or generated on demand?
- Should TMDb candidate metadata be stored permanently?
- Should model/config versions be persisted with recommendation outputs?
- Should recommendation dismissals or clicks be tracked as feedback?

## Product behaviour

- Should personal recommendations include already-watched films by default?
- Should public recommendations only include watched films?
- Should the public view show “not for everyone” or only accessible recommendations?
- Should visitors be able to filter by tag, mood, runtime, decade, or genre?
- Should explanations be short badges, longer prose, or expandable details?

## Model interpretation

- Which features are treated as selection affinity versus satisfaction predictors?
- How much should low ratings penalize pre-watch features?
- How should high-affinity/mixed-result categories be displayed?
- Should the model explicitly label recommendations as risky or uncertain?
- Should manual overrides always dominate model-inferred weights?

## Candidate generation

- Which candidate universe should V1 use?
  - TMDb similar/recommended from highly rated films
  - TMDb discover
  - watchlist
  - director filmographies
  - manually curated candidates
- Should TMDb popularity be used as a prior, a filter, or not at all?
- Should watch-provider availability be added later?

## ML operations

- Where should training happen?
- How often should models be retrained?
- Should model artifacts be stored in the repo, Supabase, or elsewhere?
- Should ML be optional and disabled by default?
- What evaluation threshold is required before ML affects production ranking?

---

# Recommended implementation order

## V1 recommended sequence

1. Finish tagging imported Letterboxd films.
2. Add tag audit and tag role metadata.
3. Add TMDb keyword enrichment.
4. Build deterministic taste-profile helpers.
5. Build private Taste Diagnostics UI.
6. Build public taste browser from watched films.
7. Build private deterministic personal recommender.
8. Add configuration and override tuning.

## V2 recommended sequence

1. Export ML-ready dataset using V1 feature outputs.
2. Train offline high-rating classifier.
3. Compare classifier against V1 baseline.
4. Integrate classifier predictions as optional hybrid score.
5. Prototype learning-to-rank.
6. Integrate ranker only if it beats classifier and V1 baseline.
7. Add embeddings for candidate expansion and natural-language search.

---

# Success criteria

## V1 success criteria

V1 is successful if:

- The taste diagnostics look intuitively sane.
- High-affinity/mixed-result categories are not misclassified as dislikes.
- Public taste modules are useful and grounded in watched films.
- Personal recommendations include clear reasons and cautions.
- The recommender can be tuned through configuration and overrides.
- The system remains understandable without ML.

## V2 success criteria

V2 is successful if:

- ML ranking beats deterministic V1 on time-based validation.
- ML improves recommendation ordering without degrading explanation quality.
- Hybrid mode has safe fallback to V1.
- The model handles selection bias better than naive rating prediction.
- The app can explain recommendations using grounded tags and metadata, even when ML contributes to ranking.

---

# Summary recommendation

The best path is:

```text
V1: deterministic, selection-aware taste profile and recommender.
V2: hybrid ML ranking layer using V1 outputs as features.
```

Do not jump straight to ML. The main risk is not lack of modelling sophistication; it is false inference from selected, noisy, and unevenly tagged data.

Once V1 produces a reliable taste profile, V2 can safely add machine learning to improve ranking, learn interactions, and expand candidates while preserving the app’s central value: a personal, explainable film diary that understands what I like and why.
