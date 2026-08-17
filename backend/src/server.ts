import { createApp } from './app';
import { env } from './config/env';
import { startScheduler } from './jobs/scheduler';

const app = createApp();

// Vercel Services membutuhkan Express app yang diekspor.
// Untuk lokal/Docker/VPS, tetap jalankan server dengan app.listen().
if (!process.env.VERCEL) {
  app.listen(env.PORT, () => {
    console.log(
      `[TrendPredict API] listening on :${env.PORT} (${env.NODE_ENV})`
    );

    if (env.DEMO_MODE_BANNER) {
      console.log(
        '[TrendPredict API] Running with DEMO DATA where official providers are not configured.'
      );
    }

    startScheduler();
  });
} else {
  console.log(
    '[TrendPredict API] Running on Vercel — in-process scheduler disabled.'
  );
}

export default app;
