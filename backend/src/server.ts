import { createApp } from './app';
import { env } from './config/env';
import { startScheduler } from './jobs/scheduler';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`[TrendPredict API] listening on :${env.PORT} (${env.NODE_ENV})`);
  if (env.DEMO_MODE_BANNER) {
    console.log('[TrendPredict API] Running with DEMO DATA where official providers are not configured.');
  }
  startScheduler();
});

process.on('unhandledRejection', (reason) => {
  // Log and keep running — one bad async call should never take the whole API down (Req #44).
  console.error('[UNHANDLED REJECTION]', reason);
});
