import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { authRouter } from './routes/auth.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { trendRadarRouter } from './routes/trendRadar.routes';
import { productsRouter } from './routes/products.routes';
import { promoteTodayRouter, healthRouter } from './routes/promoteToday.routes';
import { watchlistRouter } from './routes/watchlist.routes';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  // Global rate limit — per-provider limits live in providers/reliability.ts; this protects
  // our own API surface from abuse (Req #42).
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get(['/api/ping', '/ping'], (_req, res) => res.json({ ok: true, demoMode: env.DEMO_MODE_BANNER }));

  // Mounted at both the `/api/*` prefix (used directly, and by the Docker/nginx and local
  // dev proxy paths, which forward the prefix as-is) and the bare path (in case a Vercel
  // Services rewrite strips the `/api` prefix before handing the request to this service —
  // the exact stripping behavior isn't guaranteed the same across Services versions, so
  // mounting both ways makes routing correct either way without depending on it).
  app.use(['/api/auth', '/auth'], authRouter);
  app.use(['/api/dashboard', '/dashboard'], dashboardRouter);
  app.use(['/api/trend-radar', '/trend-radar'], trendRadarRouter);
  app.use(['/api/products', '/products'], productsRouter);
  app.use(['/api/promote-today', '/promote-today'], promoteTodayRouter);
  app.use(['/api/watchlist', '/watchlist'], watchlistRouter);
  app.use(['/api/health', '/health'], healthRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * Vercel's Express framework preset auto-detects an entrypoint by scanning for
 * app.{js,ts,...} / index.{js,ts,...} / server.{js,ts,...} at the project or src/ root
 * (in that priority order), and requires whichever file it picks to either call
 * `app.listen()` or export the app as a default export. Since `src/app.ts` matches that
 * naming convention (and is checked before `src/server.ts`), this default export is what
 * Vercel actually finds and runs — without it, Vercel picks this file anyway but finds
 * neither a listener nor a default export, and fails to package it correctly. This has no
 * effect on the Docker/VPS path: `server.ts` still builds its own instance via
 * `createApp()` and calls `.listen()` exactly as before.
 */
const app = createApp();
export default app;
