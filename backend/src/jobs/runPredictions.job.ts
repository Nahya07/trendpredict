import { pool } from '../db/pool';
import { computeMomentum } from '../engine/trendMomentum';
import { computeFOS } from '../engine/scoringEngine';
import { predictHorizons } from '../engine/explainability';
import { ScoringInputs } from '../types/domain';

/**
 * For every product with a recent score, recompute momentum from its stored trend_history
 * and write fresh 3/7/14/30-day predictions. prediction_results rows are filled in later
 * (by comparing predicted vs actual popularity change once the horizon date arrives) —
 * that evaluation step is a Phase 2 item, see docs/ROADMAP.md Req #29.
 */
export async function runPredictionRefresh() {
  const scored = await pool.query(
    `SELECT DISTINCT ON (product_id) product_id, breakdown_json, weights_json
     FROM product_scores ORDER BY product_id, computed_at DESC`
  );

  for (const row of scored.rows) {
    const seriesRes = await pool.query(
      `SELECT th.observed_date, th.value FROM trend_history th
       JOIN products p ON p.id = th.product_id
       WHERE th.product_id = $1 AND th.metric = 'search_volume'
       ORDER BY th.observed_date ASC LIMIT 60`,
      [row.product_id]
    );
    if (seriesRes.rows.length < 2) continue;

    const series = seriesRes.rows.map((r) => ({ date: r.observed_date, value: Number(r.value) }));
    const momentum = computeMomentum(series);

    let weights: ScoringInputs;
    try {
      weights = typeof row.weights_json === 'string' ? JSON.parse(row.weights_json) : row.weights_json;
    } catch {
      continue;
    }
    const fos = computeFOS(weights);
    const horizons = predictHorizons(fos, momentum);

    for (const h of horizons) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + h.horizonDays);
      await pool.query(
        `INSERT INTO predictions (product_id, horizon_days, predicted_score, confidence_pct, target_date)
         VALUES ($1,$2,$3,$4,$5)`,
        [row.product_id, h.horizonDays, h.opportunityScore, h.confidencePct, targetDate.toISOString().slice(0, 10)]
      );
    }
  }
}
