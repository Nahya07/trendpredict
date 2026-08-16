import { MomentumMetrics, SeriesPoint } from '../types/domain';

/** Exponential moving average over the last `period` points (or fewer if series is shorter). */
function ema(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const k = 2 / (period + 1);
  let emaVal = values[0];
  for (let i = 1; i < values.length; i++) {
    emaVal = values[i] * k + emaVal * (1 - k);
  }
  return emaVal;
}

/** Simple linear regression slope (least squares) over index vs value. Normalized per-day. */
function linearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xs = values.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (values[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function coefficientOfVariation(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  if (mean === 0) return 0;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  return stdDev / mean;
}

/**
 * Computes momentum metrics for a time series (e.g. daily search volume, mention count, unit sales).
 * Requires at least 2 points; degrades gracefully with sparse data (flags via low persistence/0 breakout).
 */
export function computeMomentum(series: SeriesPoint[]): MomentumMetrics {
  const values = series.map((p) => p.value);
  const n = values.length;

  if (n < 2) {
    return {
      growthRatePct: 0,
      velocity: 0,
      acceleration: 0,
      ema7: values[0] ?? 0,
      ema3: values[0] ?? 0,
      slope: 0,
      volatility: 0,
      isBreakout: false,
      isSpike: false,
      persistenceDays: 0,
    };
  }

  const latest = values[n - 1];
  const previous = values[n - 2];
  const growthRatePct = previous === 0 ? (latest > 0 ? 100 : 0) : ((latest - previous) / previous) * 100;

  // Velocity: smoothed first-difference over the last up-to-5 points.
  const diffWindow = values.slice(Math.max(0, n - 6));
  const diffs: number[] = [];
  for (let i = 1; i < diffWindow.length; i++) diffs.push(diffWindow[i] - diffWindow[i - 1]);
  const velocity = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;

  // Acceleration: change in velocity (second derivative), smoothed over last up-to-6 diffs.
  const accelDiffs: number[] = [];
  for (let i = 1; i < diffs.length; i++) accelDiffs.push(diffs[i] - diffs[i - 1]);
  const acceleration = accelDiffs.length ? accelDiffs.reduce((a, b) => a + b, 0) / accelDiffs.length : 0;

  const ema7 = ema(values.slice(Math.max(0, n - 14)), 7);
  const ema3 = ema(values.slice(Math.max(0, n - 6)), 3);

  const slopeWindow = values.slice(Math.max(0, n - 10));
  const slope = linearSlope(slopeWindow);

  const volatilityWindow = values.slice(Math.max(0, n - 10));
  const volatility = coefficientOfVariation(volatilityWindow);

  // Breakout: latest value clears prior rolling max (excluding latest) by a healthy margin,
  // AND short EMA is above long EMA (momentum confirms the break, not just one noisy day).
  const priorValues = values.slice(0, n - 1);
  const priorMax = priorValues.length ? Math.max(...priorValues.slice(Math.max(0, priorValues.length - 14))) : 0;
  const isBreakout = priorMax > 0 && latest > priorMax * 1.15 && ema3 >= ema7;

  // Spike: a single-day jump far outside recent volatility (z-score style), which may NOT be
  // sustained momentum — flagged separately from breakout so the caller can discount it.
  const recentWindow = values.slice(Math.max(0, n - 8), n - 1);
  const recentMean = recentWindow.length ? recentWindow.reduce((a, b) => a + b, 0) / recentWindow.length : 0;
  const recentStd = recentWindow.length
    ? Math.sqrt(recentWindow.reduce((a, b) => a + (b - recentMean) ** 2, 0) / recentWindow.length)
    : 0;
  const isSpike = recentStd > 0 ? (latest - recentMean) / recentStd > 2.5 : false;

  // Persistence: how many consecutive trailing days had positive day-over-day growth.
  let persistenceDays = 0;
  for (let i = n - 1; i > 0; i--) {
    if (values[i] > values[i - 1]) persistenceDays++;
    else break;
  }

  return {
    growthRatePct: round2(growthRatePct),
    velocity: round2(velocity),
    acceleration: round2(acceleration),
    ema7: round2(ema7),
    ema3: round2(ema3),
    slope: round2(slope),
    volatility: round2(volatility),
    isBreakout,
    isSpike,
    persistenceDays,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
