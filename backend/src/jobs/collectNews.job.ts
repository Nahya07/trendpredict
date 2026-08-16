import { pool } from '../db/pool';
import { providerRegistry } from '../providers/ProviderRegistry';
import { TRACKED_KEYWORDS } from '../config/trackedKeywords';

export async function runNewsCollection() {
  for (const keyword of TRACKED_KEYWORDS) {
    const result = await providerRegistry.getNewsMentions(keyword, 3);
    if (!result.ok || !result.data) continue;

    for (const article of result.data) {
      await pool.query(
        `INSERT INTO news_articles (title, url, category, published_at, extracted_keywords, source, is_demo_data)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (url) DO NOTHING`,
        [article.title, article.url, article.category, article.publishedAt, [keyword], result.source, result.isDemoData]
      );
    }
  }
}
