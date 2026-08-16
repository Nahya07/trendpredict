/**
 * Run once after `npm run migrate` to populate a first-run dataset:
 *   cd backend && npm run seed
 *
 * Forces the DemoDataProvider directly (bypassing whatever's configured in .env) so
 * `npm run seed` always works even with zero API credentials configured — this is the
 * "DEMO DATA MODE" the spec requires, not a substitute for real Shopee data (Req #56).
 */
import 'dotenv/config';
import { DemoDataProvider } from '../backend/src/providers/DemoDataProvider';
import { computeMomentum } from '../backend/src/engine/trendMomentum';
import { classifyTrendStage } from '../backend/src/engine/trendStage';
import { detectEarlySignal } from '../backend/src/engine/earlySignal';
import { computeFOS, computeDualScore } from '../backend/src/engine/scoringEngine';
import { computeCompetition } from '../backend/src/engine/priceCompetition';
import { ScoringInputs } from '../backend/src/types/domain';
import { upsertProduct, insertPricePoint } from '../backend/src/db/repositories/productsRepo';
import { insertTrendHistoryPoint, saveProductScore } from '../backend/src/db/repositories/trendsRepo';
import { pool } from '../backend/src/db/pool';
import { TRACKED_KEYWORDS } from '../backend/src/config/trackedKeywords';

function normalize(value: number, softCap: number): number {
  return Math.max(0, Math.min(100, (value / softCap) * 100));
}

async function seedOne(demo: DemoDataProvider, keyword: string) {
  const offersResult = await demo.fetchProductOffers({ keyword, limit: 1 });
  const offer = offersResult.data?.[0];
  if (!offer) return;

  const product = await upsertProduct({
    externalId: offer.externalId,
    name: offer.name,
    imageUrl: offer.imageUrl,
    categoryName: offer.categoryHint,
    price: offer.price,
    shopName: offer.shopName,
    ratingAvg: offer.ratingAvg,
    ratingCount: offer.ratingCount,
    affiliateLink: offer.affiliateLink,
    commissionRate: offer.commissionRate,
    source: 'demo_data',
    isDemoData: true,
  });
  await insertPricePoint(product.id, offer.price, 'demo_data', true);

  const trendResult = await demo.fetchTrendSignal!(keyword, 21);
  const series = trendResult.data ?? [];
  for (const point of series) {
    await insertTrendHistoryPoint({
      productId: product.id,
      keywordText: keyword,
      metric: 'search_volume',
      value: point.value,
      source: trendResult.source,
      confidence: trendResult.confidence,
      isDemoData: true,
      observedDate: point.date,
    });
  }

  const newsResult = await demo.fetchNewsMentions!(keyword, 14);
  for (const article of newsResult.data ?? []) {
    await pool.query(
      `INSERT INTO news_articles (title, url, category, published_at, extracted_keywords, source, is_demo_data)
       VALUES ($1,$2,$3,$4,$5,'demo_data', true) ON CONFLICT (url) DO NOTHING`,
      [article.title, article.url, article.category, article.publishedAt, [keyword]]
    );
  }

  const momentum = computeMomentum(series);
  const latestValue = series.length ? series[series.length - 1].value : 0;
  const currentPopularity = normalize(latestValue, 300);
  const { stage } = classifyTrendStage({ momentum, currentPopularity, daysOfHistory: series.length });

  const articleCount = newsResult.data?.length ?? 0;
  const early = detectEarlySignal({
    searchGrowthPct: momentum.growthRatePct,
    articleMentionGrowthPct: articleCount * 12,
    videoMentionGrowthPct: momentum.growthRatePct * 0.8,
    newKeywordCount: Math.min(5, Math.round(articleCount / 2)),
    similarProductGrowthPct: momentum.growthRatePct * 0.6,
    priceStabilityPct: 70,
    affiliateCompetitionCount: Math.max(1, Math.round(10 - currentPopularity / 12)),
  });

  const competition = computeCompetition({
    demandScore: currentPopularity,
    activeAffiliateCount: early.indicators.find((i) => i.key === 'low_affiliate_competition')?.triggered ? 5 : 40,
    contentSaturationScore: Math.min(100, articleCount * 8),
  });

  const scoringInputs: ScoringInputs = {
    trendMomentum: normalize(Math.max(0, momentum.growthRatePct), 80),
    searchGrowth: normalize(Math.max(0, momentum.growthRatePct), 60),
    socialMomentum: normalize(Math.max(0, momentum.growthRatePct), 80),
    priceOpportunity: 65,
    competitionGap: 100 - competition.competition,
    contentOpportunity: normalize(articleCount, 8),
    seasonalDemand: 50,
    productVelocity: currentPopularity,
    affiliatePotential: offer.commissionRate ? normalize(offer.commissionRate, 15) : 40,
    competitionRisk: competition.competition,
    saturationRisk: stage === 'SATURATED' || stage === 'PEAK' ? 70 : 15,
    declineRisk: stage === 'DECLINING' || stage === 'DEAD' ? 80 : 10,
  };

  const fos = computeFOS(scoringInputs);
  const dual = computeDualScore(currentPopularity, fos.score);

  await saveProductScore({
    productId: product.id,
    fosScore: fos.score,
    fosLabel: fos.label,
    currentPopularity: dual.currentPopularity,
    futurePotential: dual.futurePotential,
    dualClassification: dual.classification,
    breakdown: fos.breakdown,
    weights: scoringInputs,
  });

  const keywordRow = await pool.query(`SELECT id FROM keywords WHERE keyword = $1`, [keyword]);
  const keywordId = keywordRow.rows[0]?.id;
  if (keywordId) {
    await pool.query(
      `INSERT INTO trends (keyword_id, product_id, stage, current_popularity, future_potential, updated_at)
       VALUES ($1,$2,$3,$4,$5, now())
       ON CONFLICT (keyword_id) DO UPDATE SET
         stage = EXCLUDED.stage, current_popularity = EXCLUDED.current_popularity,
         future_potential = EXCLUDED.future_potential, updated_at = now()`,
      [keywordId, product.id, stage, dual.currentPopularity, dual.futurePotential]
    );
  }

  console.log(`Seeded "${keyword}" -> FOS ${fos.score} (${fos.label}), stage=${stage}`);
}

async function main() {
  const demo = new DemoDataProvider();
  for (const keyword of TRACKED_KEYWORDS) {
    await seedOne(demo, keyword);
  }
  console.log('Seed complete.');
  await pool.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
