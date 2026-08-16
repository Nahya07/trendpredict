import {
  ExplainableResult,
  ExplainReason,
  FutureOpportunityScore,
  HorizonPrediction,
  MomentumMetrics,
} from '../types/domain';

/**
 * Turns the FOS breakdown + momentum metrics into plain-language reasons, ranked by
 * contribution magnitude. Never emits a bare "AI predicts this is good" — every reason
 * ties back to a concrete number (Req #27).
 */
export function explainScore(fos: FutureOpportunityScore, momentum: MomentumMetrics): ExplainableResult {
  const sorted = [...fos.breakdown].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const reasons: ExplainReason[] = sorted.slice(0, 5).map((line) => {
    const impact: ExplainReason['impact'] = line.contribution >= 0 ? 'positive' : 'negative';
    return {
      text: `${line.label}: ${line.rawInput}/100`,
      impact,
      magnitudePct: Math.abs(line.contribution),
    };
  });

  if (momentum.isBreakout) {
    reasons.unshift({ text: 'Breakout terdeteksi — melewati rolling max 14 hari terakhir', impact: 'positive' });
  }
  if (momentum.isSpike && !momentum.isBreakout) {
    reasons.push({ text: 'Lonjakan satu-hari terdeteksi — kemungkinan noise, belum tentu tren stabil', impact: 'negative' });
  }

  // Confidence rises with data consistency (low volatility + sustained persistence) and
  // with how decisively the score sits away from the NEUTRAL midpoint (42-58 band).
  const distanceFromNeutral = Math.min(50, Math.abs(fos.score - 50));
  const persistenceBonus = Math.min(20, momentum.persistenceDays * 4);
  const volatilityPenalty = Math.min(30, momentum.volatility * 40);
  const confidence = clamp(Math.round(40 + distanceFromNeutral * 0.6 + persistenceBonus - volatilityPenalty), 15, 97);

  return { predictionConfidencePct: confidence, reasons };
}

/**
 * Projects the opportunity score across 3/7/14/30-day horizons.
 * Near-term horizons weight current momentum heavily; longer horizons decay the momentum
 * effect and pull toward the score's underlying (non-momentum) baseline, reflecting that
 * far-future predictions are inherently less certain (Req #20, #29).
 */
export function predictHorizons(fos: FutureOpportunityScore, momentum: MomentumMetrics): HorizonPrediction[] {
  const baseline = fos.score;
  const momentumPush = clamp(momentum.growthRatePct / 4, -15, 15);

  const horizons: HorizonPrediction[] = [3, 7, 14, 30].map((h) => {
    // Decay factor: momentum matters most at 3 days, fades by 30 days.
    const decay = h === 3 ? 1 : h === 7 ? 0.85 : h === 14 ? 0.55 : 0.25;
    const projected = clamp(Math.round(baseline + momentumPush * decay), 0, 100);
    // Confidence shrinks the further out we project.
    const confidenceDecay = h === 3 ? 1 : h === 7 ? 0.9 : h === 14 ? 0.75 : 0.55;
    const volatilityPenalty = Math.min(25, momentum.volatility * 35);
    const confidencePct = clamp(Math.round((75 * confidenceDecay) - volatilityPenalty), 10, 95);
    return { horizonDays: h as 3 | 7 | 14 | 30, opportunityScore: projected, confidencePct };
  });

  return horizons;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
