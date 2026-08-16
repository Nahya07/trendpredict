# TrendPredict — Shopee Future Product Intelligence

Membantu affiliate Shopee menemukan produk yang **akan** laris (3-14 hari ke depan), bukan
sekadar yang sudah viral sekarang. Full-stack: React/TS frontend, Node/TS+Express backend,
PostgreSQL, Redis, job scheduler.

**Status:** Phase-1 core is real and working end-to-end — the prediction engine is unit
tested, the API is wired to Postgres, the frontend calls real endpoints. It is **not** the
full 58-section spec (that's a multi-week build). See `docs/ROADMAP.md` for an honest,
section-by-section status of every original requirement.

## Quick start (demo mode, no API keys needed)

```bash
# 1. Start Postgres + Redis
docker compose up -d postgres redis

# 2. Backend
cd backend
npm install
cp ../.env.example ../.env   # defaults work as-is for demo mode
npm run migrate              # applies database/schema.sql
npm run seed                 # populates labeled DEMO DATA
npm run dev                  # http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

Open http://localhost:5173 — register an account, or just browse the Dashboard/Trend Radar,
which are public. Every demo-sourced number carries a visible "Demo" badge (Req #47/#56) —
this build never lets synthetic data pass as real Shopee data.

### Run the engine tests

The prediction engine (momentum, trend stage, scoring, explainability) has zero runtime
dependencies and is verified independently of the rest of the stack:

```bash
npx tsx tests/engine/validate-engine.ts
```

### Full Docker stack

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec backend npm run migrate
docker compose exec backend npm run seed
```

Frontend at `http://localhost:8080`, backend at `http://localhost:4000`.

## Connecting real data

Everything works with zero credentials (Demo Data Mode). To connect real sources, edit
`.env`:

- **Shopee Affiliate Open API** — set `SHOPEE_API_ENABLED=true` plus your App ID/Secret.
  See `docs/API_RESEARCH.md` for exactly what this API does and doesn't cover.
- **Google Trends / News / Social** — each has its own `*_ENABLED` flag and credential set;
  all default to `false` and fall back to demo data cleanly.

## Project structure

```
trendpredict/
├── backend/       Express API, providers, scoring engine, scheduled jobs
├── frontend/      React + Vite + Tailwind dashboard
├── database/      PostgreSQL schema
├── scripts/       seed.ts — populates demo data
├── tests/engine/  standalone engine correctness tests (no deps)
└── docs/          API research, roadmap, deployment guide
```

## Design notes

The UI direction is a "night radar scope" — the whole product is about detecting faint
early signals before they're obvious, so the Trend Radar page's signature element is an
actual radar-style scope (concentric rings + sweep animation) where a product's distance
to center encodes *future potential*, not just another bar chart. Type system: Space
Grotesk for display, Inter for body text, IBM Plex Mono for every numeric readout (scores,
percentages, prices) — numbers are treated as instrument data, distinct from prose.

## Docs

- `docs/API_RESEARCH.md` — what's real about the Shopee Affiliate API vs what needed
  fallback providers, investigated before any code was written.
- `docs/ROADMAP.md` — every one of the original 58 requirements, mapped to Done /
  Scaffolded / Not started, with concrete next steps.
- `docs/DEPLOYMENT.md` — Docker VPS, Railway, Render, Vercel, Supabase, Cloudflare.
