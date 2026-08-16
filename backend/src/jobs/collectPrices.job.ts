import { pool } from '../db/pool';
import { providerRegistry } from '../providers/ProviderRegistry';
import { insertPricePoint } from '../db/repositories/productsRepo';
import { TRACKED_KEYWORDS } from '../config/trackedKeywords';

export async function runPriceCollection() {
  for (const keyword of TRACKED_KEYWORDS) {
    const offers = await providerRegistry.getProductOffers({ keyword, limit: 3 });
    if (!offers.ok || !offers.data?.length) continue;

    for (const offer of offers.data) {
      const existing = await pool.query(`SELECT id FROM products WHERE external_id = $1 LIMIT 1`, [offer.externalId]);
      if (existing.rows[0]) {
        await insertPricePoint(existing.rows[0].id, offer.price, offers.source, offers.isDemoData);
      }
    }
  }
}
