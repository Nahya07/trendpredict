import { Router } from 'express';
import { pool } from '../db/pool';
import { getTopOpportunities } from '../db/repositories/trendsRepo';

export const dashboardRouter = Router();

dashboardRouter.get('/', async (_req, res, next) => {
  try {
    const [stageCounts, topOpportunities, hotCategories] = await Promise.all([
      pool.query(`SELECT stage, COUNT(*) AS count FROM trends GROUP BY stage`),
      getTopOpportunities(10),
      pool.query(
        `SELECT c.name, COUNT(*) AS product_count, AVG(ps.fos_score) AS avg_fos
         FROM product_scores ps
         JOIN products p ON p.id = ps.product_id
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE c.name IS NOT NULL
         GROUP BY c.name ORDER BY avg_fos DESC NULLS LAST LIMIT 6`
      ),
    ]);

    const stageMap = Object.fromEntries(stageCounts.rows.map((r) => [r.stage, Number(r.count)]));

    res.json({
      kpis: {
        emergingProducts: stageMap['EMERGING'] ?? 0,
        acceleratingTrends: stageMap['ACCELERATING'] ?? 0,
        highOpportunityProducts: topOpportunities.filter((o: any) => o.fos_score >= 68).length,
        decliningCategories: stageMap['DECLINING'] ?? 0,
      },
      topOpportunities,
      hotCategories: hotCategories.rows,
    });
  } catch (err) {
    next(err);
  }
});
