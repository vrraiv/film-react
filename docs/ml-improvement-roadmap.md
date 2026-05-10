# ML Improvement Roadmap

The current offline ML prototype is useful mainly as a measurement harness. On
the latest 265-row export, V1 still beats the standard-library logistic
baseline on several ranking metrics, especially strong-rating prediction. That
is a good default: ML should earn its way into the recommender by beating V1 on
held-out data, not by replacing the explainable engine prematurely.

This document lays out practical paths to evaluate before integrating ML scores
into production ranking.

## Current Baseline

Workflow:

- Dataset: `local/film-diary-ml-dataset-v1.json`
- Split: random train/test split stratified by release decade
- Train rows: 212
- Test rows: 53
- Model: standard-library logistic regression
- Targets:
  - `ratingAtLeast4` as high-rating probability
  - `ratingAtLeast45` as strong-rating probability
- Baseline comparison: V1 `v1Scores.satisfactionScore`

Current reading:

- V1 is a strong baseline because it already encodes domain-specific taste
  features, residual-style scoring, and known recommendation heuristics.
- The ML model is small, sparse, and trained on only a few hundred logged rows.
- The strong-rating target is especially data-limited.

## Success Criteria

Do not ship ML into ranking until it clears all of these:

- Beats V1 on `ndcgAt10` or `ndcgAt25` for `ratingAtLeast4`.
- Does not materially underperform V1 on `ratingAtLeast45`.
- Shows plausible calibration: higher probability buckets should have higher
  observed positive rates.
- Is stable across at least 20 random decade-stratified split seeds.
- Produces interpretable top features that match recognizable taste patterns.

## Evaluation Upgrades

### 1. Multi-Seed Decade-Stratified Testing

One random split can be noisy. Add an evaluation loop over many seeds:

- Run seeds `1..50`.
- Aggregate mean and standard deviation for NDCG, Precision, Recall, and
  calibration error.
- Compare ML, V1, and blended V1+ML scores.

Decision rule:

- Treat ML as promising only if its mean beats V1 and the gain is larger than
  the split-to-split variance.

### 2. Separate Eras and Recent Taste

The decade split gives broad release-era coverage, but taste can drift over
watching time. Add a second evaluation view:

- Keep the current release-decade split for era robustness.
- Add watched-date holdout for recent-taste realism.
- Report both, because they answer different questions.

Decision rule:

- If ML only wins one split type, use it as an analysis tool rather than a
  production ranking signal.

### 3. Add Per-Decade Metrics

Overall NDCG can hide bad era-specific behavior. Report metrics by release
decade:

- 1990s
- 2000s
- 2010s
- 2020s

Decision rule:

- Avoid ML integration if it wins overall by overfitting the largest decade but
  degrades smaller eras.

## Feature Improvements

### 4. Add First-Watch and Recency Features

The newly repaired first-watch data is likely valuable. Add:

- `first_watch_true`
- `first_watch_false`
- `first_watch_unknown`
- `watched_year`
- `watched_month`
- `release_to_watch_days`
- `watched_within_release_year`

Hypothesis:

- First watches and near-release watches may correlate with intentionality,
  festival/zeitgeist effects, and higher-confidence ratings.

### 5. Use Release Decade as a Feature

The split is stratified by release decade, but the model should also know the
release decade:

- `release_decade=1990s`
- `release_decade=2000s`
- `release_decade=2010s`
- `release_decade=2020s`

Hypothesis:

- Taste patterns may differ by era, and year-scaled numeric features may be too
  weak or too linear.

### 6. Improve Sparse Feature Controls

Current one-hot tags, cast, director, writer, keyword, and country features can
be too sparse.

Evaluate:

- Minimum feature count thresholds.
- Hashing low-frequency features into controlled buckets.
- Dropping cast entirely for small-data models.
- Keeping director/writer but requiring at least two appearances.

Hypothesis:

- Strong-rating prediction may be hurt by single-film sparse features that act
  like memorization rather than reusable taste signals.

### 7. Add V1 Explanation Features More Directly

The export includes feature classifications, but the baseline could use higher
level counts:

- Count of `high_interest_high_satisfaction` features.
- Count of `high_interest_mixed_results` features.
- Max/mean V1 affinity among matched features.
- Max/mean V1 risk among matched features.
- Number of matched positive tags versus cautious tags.

Hypothesis:

- A compact summary of V1 reasoning may outperform many sparse raw features.

## Target Improvements

### 8. Train on Normalized Rating Regression

Binary labels throw away useful signal between 3.5, 4.0, 4.5, and 5.0.

Evaluate:

- Train a simple linear or logistic-style regression on `normalizedRating`.
- Use predicted rating as a ranking score.
- Compare against binary high-rating models.

Decision rule:

- Prefer regression if it improves NDCG without worse top-K precision.

### 9. Pairwise Preference Training

Ranking is the real goal, not calibrated classification. Build pairwise examples:

- Positive item: higher-rated film.
- Negative item: lower-rated film.
- Pair only within rough comparable contexts, such as same decade or similar
  watch period.

Evaluate:

- Pairwise logistic model over feature differences.
- Rank test rows by learned preference score.

Hypothesis:

- Pairwise training may handle personal taste better than absolute labels,
  especially with a small dataset.

### 10. Treat Strong Ratings as a Reranker

The `ratingAtLeast45` target is sparse. Instead of a standalone ranker:

- Use high-rating probability for broad ordering.
- Use strong-rating probability only as a small reranking boost.
- Require high confidence before applying the strong-rating signal.

Decision rule:

- Strong-rating ML should not be a primary score until it beats V1 reliably.

## Model Improvements

### 11. Add a Hybrid Score Sweep

The first likely production path is not pure ML. Evaluate:

```text
hybrid_score = (1 - alpha) * v1_satisfaction + alpha * ml_probability
```

Sweep:

- `alpha = 0.0, 0.05, 0.10, ..., 0.50`

Decision rule:

- Only consider alpha values that beat V1 across mean multi-seed NDCG.
- Prefer the smallest alpha that produces a stable lift.

### 12. Try Tree-Based Models Later

Once the notebook workflow is stable, evaluate:

- scikit-learn `HistGradientBoostingClassifier`
- random forest
- gradient boosting with shallow depth

Keep this secondary. The main current risk is data scarcity and target design,
not lack of model complexity.

### 13. Calibrate Probabilities

The current calibration buckets are rough. If ML is used as a score:

- Add Platt scaling or isotonic calibration when scikit-learn is available.
- Track Brier score and expected calibration error.

Decision rule:

- Badly calibrated ML can still rank well, but it should not be displayed as a
  literal probability.

## Data Improvements

### 14. Export Release Date and First-Watch Fields

The app has better `release_date` and `firstWatch` data now. Export them into
the ML JSON directly rather than reconstructing from metadata.

Add fields:

- `releaseDate`
- `releaseDecade`
- `firstWatch`
- `releaseToWatchDays`

### 15. Export Explicit Candidate Rows

The latest dataset has no candidate rows. For recommendation evaluation and
future ranking, export candidates after generating V1 recommendations.

Important:

- Candidate rows are unknown/unwatched, not negative labels.
- Use them for scoring and inspection, not supervised training as dislikes.

### 16. Add Review Text Features Later

Notes and reviews may contain strong preference signals. Add only after the
structured model is stable:

- simple keyword counts
- sentiment-ish handcrafted flags
- no embeddings as the first step

## Proposed Work Plan

1. Add first-watch, release-date, and release-decade fields to the ML export.
2. Add feature functions for first-watch, release timing, and release decade.
3. Add multi-seed evaluation and aggregate metrics.
4. Add hybrid alpha sweep against V1.
5. Add per-decade metrics.
6. Try normalized-rating regression.
7. Try pairwise preference ranking.
8. Only then evaluate third-party model libraries.

## Near-Term Recommendation

The next implementation slice should be evaluation infrastructure, not a more
complex model. Add multi-seed testing plus a V1/ML hybrid sweep first. That will
show whether ML has any stable signal beyond V1 before spending time on model
complexity.
