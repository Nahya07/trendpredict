
/**
 * Quick correctness check for the prediction engine using synthetic but realistic series.
 * Run with: npx tsx tests/engine/validate-engine.ts
 * (No express/pg/etc required — this only touches backend/src/engine + backend/src/types.)
 */
import { computeMomentum } from '../../backend/src/engine/trendMomentum';
import { classifyTrendStage } from '../../backend/src/engine/trendStage';
import { detectEarlySignal } from '../../backend/src/engine/earlySignal';
import { computeFOS, computeDualScore } from '../../backend/src/engine/scoringEngine';
import { explainScore, predictHorizons } from '../../backend/src/engine/explainability';
import { findPriceSweetSpot, computeCompetition } from '../../backend/src/engine/priceCompetition';
import { SeriesPoint, ScoringInputs } from '../../backend/src/types/domain';

function mkSeries(values: number[]): SeriesPoint[] {
  const start = new Date('2026-08-01');
  return values.map((v, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return { date: d.toISOString().slice(0, 10), value: v };
  });
}

function line(label: string, ok: boolean, detail: string) {
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${label} :: ${detail}`);
  if (!ok) process.exitCode = 1;
}

console.log('=== 1) Accelerating series from the spec example (100,130,175,250,410) ===');
const accelSeries = mkSeries([100, 130, 175, 250, 410]);
const accelMomentum = computeMomentum(accelSeries);
console.log(accelMomentum);
line('growth rate matches spec (~64%)', Math.abs(accelMomentum.growthRatePct - 64) < 1, `got ${accelMomentum.growthRatePct}%`);
line('acceleration is positive', accelMomentum.acceleration > 0, `got ${accelMomentum.acceleration}`);
line('breakout detected', accelMomentum.isBreakout === true, `isBreakout=${accelMomentum.isBreakout}`);

const accelStage = classifyTrendStage({ momentum: accelMomentum, currentPopularity: 30, daysOfHistory: 5 });
console.log('stage:', accelStage);
line('classified as ACCELERATING or EMERGING', ['ACCELERATING', 'EMERGING'].includes(accelStage.stage), `got ${accelStage.stage}`);

console.log('\n=== 2) Flat/declining series (200,195,190,180,150) ===');
const declineSeries = mkSeries([200, 195, 190, 180, 150]);
const declineMomentum = computeMomentum(declineSeries);
console.log(declineMomentum);
const declineStage = classifyTrendStage({ momentum: declineMomentum, currentPopularity: 80, daysOfHistory: 5 });
console.log('stage:', declineStage);
line('growth rate negative', declineMomentum.growthRatePct < 0, `got ${declineMomentum.growthRatePct}%`);
line('classified as SATURATED/DECLINING', ['SATURATED', 'DECLINING'].includes(declineStage.stage), `got ${declineStage.stage}`);

console.log('\n=== 3) Early signal detection — 5 of 7 indicators trigger ===');
const earlySignal = detectEarlySignal({
  searchGrowthPct: 34,
  articleMentionGrowthPct: 71,
  videoMentionGrowthPct: 48,
  newKeywordCount: 3,
  similarProductGrowthPct: 12,
  priceStabilityPct: 40, // below threshold, should NOT trigger
  affiliateCompetitionCount: 5, // below 8, SHOULD trigger
});
console.log(earlySignal);
line('early signal detected', earlySignal.detected === true, `triggeredCount=${earlySignal.triggeredCount}/7`);
line('price_stability correctly not triggered', earlySignal.indicators.find((i) => i.key === 'price_stability')!.triggered === false, '');

console.log('\n=== 4) FOS scoring — Product B from spec (low current, high future) ===');
const productBInputs: ScoringInputs = {
  trendMomentum: 95,
  searchGrowth: 92,
  socialMomentum: 88,
  priceOpportunity: 80,
  competitionGap: 90,
  contentOpportunity: 75,
  seasonalDemand: 65,
  productVelocity: 55,
  affiliatePotential: 80,
  competitionRisk: 10,
  saturationRisk: 8,
  declineRisk: 5,
};
const fosB = computeFOS(productBInputs);
console.log('FOS:', fosB.score, fosB.label);
const dualB = computeDualScore(62, fosB.score);
console.log('Dual score:', dualB);
line('FOS in VERY_HIGH/EXTREME range', ['VERY_HIGH', 'EXTREME_OPPORTUNITY', 'HIGH'].includes(fosB.label), `got ${fosB.label} (${fosB.score})`);
line('classified as EARLY_OPPORTUNITY', dualB.classification === 'EARLY_OPPORTUNITY', `got ${dualB.classification}`);

console.log('\n=== 5) FOS scoring — a declining product (high current, low future) ===');
const decliningInputs: ScoringInputs = {
  trendMomentum: 12,
  searchGrowth: 10,
  socialMomentum: 15,
  priceOpportunity: 40,
  competitionGap: 20,
  contentOpportunity: 25,
  seasonalDemand: 20,
  productVelocity: 30,
  affiliatePotential: 30,
  competitionRisk: 80,
  saturationRisk: 85,
  declineRisk: 70,
};
const fosDecl = computeFOS(decliningInputs);
const dualDecl = computeDualScore(90, fosDecl.score);
console.log('FOS:', fosDecl.score, fosDecl.label, '| Dual:', dualDecl);
line('FOS low (WEAK/AVOID/NEUTRAL)', ['WEAK', 'AVOID', 'NEUTRAL'].includes(fosDecl.label), `got ${fosDecl.label} (${fosDecl.score})`);
line('classified as ALREADY_PEAKED', dualDecl.classification === 'ALREADY_PEAKED', `got ${dualDecl.classification}`);

console.log('\n=== 6) Explainability + horizon prediction ===');
const explained = explainScore(fosB, accelMomentum);
console.log(explained);
line('confidence is a sane 15-97 range', explained.predictionConfidencePct >= 15 && explained.predictionConfidencePct <= 97, `got ${explained.predictionConfidencePct}`);
line('has ranked reasons', explained.reasons.length > 0, `got ${explained.reasons.length} reasons`);

const horizons = predictHorizons(fosB, accelMomentum);
console.log(horizons);
line('4 horizons returned', horizons.length === 4, `got ${horizons.length}`);
line('confidence decreases with horizon', horizons[0].confidencePct >= horizons[3].confidencePct, `3d=${horizons[0].confidencePct} vs 30d=${horizons[3].confidencePct}`);

console.log('\n=== 7) Price sweet spot + competition ===');
const sweetSpot = findPriceSweetSpot([
  { price: 19900, conversions: 12 },
  { price: 29900, conversions: 40 },
  { price: 39900, conversions: 55 },
  { price: 49900, conversions: 38 },
  { price: 59900, conversions: 9 },
]);
console.log(sweetSpot);
line('sweet spot lands in 30-49k band', sweetSpot.bandMin >= 30000 && sweetSpot.bandMin < 50000, `got band ${sweetSpot.bandMin}`);

const comp1 = computeCompetition({ demandScore: 82, activeAffiliateCount: 6, contentSaturationScore: 25 });
const comp2 = computeCompetition({ demandScore: 98, activeAffiliateCount: 400, contentSaturationScore: 90 });
console.log('low-competition high-demand:', comp1);
console.log('high-competition high-demand:', comp2);
line('lower competition scores higher opportunity despite lower demand', comp1.opportunity > comp2.opportunity, `${comp1.opportunity} vs ${comp2.opportunity}`);

console.log('\nAll checks completed.');
