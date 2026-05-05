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

Logged rows are sorted by watched date ascending. Older watched films are assigned to `train`; the newest fraction is assigned to `validation`.

Candidate rows are assigned to `unwatched_pool` and excluded from the watched train/validation label split.

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
