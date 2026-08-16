# Roadmap — what's real vs what's next

This build is a genuinely working Phase 1 core, not a mockup — the scoring/trend engine is
unit-tested, the API endpoints are real, the frontend calls them for real data. But the
original brief has 58 sections and describes a multi-week production system. This table is
the honest map of where every section actually stands, so nothing is silently missing
(in the same spirit as the brief's own Req #47 — never present something as more finished
than it is).

**Legend:** Done = built & wired end-to-end · Scaffolded = real code, not fully wired/tested · Not started

| # | Requirement | Status | Notes |
|---|---|---|---|
| 1 | Core goal / "will rise" framing | Done | Drives the whole FOS + dual-score design |
| 2 | Investigate official Shopee APIs first | Done | `docs/API_RESEARCH.md` |
| 3 | Modular fallback provider architecture | Done | `ProviderRegistry` + per-provider enable flags |
| 4 | Future Opportunity Score, configurable weights | Done | `engine/scoringEngine.ts`, tested. Weights are a TS constant + DB table (`scoring_weight_profiles`) exists, but there's no admin UI yet to edit them live — scaffolded for the "admin-tunable" half |
| 5 | Current Popularity vs Future Potential | Done | `computeDualScore`, tested against the spec's own example |
| 6 | Trend Momentum Engine | Done | `engine/trendMomentum.ts` — growth rate, velocity, acceleration, EMA, slope, volatility, breakout/spike, persistence. Tested |
| 7 | Trend Stage Classification (10 stages) | Done | `engine/trendStage.ts`, tested |
| 8 | Early Signal detection | Done | `engine/earlySignal.ts`, tested |
| 9 | News Intelligence Engine + NLP extraction | Scaffolded | `NewsProvider` + `collectNews.job.ts` collect/store articles; there's no NLP keyword/entity/sentiment extraction step yet — articles are stored with keyword tags equal to the search term, not extracted |
| 10 | Trend Discovery Engine (category expansion, embeddings) | Not started | Currently a static `TRACKED_KEYWORDS` list. Semantic expansion/clustering not built |
| 11 | Product Matching Engine | Scaffolded | `collectAndScoreOne` matches one offer per keyword; multi-candidate ranking (rating/seller quality/freshness) not built |
| 12 | Competition Analysis | Done | `engine/priceCompetition.ts::computeCompetition`, tested |
| 13 | Price Psychology / sweet spot | Done | `engine/priceCompetition.ts::findPriceSweetSpot`, tested — not yet fed by real affiliate conversion data (falls back to the documented heuristic band) |
| 14 | Hashtag Intelligence | Not started | `hashtags` table exists in schema; no collection/scoring logic built |
| 15 | Content Intelligence (hook/angle/CTA per product) | Not started | Not built |
| 16 | Viral Content Pattern Analysis | Not started | Not built |
| 17 | AI Content Generator | Not started | Not built |
| 18 | Trend Radar page, auto-updating | Done | `/radar` route + `RadarScope` component, polls every 60s |
| 19 | "What should I promote today?" | Done | `/promote-today` route + page |
| 20 | Multi-horizon prediction (3/7/14/30d) | Done | `engine/explainability.ts::predictHorizons`, tested; stored via `runPredictions.job.ts` |
| 21 | Seasonal Intelligence + admin-editable calendar | Scaffolded | `seasonal_events` table exists; scoring currently uses a flat placeholder (`seasonalDemand: 50`), not yet joined to the calendar |
| 22 | Watchlist | Done | `/watchlist` routes + page |
| 23 | Alert System | Scaffolded | `alerts` table exists; no job writes to it and no delivery mechanism (push/email) yet |
| 24-26 | Dashboard, KPIs, global search | Done | `/`, `/search` |
| 27 | Explainable AI (concrete reasons + confidence) | Done | `engine/explainability.ts::explainScore`, tested |
| 28 | ML architecture (feature store to prediction to backtesting) | Scaffolded | Pipeline shape exists (`product_scores` acts as a feature/score store, `predictions` stores forecasts); no actual ML model — scoring is a transparent weighted formula by design (matches Req #27's explainability requirement) |
| 29 | Backtesting / prediction accuracy page | Not started | `predictions` + `prediction_results` tables exist; nothing yet evaluates predicted vs actual and no UI page |
| 30 | Data quality metadata (source/timestamp/confidence/freshness) | Done | Every `DataPoint`/`ProviderResult` carries this; stored on `trend_history`, `products`, `news_articles` |
| 31 | Database schema | Done | `database/schema.sql`, all listed tables present |
| 32 | Backend structure | Done | `backend/src/{controllers to routes, services, repositories to db/repositories, providers, jobs, routes, models to types, config}` |
| 33 | Scheduled collection, differentiated intervals | Done | `jobs/scheduler.ts` |
| 34 | Rate limit / retry / circuit breaker / no bypassing platform security | Done | `providers/reliability.ts`; explicitly never scrapes or bypasses auth (see `docs/API_RESEARCH.md`) |
| 35 | No view/click fraud or bot traffic manipulation | Done (by omission) | Not implemented anywhere, as instructed |
| 36 | Affiliate performance tracking (clicks/CTR/orders/EPC) | Scaffolded | `affiliate_performance` table exists; no route/job populates or reads it yet |
| 37 | Daily recommendation categories (hot/early/low-competition/etc icons) | Scaffolded | The underlying data (stage, score, competition) exists; the categorized UI labels aren't built as a distinct view yet — `/promote-today` covers the "top opportunities" case |
| 38 | UI/UX (React/TS/Tailwind, dark mode, etc.) | Done | Built — see design notes in README. Only dark mode exists (no light mode toggle) |
| 39 | Authentication | Done | Register/login/logout, JWT, bcrypt |
| 40 | Admin panel | Not started | `role: 'ADMIN'` exists on users + `requireAdmin` middleware, but no admin-only routes/pages built yet |
| 41 | API Health Monitor | Done | `/health` route + page |
| 42 | Security (helmet, CORS, rate limit, hashed passwords, server-side secrets) | Done | `app.ts`; Shopee credentials never touch the frontend |
| 43 | Centralized logging | Scaffolded | Structured `console.log`/`console.error` with job/provider tags; no log aggregation service wired |
| 44 | Error isolation (one provider failing does not mean app down) | Done | Circuit breakers, try/catch fallback chains, global Express error handler |
| 45 | Export (CSV/Excel/PDF/JSON) | Not started | Not built |
| 46 | Daily Trend Report generator | Not started | Not built |
| 47 | Never fabricate data; label demo/estimated/unavailable | Done | `is_demo_data` + `confidence` fields threaded through every layer, DEMO badges in UI |
| 48 | Data source transparency per metric | Done | Same fields as above, plus `/health` |
| 49 | Project structure | Done | `frontend/ backend/ database/ scripts/ docs/ tests/` |
| 50 | Testing (unit/integration/E2E) | Scaffolded | Engine unit tests exist and pass (`tests/engine/validate-engine.ts`). No integration/API/E2E tests yet — would need Vitest/Supertest/Playwright installed |
| 51 | Docker | Done | `docker-compose.yml`, backend + frontend Dockerfiles |
| 52 | `.env.example` | Done | Repo root |
| 53 | Deployment guide | Scaffolded | See `docs/DEPLOYMENT.md` — covers the realistic path (Docker VPS / Railway); Render/Vercel/Supabase/Cloudflare notes included but not individually verified |
| 54 | Full working code, not just design | Done | This build |
| 55 | API research before coding | Done | `docs/API_RESEARCH.md`, done first |
| 56 | Demo Data Mode | Done | `DemoDataProvider` + `scripts/seed.ts`, everything tagged |
| 57 | First-run dashboard content | Done | Once seeded |
| 58 | Product detail page | Done | `/products/:id` |

## Suggested next milestones, in priority order

1. **Backtesting loop (Req #29)** — a job that compares `predictions` against the actual
   `future_potential` once the target date arrives, writes `prediction_results`, and a page
   showing 7d/14d accuracy. This is the credibility feature — without it, the product is
   just making claims about the future with no way to check itself.
2. **Admin panel (Req #40)** — scoring weight editor (the table already exists), provider
   toggle UI, seasonal calendar editor.
3. **NLP keyword/entity extraction on collected news (Req #9)** — turns raw articles into
   actual product/brand signals instead of just "keyword mentioned."
4. **Hashtag + Content Intelligence (Req #14-17)** — the biggest remaining chunk of net-new
   product surface.
5. **Export + Daily Report (Req #45-46)** — comparatively small once the data model is this
   far along.
