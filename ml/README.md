# Local ML Prototype

This directory is isolated from the React/Vite app runtime. It trains and tests
offline high-rating classifiers from the JSON dataset exported by the app.

The prototype uses a small standard-library logistic regression baseline. That
keeps the feature pipeline inspectable and avoids compiled Python dependencies
while your local environment is on Python 3.14. Gradient boosted models or
scikit-learn can be tested later after compatible wheels are available.

The reusable ML modules live in `ml/film_ml/`. The notebook and CLI both call
those modules, so there is one implementation path for splitting, training,
testing, metrics, and prediction export.

See `docs/ml-improvement-roadmap.md` for the evaluation and modelling paths to
explore before using ML in production ranking.

## Input

Default dataset path:

```sh
local/film-diary-ml-dataset-v1.json
```

The app export should contain logged rows with observed labels. If V1
recommendations were generated before export, candidate rows are also included
and are treated as unknown/unwatched rows, not dislikes.

## Setup

Create a Python environment. The current baseline has no third-party runtime
dependencies, but the requirements file is kept as a placeholder for future
model packages.

```sh
python -m venv ml/.venv
ml/.venv/Scripts/python -m pip install -r ml/requirements.txt
```

On macOS/Linux:

```sh
python3 -m venv ml/.venv
ml/.venv/bin/python -m pip install -r ml/requirements.txt
```

## Notebook Workflow

Open:

```text
ml/notebooks/high_rating_train_test.ipynb
```

If your editor does not already provide a Jupyter kernel, install one into the
ML venv:

```sh
ml/.venv/Scripts/python -m pip install notebook ipykernel
ml/.venv/Scripts/python -m notebook ml/notebooks/high_rating_train_test.ipynb
```

The notebook:

- loads `local/film-diary-ml-dataset-v1.json`
- creates an explicit random train/test split stratified by release decade
- trains the high-rating and strong-rating classifiers
- compares ML ranking against the V1 satisfaction-score baseline
- writes `metrics.json`, `predictions.json`, and model artifacts to `ml/outputs/`

## CLI Workflow

```sh
ml/.venv/Scripts/python ml/train_high_rating_classifier.py
```

With an explicit dataset path:

```sh
ml/.venv/Scripts/python ml/train_high_rating_classifier.py --dataset local/film-diary-ml-dataset-v1.json
```

Outputs are written to `ml/outputs/`:

- `metrics.json`: Precision@K, Recall@K, HitRate@K, NDCG@K, calibration buckets, and V1 baseline comparisons.
- `predictions.json`: app-consumable prediction rows.
- `*_high_rating_stdlib_logreg_v0.3.0.json`: trained model artifacts.

## Targets

The script trains:

- `ratingAtLeast4` as `mlHighRatingProbability`
- `ratingAtLeast45` as `mlStrongRatingProbability`, only if enough positive and negative examples exist

The default minimum class count is 12 and can be changed:

```sh
ml/.venv/Scripts/python ml/train_high_rating_classifier.py --min-class-count 8
```

## Train/Test Split

The trainer now ignores the app export's older `train`/`validation` labels for
logged rows. It creates its own train/test split from watched rows by grouping
films by release decade and randomly sampling a test subset within each decade.
Single-row decade groups stay in training so no tiny group is completely held
out.

Candidate rows are assigned predictions but are not used as training labels.

The default test fraction is `0.2`; the default random seed is `42`.

```sh
ml/.venv/Scripts/python ml/train_high_rating_classifier.py --test-fraction 0.25 --random-state 7
```

## Baseline Comparison

The V1 deterministic baseline ranks test rows by
`v1Scores.satisfactionScore`. The ML model is evaluated against that ranking
using:

- Precision@K
- Recall@K
- HitRate@K
- NDCG@K
- probability calibration buckets

## Prediction Format

`predictions.json` contains:

```json
{
  "modelVersion": "high_rating_stdlib_logreg_v0.3.0",
  "sourceDataset": "local/film-diary-ml-dataset-v1.json",
  "predictions": [
    {
      "movieId": "...",
      "tmdbId": 123,
      "title": "Movie title",
      "rowKind": "candidate",
      "split": "unwatched_pool",
      "modelVersion": "high_rating_stdlib_logreg_v0.3.0",
      "mlHighRatingProbability": 0.72,
      "mlStrongRatingProbability": 0.31
    }
  ]
}
```

## Troubleshooting

If `pip install scikit-learn` tries to compile from source on Windows and fails
with a missing compiler, your Python version likely does not have a compatible
prebuilt wheel yet. This baseline intentionally avoids scikit-learn for that
reason. Run the trainer with the venv Python directly:

```sh
ml/.venv/Scripts/python ml/train_high_rating_classifier.py
```
