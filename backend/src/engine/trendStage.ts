import { MomentumMetrics, TrendStage } from '../types/domain';

export interface StageInputs {
  momentum: MomentumMetrics;
  /** 0-100 current absolute popularity (sales/search volume normalized vs category peers) */
  currentPopularity: number;
  /** How many days of history we actually have — low-data items get classified conservatively. */
  daysOfHistory: number;
}

/**
 * Classifies a product/category into a lifecycle stage using momentum shape + absolute level,
 * not absolute level alone (two items with the same popularity can be in very different stages).
 */
export function classifyTrendStage(input: StageInputs): { stage: TrendStage; reason: string } {
  const { momentum: m, currentPopularity, daysOfHistory } = input;

  if (daysOfHistory < 2) {
    return { stage: 'UNKNOWN', reason: 'Not enough history to classify (need at least 2 data points).' };
  }

  if (daysOfHistory < 5 && currentPopularity < 15) {
    return { stage: 'SEED', reason: 'Very early / low-volume item with minimal history.' };
  }

  // Declining/dead: sustained negative momentum.
  if (m.growthRatePct < -10 && m.slope < 0 && m.persistenceDays === 0) {
    if (currentPopularity < 10) {
      return { stage: 'DEAD', reason: 'Popularity has collapsed and shows no recovery signal.' };
    }
    return { stage: 'DECLINING', reason: `Negative growth (${m.growthRatePct}%) with a downward slope.` };
  }

  // Peak / saturated: high absolute popularity but momentum has flattened or reversed.
  if (currentPopularity >= 75) {
    if (m.growthRatePct <= 3 && m.growthRatePct >= -10) {
      return { stage: 'PEAK', reason: 'Popularity is high but growth has flattened — likely near the top.' };
    }
    if (m.growthRatePct < -10) {
      return { stage: 'SATURATED', reason: 'High popularity but momentum is reversing — market is saturating.' };
    }
  }

  // Rising: solidly positive, sustained, already fairly popular.
  if (currentPopularity >= 45 && m.growthRatePct > 8 && m.persistenceDays >= 2) {
    return { stage: 'RISING', reason: `Sustained growth (${m.persistenceDays} days up in a row) at meaningful volume.` };
  }

  // Accelerating: growth rate itself is increasing (positive acceleration + breakout/spike-adjacent).
  if (m.acceleration > 0 && m.growthRatePct > 15 && (m.isBreakout || m.velocity > 0)) {
    return { stage: 'ACCELERATING', reason: `Growth is speeding up (+${m.growthRatePct}%, positive acceleration).` };
  }

  // Emerging: clearly positive and building, but not yet at high absolute volume.
  if (m.growthRatePct > 8 && currentPopularity >= 15 && currentPopularity < 45) {
    return { stage: 'EMERGING', reason: `Steady upward movement (+${m.growthRatePct}%) at low-to-mid volume.` };
  }

  // Early signal: small positive movement at low volume — the earliest actionable stage.
  if (m.growthRatePct > 3 && currentPopularity < 20) {
    return { stage: 'EARLY_SIGNAL', reason: `Small but positive movement (+${m.growthRatePct}%) at very low volume.` };
  }

  // Default: flat or ambiguous signal — not falling, not clearly rising yet.
  return { stage: 'SEED', reason: 'No strong directional signal yet; treat as an unconfirmed seed.' };
}
