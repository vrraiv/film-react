# Open Questions

Track unresolved product, architecture, and workflow questions here. Move questions out of this file once they are answered and, if the answer is architectural, record the decision in `docs/DECISIONS.md`.

## Product and UX

1. Should `/v/:userId` remain a supported public profile route, redirect to the landing page, or be removed after the public diary routes stabilize?
2. During settings consolidation, should existing settings/admin URLs remain as deep links, redirects, or compatibility routes?
3. Should the public recommendations preview expose any additional controls, or should it remain intentionally minimal?

## Data and ML

1. What is the minimum evaluation threshold for allowing an ML score to influence production recommendation ranking?
2. Should candidate recommendation rows in the ML export be treated only as unknown exposure data, or should a later workflow collect explicit negative feedback?
3. How should first-watch inference handle festival, limited-release, or non-US release dates that may predate the TMDb release date used by the app?

## Operations

1. Which routes should be included in regular manual smoke testing before deploys?
2. Should Netlify function error telemetry be added for TMDb failures and recommendation generation failures?
