import { providerRegistry } from '../providers/ProviderRegistry';
import { computeMomentum } from '../engine/trendMomentum';
import { classifyTrendStage } from '../engine/trendStage';
import { detectEarlySignal } from '../engine/earlySignal';
import { computeFOS, computeDualScore } from '../engine/scoringEngine';
import { explainScore, predictHorizons } from '../engine/explainability';
import { computeCompetition } from '../engine/priceCompetition';
import { upsertProduct, insertPricePoint } from '../db/repositories/productsRepo';
import { insertTrendHistoryPoint, saveProductScore } from '../db/repositories/trendsRepo';
import { RawProductOffer } from '../providers/types';
import { ScoringInputs } from '../types/domain';

/**
 * Normalizes a 0..N raw count/percent into a 0-100 sub-score using a soft cap, so a single
 * huge outlier doesn't blow the scale. Shared by every "raw signal -> engine input" step.
 */
function normalize(value: number, softCap: number): number {
  return Math.max(0, Math.min(100, (value / softCap) * 100));
}

/**
 * Runs the full pipeline for one keyword+product: collect signals from providers,
 * compute momentum/stage/early-signal/competition, score it, persist everything.
 * This is what the scheduled jobs call, and what "What should I promote today?" is built on.
 */
export async function collectAndScoreOne(keyword: string, offer: RawProductOffer) {
  const [trendResult, newsResult, socialResult] = await Promise.all([
    providerRegistry.getTrendSignal(keyword, 21),
    providerRegistry.getNewsMentions(keyword, 14),
    providerRegistry.getSocialMentions(keyword, 14),
  ]);

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
    source: offer.categoryHint ? 'demo_data' : 'shopee_affiliate_api', // set precisely by caller in real wiring
    isDemoData: true,
  });

  await insertPricePoint(product.id, offer.price, 'demo_data', true);

  const series = trendResult.data ?? [];
  if (trendResult.ok) {
    for (const point of series) {
      await insertTrendHistoryPoint({
        productId: product.id,
        keywordText: keyword,
        metric: 'search_volume',
        value: point.value,
        source: trendResult.source,
        confidence: trendResult.confidence,
        isDemoData: trendResult.isDemoData,
        observedDate: point.date,
      });
    }
  }

  const momentum = computeMomentum(series.map((p) => ({ date: p.date, value: p.value })));
  const latestValue = series.length ? series[series.length - 1].value : 0;
  const currentPopularity = normalize(latestValue, 300);

  const stageResult = classifyTrendStage({ momentum, currentPopularity, daysOfHistory: series.length });

  const articleCount = newsResult.data?.length ?? 0;
  const socialSeries = socialResult.data ?? [];
  const socialLatest = socialSeries.length ? socialSeries[socialSeries.length - 1].mentionCount : 0;
  const socialPrev = socialSeries.length > 1 ? socialSeries[0].mentionCount : socialLatest;
  const socialGrowthPct = socialPrev === 0 ? (socialLatest > 0 ? 100 : 0) : ((socialLatest - socialPrev) / socialPrev) * 100;

  const early = detectEarlySignal({
    searchGrowthPct: momentum.growthRatePct,
    articleMentionGrowthPct: articleCount * 12, // proxy until we store prior-period article counts
    videoMentionGrowthPct: socialGrowthPct,
    newKeywordCount: Math.min(5, Math.round(articleCount / 2)),
    similarProductGrowthPct: momentum.growthRatePct * 0.6,
    priceStabilityPct: 70, // placeholder until price_history has enough points to measure real variance
    affiliateCompetitionCount: Math.max(1, Math.round(10 - currentPopularity / 12)),
  });

  const competition = computeCompetition({
    demandScore: currentPopularity,
    activeAffiliateCount: early.indicators.find((i) => i.key === 'low_affiliate_competition') ? 5 : 40,
    contentSaturationScore: Math.min(100, articleCount * 8),
  });

  const scoringInputs: ScoringInputs = {
    trendMomentum: normalize(Math.max(0, momentum.growthRatePct), 80),
    searchGrowth: normalize(Math.max(0, momentum.growthRatePct), 60),
    socialMomentum: normalize(Math.max(0, socialGrowthPct), 80),
    priceOpportunity: 65, // refined by priceCompetition sweet-spot analysis once enough price_history exists
    competitionGap: 100 - competition.competition,
    contentOpportunity: normalize(articleCount, 8),
    seasonalDemand: 50, // wired to seasonal_events table in the scheduled job, not per-request
    productVelocity: currentPopularity,
    affiliatePotential: offer.commissionRate ? normalize(offer.commissionRate, 15) : 40,
    competitionRisk: competition.competition,
    saturationRisk: stageResult.stage === 'SATURATED' || stageResult.stage === 'PEAK' ? 70 : 15,
    declineRisk: stageResult.stage === 'DECLINING' || stageResult.stage === 'DEAD' ? 80 : 10,
  };

  const fos = computeFOS(scoringInputs);
  const dual = computeDualScore(currentPopularity, fos.score);
  const explanation = explainScore(fos, momentum);
  const horizons = predictHorizons(fos, momentum);

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

  return {
    product,
    momentum,
    stage: stageResult,
    earlySignal: early,
    competition,
    fos,
    dual,
    explanation,
    horizons,
  };
}
