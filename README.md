# Film React

Personal film diary built with React, Vite, TypeScript, Supabase Auth, and Supabase Postgres.

## What this is

A personal film diary that doubles as a public showcase: reviews, a taste browser, viewing insights, and an experimental ML recommender. The owner uses signed-in pages to log films, tune the recommender, and import history; everyone else sees the curated public side.

Start with the canonical project docs: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the current route and data-flow map, [`docs/ROADMAP.md`](docs/ROADMAP.md) for active priorities, and [`docs/HANDOFF.md`](docs/HANDOFF.md) for recent implementation context.

## Project docs

The root and `docs/` layout is intentionally organized for maintainers and agents:

- [`AGENTS.md`](AGENTS.md): agent instructions and documentation-maintenance rules.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): current app structure, route map, and data boundaries.
- [`docs/ROADMAP.md`](docs/ROADMAP.md): active product, recommendation, and ML priorities.
- [`docs/DECISIONS.md`](docs/DECISIONS.md): architectural decision log.
- [`docs/HANDOFF.md`](docs/HANDOFF.md): recent work status and next-step context.
- [`docs/OPEN_QUESTIONS.md`](docs/OPEN_QUESTIONS.md): unresolved product and technical questions.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local`.

3. Fill in local values:

   ```bash
   VITE_APP_TITLE=Film tracker
   VITE_STORAGE_KEY_PREFIX=film-react
   VITE_PUBLIC_BASE_URL=http://localhost:5173
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

For frontend-only work, `npm run dev` starts the raw Vite server. TMDb lookup uses Netlify Functions, so use Netlify Dev when testing TMDb locally:

```bash
npm run dev:netlify
```

Open the Netlify Dev URL, usually `http://localhost:8888`, not the raw Vite URL. Keep `TMDB_READ_ACCESS_TOKEN` server-side only; the TMDb Netlify Functions read it from `process.env.TMDB_READ_ACCESS_TOKEN`.

Do not put a Supabase service role key in this app. Vite exposes `VITE_*` variables to browser code, so the frontend must use only the anon/public Supabase key.

## Supabase setup

1. Create a Supabase project.
2. Run the SQL migration in `supabase/migrations/001_initial_schema.sql` using the Supabase SQL Editor, or run it with the Supabase CLI:

   ```bash
   supabase link --project-ref your-project-ref
   supabase db push
   ```

3. In Supabase Auth settings, enable the Email provider with password sign-in.
4. Configure session persistence in Supabase Auth settings:
   - Keep refresh token rotation enabled.
   - Set a reasonable session time-box such as 30 days if you want users to re-authenticate after that period on the same device.
   - The frontend explicitly enables Supabase `persistSession` and `autoRefreshToken`, so sessions survive browser restarts until Supabase expires or revokes the session.
5. Configure auth URLs:
   - Site URL: your Netlify production URL, for example `https://your-site-name.netlify.app`
   - Additional Redirect URLs:
     - `http://localhost:5173/log`
     - `https://your-site-name.netlify.app/log`

The app uses Supabase email/password auth. Redirect URLs are still useful for auth flows and future email actions such as password recovery.

## Netlify setup

Build settings are in `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Add these Netlify environment variables under Site configuration > Environment variables:

| Key | Required | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key only. Never use the service role key. |
| `VITE_PUBLIC_BASE_URL` | Yes | Netlify production URL, used for auth redirects. |
| `VITE_APP_TITLE` | No | Header title. |
| `VITE_STORAGE_KEY_PREFIX` | No | Browser localStorage key prefix. |
| `TMDB_READ_ACCESS_TOKEN` | Yes (for TMDb lookups) | Server-side token used by Netlify Functions only. Do not prefix with `VITE_`. |

Set `VITE_PUBLIC_BASE_URL` to the exact production origin, without a trailing slash, for example:

```bash
VITE_PUBLIC_BASE_URL=https://your-site-name.netlify.app
```

## Checks

```bash
npm run build
```

The app requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at build/runtime and fails clearly if they are missing.
