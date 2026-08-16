import { Router } from 'express';
import { pool } from '../db/pool';
import { AuthedRequest, requireAuth } from '../middleware/auth.middleware';

export const watchlistRouter = Router();
watchlistRouter.use(requireAuth);

watchlistRouter.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const result = await pool.query(
      `SELECT w.id AS watchlist_id, w.added_at, p.*,
         (SELECT fos_score FROM product_scores ps WHERE ps.product_id = p.id ORDER BY computed_at DESC LIMIT 1) AS latest_fos_score
       FROM watchlists w JOIN products p ON p.id = w.product_id
       WHERE w.user_id = $1 ORDER BY w.added_at DESC`,
      [req.user!.id]
    );
    res.json({ items: result.rows });
  } catch (err) {
    next(err);
  }
});

watchlistRouter.post('/:productId', async (req: AuthedRequest, res, next) => {
  try {
    await pool.query(
      `INSERT INTO watchlists (user_id, product_id) VALUES ($1,$2) ON CONFLICT (user_id, product_id) DO NOTHING`,
      [req.user!.id, req.params.productId]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

watchlistRouter.delete('/:productId', async (req: AuthedRequest, res, next) => {
  try {
    await pool.query(`DELETE FROM watchlists WHERE user_id = $1 AND product_id = $2`, [req.user!.id, req.params.productId]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
