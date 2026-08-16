import { pool } from '../pool';
import { DataConfidence, DataSourceName } from '../../types/domain';

export async function insertTrendHistoryPoint(input: {
  productId?: string | null;
  keywordText: string;
  metric: string;
  value: number;
  source: DataSourceName;
  confidence: DataConfidence;
  isDemoData: boolean;
  observedDate: string; // YYYY-MM-DD
}) {
  const keywordRes = await pool.query(
    `INSERT INTO keywords (keyword) VALUES ($1) ON CONFLICT (keyword) DO UPDATE SET keyword = EXCLUDED.keyword RETURNING id`,
    [input.keywordText]
  );
  const keywordId = keywordRes.rows[0].id;

  await pool.query(
    `INSERT INTO trend_history (keyword_id, product_id, metric, value, source, confidence, is_demo_data, observed_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [keywordId, input.productId ?? null, input.metric, input.value, input.source, input.confidence, input.isDemoData, input.observedDate]
  );
  return keywordId;
}

export async function getSeriesForKeyword(keywordText: string, metric: string, days: number) {
  const res = await pool.query(
    `SELECT th.observed_date, th.value, th.source, th.confidence, th.is_demo_data
     FROM trend_history th
     JOIN keywords k ON k.id = th.keyword_id
     WHERE k.keyword = $1 AND th.metric = $2
     ORDER BY th.observed_date DESC LIMIT $3`,
    [keywordText, metric, days]
  );
  return res.rows.reverse();
}

export async function saveProductScore(input: {
  productId: string;
  fosScore: number;
  fosLabel: string;
  currentPopularity: number;
  futurePotential: number;
  dualClassification: string;
  breakdown: unknown;
  weights: unknown;
}) {
  await pool.query(
    `INSERT INTO product_scores (product_id, fos_score, fos_label, current_popularity, future_potential, dual_classification, breakdown_json, weights_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      input.productId,
      input.fosScore,
      input.fosLabel,
      input.currentPopularity,
      input.futurePotential,
      input.dualClassification,
      JSON.stringify(input.breakdown),
      JSON.stringify(input.weights),
    ]
  );
}

export async function getLatestScore(productId: string) {
  const res = await pool.query(
    `SELECT * FROM product_scores WHERE product_id = $1 ORDER BY computed_at DESC LIMIT 1`,
    [productId]
  );
  return res.rows[0] ?? null;
}

export async function getScoreHistory(productId: string, limit = 30) {
  const res = await pool.query(
    `SELECT fos_score, current_popularity, future_potential, computed_at FROM product_scores
     WHERE product_id = $1 ORDER BY computed_at DESC LIMIT $2`,
    [productId, limit]
  );
  return res.rows.reverse();
}

export async function getTopOpportunities(limit = 10) {
  const res = await pool.query(
    `SELECT DISTINCT ON (ps.product_id) ps.*, p.name, p.image_url, p.price, p.is_demo_data, p.external_id
     FROM product_scores ps
     JOIN products p ON p.id = ps.product_id
     ORDER BY ps.product_id, ps.computed_at DESC`
  );
  return res.rows.sort((a, b) => b.fos_score - a.fos_score).slice(0, limit);
}
