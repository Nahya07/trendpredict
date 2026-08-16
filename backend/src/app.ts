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

  app.get('/api/ping', (_req, res) => res.json({ ok: true, demoMode: env.DEMO_MODE_BANNER }));

  app.use('/api/auth', authRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/trend-radar', trendRadarRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/promote-today', promoteTodayRouter);
  app.use('/api/watchlist', watchlistRouter);
  app.use('/api/health', healthRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
