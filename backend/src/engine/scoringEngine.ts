import {
  DualScore,
  FutureOpportunityScore,
  OpportunityLabel,
  ScoreBreakdownLine,
  ScoreWeights,
  ScoringInputs,
  DEFAULT_SCORE_WEIGHTS,
} from '../types/domain';

const LABELS: { min: number; label: OpportunityLabel }[] = [
  { min: 88, label: 'EXTREME_OPPORTUNITY' },
  { min: 78, label: 'VERY_HIGH' },
  { min: 68, label: 'HIGH' },
  { min: 58, label: 'PROMISING' },
  { min: 42, label: 'NEUTRAL' },
  { min: 20, label: 'WEAK' },
  { min: -Infinity, label: 'AVOID' },
];

function labelForScore(score: number): OpportunityLabel {
  return LABELS.find((l) => score >= l.min)!.label;
}

const POSITIVE_KEYS = [
  'trendMomentum',
  'searchGrowth',
  'socialMomentum',
  'priceOpportunity',
  'competitionGap',
  'contentOpportunity',
  'seasonalDemand',
  'productVelocity',
  'affiliatePotential',
] as const;

const RISK_KEYS = ['competitionRisk', 'saturationRisk', 'declineRisk'] as const;

const FIELD_LABELS: Record<keyof ScoringInputs, string> = {
  trendMomentum: 'Trend Momentum',
  searchGrowth: 'Search Growth',
  socialMomentum: 'Social Momentum',
  priceOpportunity: 'Price Opportunity',
  competitionGap: 'Competition Gap',
  contentOpportunity: 'Content Opportunity',
  seasonalDemand: 'Seasonal Demand',
  productVelocity: 'Product Velocity',
  affiliatePotential: 'Affiliate Potential',
  competitionRisk: 'Competition Risk',
  saturationRisk: 'Saturation Risk',
  declineRisk: 'Decline Risk',
};

/**
 * Computes the Future Opportunity Score (0-100).
 * All sub-scores in `inputs` are expected to already be normalized to 0-100.
 * Weights are configurable (admin-tunable) — this is NOT a static formula (Req #4).
 */
export function computeFOS(
  inputs: ScoringInputs,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS
): FutureOpportunityScore {
  const maxPositiveWeight = POSITIVE_KEYS.reduce((sum, k) => sum + weights[k], 0);
  const breakdown: ScoreBreakdownLine[] = [];

  let positiveSum = 0;
  for (const key of POSITIVE_KEYS) {
    const raw = clamp(inputs[key], 0, 100);
    const w = weights[key];
    const contribution = (raw / 100) * w;
    positiveSum += contribution;
    breakdown.push({ key, label: FIELD_LABELS[key], rawInput: raw, weight: w, contribution: round2(contribution) });
  }

  let riskSum = 0;
  for (const key of RISK_KEYS) {
    const raw = clamp(inputs[key], 0, 100);
    const w = weights[key];
    const contribution = (raw / 100) * w;
    riskSum += contribution;
    breakdown.push({ key, label: FIELD_LABELS[key], rawInput: raw, weight: w, contribution: round2(-contribution) });
  }

  // Normalize positive contribution against max possible positive weight so the score
  // lands on a clean 0-100 scale regardless of how weights are tuned, then subtract risk.
  const normalizedPositive = maxPositiveWeight > 0 ? (positiveSum / maxPositiveWeight) * 100 : 0;
  const maxRiskWeight = RISK_KEYS.reduce((sum, k) => sum + weights[k], 0);
  const normalizedRiskPenalty = maxRiskWeight > 0 ? (riskSum / maxRiskWeight) * (maxRiskWeight / maxPositiveWeight) * 100 : 0;

  const score = clamp(round2(normalizedPositive - normalizedRiskPenalty), 0, 100);

  return { score, label: labelForScore(score), breakdown };
}

/**
 * Current Popularity vs Future Potential — the core distinction the whole product is built on (Req #5).
 * currentPopularity: absolute, "how big is it right now" (sales/search volume level).
 * futurePotential: derived from the FOS (momentum-driven), independent of current size.
 */
export function computeDualScore(currentPopularity: number, futureOpportunityScore: number): DualScore {
  const cp = clamp(round2(currentPopularity), 0, 100);
  const fp = clamp(round2(futureOpportunityScore), 0, 100);

  // Classification is driven by the GAP between the two scores, not their absolute levels —
  // e.g. spec example Product B (current=62, future=89) is EARLY_OPPORTUNITY because future
  // clearly outpaces current, even though 62 isn't itself a "low" popularity.
  const gap = fp - cp;
  let classification: DualScore['classification'];
  if (gap >= 15 && fp >= 55) classification = 'EARLY_OPPORTUNITY';
  else if (gap <= -20 && cp >= 55) classification = 'ALREADY_PEAKED';
  else if (cp < 25 && fp < 30) classification = 'LOW_INTEREST';
  else classification = 'STEADY';

  return { currentPopularity: cp, futurePotential: fp, classification };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
