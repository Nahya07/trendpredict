import { Router } from 'express';
import { getProductById, listProducts } from '../db/repositories/productsRepo';
import { getLatestScore, getScoreHistory } from '../db/repositories/trendsRepo';
import { pool } from '../db/pool';

export const productsRouter = Router();

productsRouter.get('/', async (req, res, next) => {
  try {
    const keyword = typeof req.query.q === 'string' ? req.query.q : undefined;
    const products = await listProducts({ keyword, limit: 50 });
    res.json({ items: products });
  } catch (err) {
    next(err);
  }
});

productsRouter.get('/:id', async (req, res, next) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const [latestScore, scoreHistory, priceHistory, trendRow] = await Promise.all([
      getLatestScore(product.id),
      getScoreHistory(product.id, 30),
      pool.query(
        `SELECT price, observed_date FROM price_history WHERE product_id = $1 ORDER BY observed_date ASC LIMIT 60`,
        [product.id]
      ),
      pool.query(`SELECT * FROM trends WHERE product_id = $1 ORDER BY updated_at DESC LIMIT 1`, [product.id]),
    ]);

    res.json({
      product,
      score: latestScore,
      scoreHistory,
      priceHistory: priceHistory.rows,
      trend: trendRow.rows[0] ?? null,
    });
  } catch (err) {
    next(err);
  }
});
