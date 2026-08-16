/**
 * Core domain types for TrendPredict.
 * Kept dependency-free so the engine/ folder can be unit-tested with plain `tsx`,
 * without needing express/pg/etc installed.
 */

export type DataSourceName =
  | 'shopee_affiliate_api'
  | 'shopee_official_api'
  | 'google_trends'
  | 'news_provider'
  | 'social_signal_provider'
  | 'public_web_provider'
  | 'historical_db'
  | 'demo_data';

export type DataConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'ESTIMATED' | 'SIMULATED' | 'UNAVAILABLE';

/** Every metric in the system must be traceable to where it came from. (Req #30, #48) */
export interface DataPoint<T> {
  value: T;
  source: DataSourceName;
  collectedAt: string; // ISO timestamp
  confidence: DataConfidence;
  isDemoData: boolean; // Req #47/#56 — never allowed to silently look like real Shopee data
}

/** A single day of a time series signal (search volume, mentions, price, etc). */
export interface SeriesPoint {
  date: string; // ISO date
  value: number;
}

export type TrendStage =
  | 'UNKNOWN'
  | 'SEED'
  | 'EARLY_SIGNAL'
  | 'EMERGING'
  | 'ACCELERATING'
  | 'RISING'
  | 'PEAK'
  | 'SATURATED'
  | 'DECLINING'
  | 'DEAD';

export interface MomentumMetrics {
  growthRatePct: number; // latest period-over-period % change
  velocity: number; // first derivative (smoothed)
  acceleration: number; // second derivative (smoothed)
  ema7: number;
  ema3: number;
  slope: number; // linear regression slope over the window
  volatility: number; // coefficient of variation over the window
  isBreakout: boolean;
  isSpike: boolean;
  persistenceDays: number; // consecutive days of positive growth
}

export interface EarlySignalIndicator {
  key: string;
  label: string;
  triggered: boolean;
  detail: string;
}

export interface EarlySignalResult {
  detected: boolean;
  triggeredCount: number;
  totalChecked: number;
  indicators: EarlySignalIndicator[];
}

export interface ScoreWeights {
  trendMomentum: number;
  searchGrowth: number;
  socialMomentum: number;
  priceOpportunity: number;
  competitionGap: number;
  contentOpportunity: number;
  seasonalDemand: number;
  productVelocity: number;
  affiliatePotential: number;
  competitionRisk: number; // subtracted
  saturationRisk: number; // subtracted
  declineRisk: number; // subtracted
}

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  trendMomentum: 14,
  searchGrowth: 12,
  socialMomentum: 10,
  priceOpportunity: 8,
  competitionGap: 10,
  contentOpportunity: 8,
  seasonalDemand: 8,
  productVelocity: 10,
  affiliatePotential: 10,
  competitionRisk: 8,
  saturationRisk: 6,
  declineRisk: 6,
};

/** Normalized 0-100 inputs the scoring engine consumes. Providers/repositories are responsible
 * for turning raw signals into these normalized sub-scores. */
export interface ScoringInputs {
  trendMomentum: number;
  searchGrowth: number;
  socialMomentum: number;
  priceOpportunity: number;
  competitionGap: number;
  contentOpportunity: number;
  seasonalDemand: number;
  productVelocity: number;
  affiliatePotential: number;
  competitionRisk: number;
  saturationRisk: number;
  declineRisk: number;
}

export type OpportunityLabel =
  | 'EXTREME_OPPORTUNITY'
  | 'VERY_HIGH'
  | 'HIGH'
  | 'PROMISING'
  | 'NEUTRAL'
  | 'WEAK'
  | 'AVOID';

export interface ScoreBreakdownLine {
  key: keyof ScoringInputs;
  label: string;
  rawInput: number; // 0-100
  weight: number;
  contribution: number; // rawInput/100 * weight, negative for risk terms
}

export interface FutureOpportunityScore {
  score: number; // 0-100, clamped
  label: OpportunityLabel;
  breakdown: ScoreBreakdownLine[];
}

export interface DualScore {
  currentPopularity: number; // 0-100, "is it popular right now"
  futurePotential: number; // 0-100, "is it about to take off"
  classification: 'EARLY_OPPORTUNITY' | 'ALREADY_PEAKED' | 'STEADY' | 'LOW_INTEREST';
}

export interface HorizonPrediction {
  horizonDays: 3 | 7 | 14 | 30;
  opportunityScore: number;
  confidencePct: number;
}

export interface ExplainReason {
  text: string;
  impact: 'positive' | 'negative';
  magnitudePct?: number;
}

export interface ExplainableResult {
  predictionConfidencePct: number;
  reasons: ExplainReason[];
}
