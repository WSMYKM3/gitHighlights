# GitHighlights

GitHighlights connects repository growth episodes to the Git changes that
preceded them. Enter a public GitHub repository to:

- reconstruct and normalize its cumulative star history;
- detect statistically unusual growth periods;
- inspect commits and releases in an adaptive pre-growth window;
- group evidence into capability, onboarding, API/CLI, architecture,
  performance, compatibility, documentation, distribution, and maintenance
  themes; and
- report likely enabling changes, possible contributors, coincident changes,
  or the absence of meaningful Git evidence without claiming proof of
  causality.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Validate

```bash
npm run build
npm run lint
node --test tests/*.test.mjs
```

## Data and optional enrichment

The app reads public repository metadata and Git evidence from the GitHub API
and star-history data from OSS Insight. Set `GITHUB_TOKEN` to raise GitHub API
rate limits. Set `OPENAI_API_KEY` to enable structured AI synthesis; without it,
the evidence report uses the built-in deterministic classifier.
