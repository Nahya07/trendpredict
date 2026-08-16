Deployment guide
Recommended: Docker VPS (most realistic for this stack)
The app is three containers (Postgres, backend, frontend) plus Redis, already wired in docker-compose.yml. Any VPS with Docker installed (e.g. a $6-12/mo box) can run:
git clone <your-repo>
cd trendpredict
cp .env.example .env   # fill in real values, or leave blank for demo mode
docker compose up -d --build
docker compose exec backend npm run migrate
docker compose exec backend npm run seed   # optional, populates demo data
Put a reverse proxy (Caddy or nginx) in front for TLS. Caddy example:
trendpredict.yourdomain.com {
  reverse_proxy localhost:8080
}
This is the path we'd actually recommend first — it matches the docker-compose setup exactly, with no platform-specific translation needed.
Railway
Railway can run docker-compose-shaped projects directly, or as three separate services:
Add a Postgres plugin (gives you a DATABASE_URL automatically).
Add a Redis plugin.
Deploy backend/ as a service (Dockerfile-based), set env vars from .env.example.
Deploy frontend/ as a static site (npm run build, serve dist/), or as a second Dockerfile service using frontend/Dockerfile.
Point the frontend's API calls at the backend's Railway-assigned domain (update CORS_ORIGIN on the backend and the /api proxy target on the frontend build).
Render
Similar shape to Railway: a "Web Service" for the backend (Docker or Node runtime), a managed Postgres instance, a managed Redis instance, and a "Static Site" for the frontend (npm run build, publish frontend/dist). Set the same env vars as .env.example.
Vercel (Services) — frontend + backend together
Vercel Services (GA since June 30, 2026) lets one Vercel project run the Vite frontend and the Express backend as two services on one domain, routed by the root vercel.json:
{
  "services": {
    "frontend": { "root": "frontend", "framework": "vite" },
    "backend": { "root": "backend", "framework": "express", "entrypoint": "src/server.ts" }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": { "service": "backend" } },
    { "source": "/(.*)", "destination": { "service": "frontend" } }
  ]
}
This file is already committed at the repo root — it's what was missing when the deploy failed with "vercel.json required to deploy projects with multiple services." Steps:
In the Vercel dashboard, import the repo with Application Preset: Services (the import wizard auto-detects frontend as Vite and backend as Express once vercel.json is present).
Set backend environment variables in Project Settings → Environment Variables: DATABASE_URL (a managed Postgres — Vercel Postgres, Supabase, or Neon all work; this is the same database/schema.sql schema, npm run migrate against it once from your own machine), JWT_SECRET, and any provider credentials you want enabled (SHOPEE_API_ENABLED, etc. — all default to demo mode if left unset). REDIS_URL is optional; nothing in the codebase uses Redis yet.
Deploy. The backend's src/server.ts entrypoint is used directly — Vercel's Node.js runtime runs TypeScript server entrypoints natively, so no separate build step is required for the backend service on Vercel (the npm run build/dist/ path is still used for the Docker/VPS image, untouched).
Because requests to /api/* are rewritten to the backend on the same domain, this is same-origin from the browser's perspective — no CORS configuration is needed for the deployed app itself (the existing CORS_ORIGIN env var still matters for local dev, where the Vite dev server on :5173 talks to the backend on :4000 across origins).
Scheduler on Vercel
The in-process node-cron scheduler (jobs/scheduler.ts) is built for a single long-running process, which fits Docker/VPS but not Vercel's Fluid compute (instances can cold-start, scale to zero, or run multiple concurrent instances). server.ts detects the Vercel runtime (process.env.VERCEL) and skips starting it there — the scheduler is untouched and still runs normally on Docker/VPS. To get the same jobs running on Vercel, the supported pattern is Vercel Cron Jobs: add a protected HTTP route that calls the relevant job function (they're already isolated, exported functions in backend/src/jobs/) and a crons entry in vercel.json pointing at it. This isn't wired up in this build — treat it as the next step if you deploy the scheduled-collection features to Vercel; until then, npm run seed (run once, manually, against your managed Postgres) is enough to get a populated demo dataset live.
Vercel (frontend only, legacy path)
If you'd rather not run the backend on Vercel at all, deploy frontend/ alone (static Vite build) and point it at a backend hosted elsewhere (Railway/Render/VPS below). Set VITE_API_PROXY_TARGET at build time or add a plain vercel.json rewrite pointing /api/* at your backend's public URL, without a services key.
Supabase (as the Postgres provider)
You can swap the postgres container for a Supabase Postgres instance: set DATABASE_URL to Supabase's connection string and run npm run migrate once against it. Supabase's own Auth/Realtime features aren't used here since the app already has its own JWT auth — this is purely "use Supabase as managed Postgres."
Cloudflare (frontend + edge)
Cloudflare Pages can serve the built frontend (frontend/dist) with the same "point /api at your backend" approach as Vercel. Cloudflare doesn't run the Node backend or Postgres — pair it with a VPS/Railway/Render backend.
Notes that apply everywhere
Run npm run migrate once per fresh database (applies database/schema.sql).
npm run seed is optional and always safe — it only writes rows tagged is_demo_data = true, so it never contaminates real data once you connect real providers.
Set SHOPEE_API_ENABLED=true (plus App ID/Secret) only once you have real Affiliate Open API credentials — leaving it false keeps the app fully functional on demo data.
