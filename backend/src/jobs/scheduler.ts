import cron from 'node-cron';
import { runTrendSignalCollection } from './collectTrendSignals.job';
import { runPriceCollection } from './collectPrices.job';
import { runNewsCollection } from './collectNews.job';
import { runDailyAggregation } from './dailyAggregation.job';
import { runPredictionRefresh } from './runPredictions.job';

/**
 * Not every data type is collected at the same cadence — each schedule reflects the
 * realistic rate limit / freshness need of its source (Req #33):
 *   trend signals   -> every 15 min  (cheapest, most time-sensitive)
 *   prices          -> every 1 hour  (Shopee Affiliate API rate-limited)
 *   news            -> every 1 hour
 *   daily aggregate  -> once a day at 01:00
 *   predictions      -> every 6 hours
 */
export function startScheduler() {
  cron.schedule('*/15 * * * *', guarded('trend-signals', runTrendSignalCollection));
  cron.schedule('0 * * * *', guarded('prices', runPriceCollection));
  cron.schedule('5 * * * *', guarded('news', runNewsCollection));
  cron.schedule('0 1 * * *', guarded('daily-aggregation', runDailyAggregation));
  cron.schedule('0 */6 * * *', guarded('predictions', runPredictionRefresh));

  console.log('[Scheduler] jobs registered: trend-signals(15m) prices(1h) news(1h) daily-aggregation(1d) predictions(6h)');
}

/** Wraps every job so one failing run logs and moves on instead of crashing the scheduler
 * or silently going quiet (Req #43-44). */
function guarded(name: string, fn: () => Promise<void>) {
  return async () => {
    const startedAt = Date.now();
    try {
      await fn();
      console.log(`[JOB ${name}] completed in ${Date.now() - startedAt}ms`);
    } catch (err) {
      console.error(`[JOB ${name}] FAILED`, err);
    }
  };
}
