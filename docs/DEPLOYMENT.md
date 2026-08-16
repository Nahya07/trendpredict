# Deployment guide

## Recommended: Docker VPS (most realistic for this stack)

The app is three containers (Postgres, backend, frontend) plus Redis, already wired in
`docker-compose.yml`. Any VPS with Docker installed (e.g. a $6-12/mo box) can run:

```bash
git clone <your-repo>
cd trendpredict
cp .env.example .env   # fill in real values, or leave blank for demo mode
docker compose up -d --build
docker compose exec backend npm run migrate
docker compose exec backend npm run seed   # optional, populates demo data
```

Put a reverse proxy (Caddy or nginx) in front for TLS. Caddy example:

```
trendpredict.yourdomain.com {
  reverse_proxy localhost:8080
}
```

This is the path we'd actually recommend first — it matches the docker-compose setup
exactly, with no platform-specific translation needed.

## Railway

Railway can run docker-compose-shaped projects directly, or as three separate services:
1. Add a Postgres plugin (gives you a `DATABASE_URL` automatically).
2. Add a Redis plugin.
3. Deploy `backend/` as a service (Dockerfile-based), set env vars from `.env.example`.
4. Deploy `frontend/` as a static site (`npm run build`, serve `dist/`), or as a second
   Dockerfile service using `frontend/Dockerfile`.
5. Point the frontend's API calls at the backend's Railway-assigned domain (update
   `CORS_ORIGIN` on the backend and the `/api` proxy target on the frontend build).

## Render

Similar shape to Railway: a "Web Service" for the backend (Docker or Node runtime), a
managed Postgres instance, a managed Redis instance, and a "Static Site" for the frontend
(`npm run build`, publish `frontend/dist`). Set the same env vars as `.env.example`.

## Vercel (frontend only)

Vercel is a good fit for `frontend/` alone (static Vite build) if you're running the
backend elsewhere (Railway/Render/VPS). Set `VITE_API_PROXY_TARGET` at build time or add a
`vercel.json` rewrite rule pointing `/api/*` at your backend's public URL — Vercel doesn't
run the Node/Postgres/Redis backend itself.

## Supabase (as the Postgres provider)

You can swap the `postgres` container for a Supabase Postgres instance: set
`DATABASE_URL` to Supabase's connection string and run `npm run migrate` once against it.
Supabase's own Auth/Realtime features aren't used here since the app already has its own
JWT auth — this is purely "use Supabase as managed Postgres."

## Cloudflare (frontend + edge)

Cloudflare Pages can serve the built frontend (`frontend/dist`) with the same "point /api
at your backend" approach as Vercel. Cloudflare doesn't run the Node backend or Postgres —
pair it with a VPS/Railway/Render backend.

## Notes that apply everywhere

- Run `npm run migrate` once per fresh database (applies `database/schema.sql`).
- `npm run seed` is optional and always safe — it only writes rows tagged `is_demo_data =
  true`, so it never contaminates real data once you connect real providers.
- Set `SHOPEE_API_ENABLED=true` (plus App ID/Secret) only once you have real Affiliate Open
  API credentials — leaving it `false` keeps the app fully functional on demo data.
