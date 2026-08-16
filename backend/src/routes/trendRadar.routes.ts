import { Router } from 'express';
import { pool } from '../db/pool';

export const trendRadarRouter = Router();

trendRadarRouter.get('/', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (ps.product_id)
         p.id AS product_id, p.name, p.image_url, p.is_demo_data,
         ps.fos_score, ps.fos_label, ps.current_popularity, ps.future_potential,
         t.stage
       FROM product_scores ps
       JOIN products p ON p.id = ps.product_id
       LEFT JOIN trends t ON t.product_id = p.id
       ORDER BY ps.product_id, ps.computed_at DESC`
    );

    const radar = result.rows
      .filter((r) => ['ACCELERATING', 'EMERGING', 'EARLY_SIGNAL', 'RISING'].includes(r.stage))
      .sort((a, b) => b.fos_score - a.fos_score);

    res.json({ items: radar, updatedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});
