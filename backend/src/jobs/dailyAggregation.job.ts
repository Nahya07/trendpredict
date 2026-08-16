import { pool } from '../db/pool';
import { computeMomentum } from '../engine/trendMomentum';
import { classifyTrendStage } from '../engine/trendStage';

export async function runDailyAggregation() {
  const keywords = await pool.query(`SELECT id, keyword FROM keywords`);

  for (const row of keywords.rows) {
    const seriesRes = await pool.query(
      `SELECT observed_date, value FROM trend_history WHERE keyword_id = $1 AND metric = 'search_volume'
       ORDER BY observed_date ASC LIMIT 60`,
      [row.id]
    );
    if (seriesRes.rows.length < 2) continue;

    const series = seriesRes.rows.map((r) => ({ date: r.observed_date, value: Number(r.value) }));
    const momentum = computeMomentum(series);
    const latest = series[series.length - 1].value;
    const currentPopularity = Math.max(0, Math.min(100, (latest / 300) * 100));
    const { stage } = classifyTrendStage({ momentum, currentPopularity, daysOfHistory: series.length });

    const productRes = await pool.query(
      `SELECT product_id FROM trend_history WHERE keyword_id = $1 AND product_id IS NOT NULL ORDER BY collected_at DESC LIMIT 1`,
      [row.id]
    );
    const productId = productRes.rows[0]?.product_id ?? null;

    const scoreRes = productId
      ? await pool.query(`SELECT future_potential FROM product_scores WHERE product_id = $1 ORDER BY computed_at DESC LIMIT 1`, [productId])
      : { rows: [] as any[] };
    const futurePotential = scoreRes.rows[0]?.future_potential ?? currentPopularity;

    await pool.query(
      `INSERT INTO trends (keyword_id, product_id, stage, current_popularity, future_potential, updated_at)
       VALUES ($1,$2,$3,$4,$5, now())
       ON CONFLICT DO NOTHING`,
      [row.id, productId, stage, currentPopularity, futurePotential]
    );
  }
}
