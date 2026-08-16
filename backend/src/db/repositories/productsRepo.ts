import { pool } from '../pool';
import { DataSourceName } from '../../types/domain';

export interface ProductRow {
  id: string;
  external_id: string | null;
  name: string;
  image_url: string | null;
  category_id: string | null;
  category_name?: string;
  price: number | null;
  shop_name: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  affiliate_link: string | null;
  commission_rate: number | null;
  source: DataSourceName;
  is_demo_data: boolean;
  first_seen_at: string;
  last_seen_at: string;
}

export async function upsertProduct(p: {
  externalId: string;
  name: string;
  imageUrl: string | null;
  categoryName: string | null;
  price: number | null;
  shopName: string | null;
  ratingAvg: number | null;
  ratingCount: number | null;
  affiliateLink: string | null;
  commissionRate: number | null;
  source: DataSourceName;
  isDemoData: boolean;
}): Promise<ProductRow> {
  let categoryId: string | null = null;
  if (p.categoryName) {
    const catRes = await pool.query(
      `INSERT INTO categories (name) VALUES ($1)
       ON CONFLICT DO NOTHING RETURNING id`,
      [p.categoryName]
    );
    if (catRes.rows[0]) {
      categoryId = catRes.rows[0].id;
    } else {
      const existing = await pool.query(`SELECT id FROM categories WHERE name = $1 LIMIT 1`, [p.categoryName]);
      categoryId = existing.rows[0]?.id ?? null;
    }
  }

  const res = await pool.query(
    `INSERT INTO products (external_id, name, image_url, category_id, price, shop_name, rating_avg, rating_count, affiliate_link, commission_rate, source, is_demo_data, last_seen_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
     ON CONFLICT (external_id, source) DO UPDATE SET
       name = EXCLUDED.name, image_url = EXCLUDED.image_url, price = EXCLUDED.price,
       shop_name = EXCLUDED.shop_name, rating_avg = EXCLUDED.rating_avg, rating_count = EXCLUDED.rating_count,
       affiliate_link = EXCLUDED.affiliate_link, commission_rate = EXCLUDED.commission_rate, last_seen_at = now()
     RETURNING *`,
    [
      p.externalId,
      p.name,
      p.imageUrl,
      categoryId,
      p.price,
      p.shopName,
      p.ratingAvg,
      p.ratingCount,
      p.affiliateLink,
      p.commissionRate,
      p.source,
      p.isDemoData,
    ]
  );
  return res.rows[0];
}

export async function getProductById(id: string): Promise<ProductRow | null> {
  const res = await pool.query(
    `SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = $1`,
    [id]
  );
  return res.rows[0] ?? null;
}

export async function listProducts(opts: { limit?: number; keyword?: string } = {}): Promise<ProductRow[]> {
  const limit = opts.limit ?? 50;
  if (opts.keyword) {
    const res = await pool.query(
      `SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.name ILIKE $1 ORDER BY p.last_seen_at DESC LIMIT $2`,
      [`%${opts.keyword}%`, limit]
    );
    return res.rows;
  }
  const res = await pool.query(
    `SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id
     ORDER BY p.last_seen_at DESC LIMIT $1`,
    [limit]
  );
  return res.rows;
}

export async function insertPricePoint(productId: string, price: number, source: DataSourceName, isDemoData: boolean) {
  await pool.query(
    `INSERT INTO price_history (product_id, price, observed_date, source, is_demo_data) VALUES ($1,$2, CURRENT_DATE, $3, $4)`,
    [productId, price, source, isDemoData]
  );
}
