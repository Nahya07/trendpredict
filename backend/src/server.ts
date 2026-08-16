import { createApp } from './app';
import { env } from './config/env';
import { startScheduler } from './jobs/scheduler';

const app = createApp();

// Vercel Services runs this entrypoint via `server.listen()` detection and proxies
// requests to it internally — the listen() call itself is what makes this file
// compatible with Vercel, unchanged from the Docker/VPS path (Req: "make the existing
// Express backend compatible with Vercel Services").
app.listen(env.PORT, () => {
  console.log(`[TrendPredict API] listening on :${env.PORT} (${env.NODE_ENV})`);
  if (env.DEMO_MODE_BANNER) {
    console.log('[TrendPredict API] Running with DEMO DATA where official providers are not configured.');
  }

  // The in-process node-cron scheduler assumes a single, continuously-running process.
  // Vercel Services runs on Fluid compute — instances can cold-start, scale to zero, or
  // run as multiple concurrent instances — so an in-memory cron here would fire
  // unreliably (missed runs) or redundantly (duplicate runs across instances). We
  // preserve it exactly as-is for Docker/VPS (where `VERCEL` is never set) and skip it
  // on Vercel; see docs/DEPLOYMENT.md for the Vercel Cron Jobs alternative.
  if (!process.env.VERCEL) {
    startScheduler();
  } else {
    console.log('[TrendPredict API] Running on Vercel — in-process scheduler disabled. See docs/DEPLOYMENT.md.');
  }
});

process.on('unhandledRejection', (reason) => {
  // Log and keep running — one bad async call should never take the whole API down (Req #44).
  console.error('[UNHANDLED REJECTION]', reason);
});
