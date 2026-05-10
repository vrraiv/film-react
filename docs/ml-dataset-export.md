# V2 ML Dataset Export

The app can export a typed JSON dataset for offline Python model training. It does not train a model and does not change recommendation ranking.

## How to Run

1. Start the private app with Netlify functions:

   ```sh
   npm run dev:netlify
   ```

2. Sign in and open `/recommendations`.
3. Optionally generate V1 recommendations first. Those recommendation candidates will be included as `candidate` rows.
4. Set the validation fraction in the `ML dataset export` panel.
5. Click `Export ML dataset JSON`.

The downloaded file is `film-diary-ml-dataset-v1.json`.

## Row Types

- `logged`: watched diary films with observed ratings.
- `candidate`: current V1 recommendation candidates. These are marked as `unknown_unwatched_candidate` and `sampledNegativeOrUnknown: true`.

Candidate rows are not true dislikes. They are suitable for selection modelling as unknown/unwatched exposure candidates, not satisfaction negatives.

## Splitting

The app export still includes a legacy `split` field, but the offline ML module now creates its own explicit train/test split.

The notebook and CLI group logged rows by release decade and randomly sample the test rows within each decade. This avoids the previous newest-watch validation split and gives the test set coverage across release eras.

Candidate rows are assigned to `unwatched_pool` and excluded from the watched train/test label split.

Use `ml/notebooks/high_rating_train_test.ipynb` for the notebook workflow or `ml/train_high_rating_classifier.py` for the equivalent CLI workflow.

## Labels

Logged rows include:

- `ratingAtLeast4`
- `ratingAtLeast45`
- `normalizedRating`
- `watched: true`

Candidate rows include:

- `ratingAtLeast4: null`
- `ratingAtLeast45: null`
- `normalizedRating: null`
- `watched: false`
- `sampledNegativeOrUnknown: true`
