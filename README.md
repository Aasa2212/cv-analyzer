# CV Analyzer & Job Finder

A real, working resume-scoring tool: upload a PDF/DOCX/TXT resume, get a
genuine rule-based ATS score with a breakdown, issues, and suggestions —
then search live job listings matched to your profile.

No fake data. No AI API costs. Runs entirely on deterministic rules +
one free job-search API.

## What's real here

- **PDF/DOCX/TXT parsing** — actual text extraction (`pdf-parse`, `mammoth`), not a mock.
- **ATS scoring engine** (`lib/scoring.ts`) — checks contact info, section structure,
  quantified achievements, impact verbs, bullet usage, word count, and keyword density.
  Fully deterministic, free to run, no per-use cost.
- **Live job search** (`app/api/jobs/route.ts`) — pulls real listings from the
  [Adzuna API](https://developer.adzuna.com) (free tier, instant signup, no credit card).

## Run it locally

```bash
npm install
cp .env.example .env.local
# fill in ADZUNA_APP_ID and ADZUNA_APP_KEY (free at developer.adzuna.com)
npm run dev
```

Open http://localhost:3000

## Deploy (free)

1. Push this folder to a GitHub repo.
2. Go to [vercel.com](https://vercel.com) → New Project → import the repo.
3. Add environment variables `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` in the
   Vercel project settings.
4. Deploy. You get a live URL in ~1 minute.

Vercel's free tier comfortably handles this — no server to manage.

## Tune the scoring rules

Everything scoring-related lives in `lib/scoring.ts` — it's plain, readable
TypeScript, not a black box:
- `DATA_KEYWORDS` — swap in keywords for a different domain (e.g. marketing,
  finance, software engineering) to resell as a niche tool.
- `IMPACT_VERBS`, section header list, word-count sweet spot — all easy to adjust.
- Point weights (contact 15 / structure 25 / content 30 / formatting 20 / keywords 10)
  sum to 100 — rebalance as you like.

## Selling this

Ideas that don't require extra engineering:
- **Niche it.** Fork the keyword list for "Marketing Resume Analyzer" or
  "Software Engineer Resume Analyzer" and sell each as a separate small tool.
- **Gumroad / Lemon Squeezy template sale** — sell the codebase itself as a
  buildable template to other students/freelancers.
- **Add a paywall later** — the codebase intentionally has no auth/payments
  yet (kept minimal per request). When you're ready, Stripe Checkout + a
  simple usage-count cookie or NextAuth login is the natural next step —
  ask and I'll wire it in.

## Notes on the job search API

Adzuna's free tier gives you 250 calls/day per app, covers India, US, UK,
and 15+ other countries, and needs no credit card — good enough to launch on.
If you outgrow it, alternatives are Jooble API and the (paid) LinkedIn Jobs API.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS · pdf-parse · mammoth
