# Deploying `film-react` to Netlify

## 1) Create environment variables in the repository

1. Copy `.env.example` to `.env.local` for local development:

   ```bash
   cp .env.example .env.local
   ```

2. Update values in `.env.local` as needed:

   - `VITE_APP_TITLE`: Label shown in the app header.
   - `VITE_STORAGE_KEY_PREFIX`: Prefix for browser `localStorage` keys.
   - `VITE_PUBLIC_BASE_URL`: Full deployed site URL (for future share-link features).

> Keep `.env.local` uncommitted. Commit `.env.example` only.

## 2) Create environment variables in Netlify

In Netlify:

1. Open your site.
2. Go to **Site configuration → Environment variables**.
3. Add these keys for Production (and Preview/Branch deploys if desired):

| Key | Example value |
| --- | --- |
| `VITE_APP_TITLE` | `Film tracker` |
| `VITE_STORAGE_KEY_PREFIX` | `film-react-prod` |
| `VITE_PUBLIC_BASE_URL` | `https://your-site-name.netlify.app` |

## 3) Connect the repo and deploy

1. In Netlify, click **Add new site → Import an existing project**.
2. Connect your Git provider and select this repository.
3. Build settings should auto-detect from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Click **Deploy site**.

## 4) SPA routing support

This project uses React Router. `netlify.toml` includes a catch-all redirect so deep links like `/settings` and `/film/:filmId` load correctly.

## 5) Verify after deploy

- Open the site root URL.
- Navigate directly to deep routes (for example `/settings`) by pasting URLs in the browser.
- Confirm data saves and loads as expected in the browser.

## 6) Optional: local production check

```bash
npm ci
npm run build
npm run preview
```

Then open the preview URL and confirm routing and storage behavior.
