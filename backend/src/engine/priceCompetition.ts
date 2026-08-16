export interface PricePoint {
  price: number; // in IDR
  conversions: number; // orders/clicks observed at this price band, from affiliate performance data
}

export interface PriceSweetSpotResult {
  bandMin: number;
  bandMax: number;
  reason: string;
  buckets: { bandMin: number; bandMax: number; conversions: number }[];
}

/**
 * Buckets observed prices into impulse-buy-relevant bands and finds where conversion
 * density is highest. Falls back to a documented Indonesian impulse-buy heuristic
 * (Rp15rb-Rp75rb) when there isn't enough conversion data yet — clearly labeled as
 * a heuristic default, not a measured result (Req #47 — never fabricate real-looking data).
 */
export function findPriceSweetSpot(points: PricePoint[]): PriceSweetSpotResult {
  if (points.length === 0) {
    return {
      bandMin: 15000,
      bandMax: 75000,
      reason: 'Belum ada data konversi — menggunakan heuristik impulse-buy umum (Rp15.000–Rp75.000).',
      buckets: [],
    };
  }

  const bandSize = 10000;
  const bucketMap = new Map<number, number>();
  for (const p of points) {
    const bandMin = Math.floor(p.price / bandSize) * bandSize;
    bucketMap.set(bandMin, (bucketMap.get(bandMin) ?? 0) + p.conversions);
  }

  const buckets = [...bucketMap.entries()]
    .map(([bandMin, conversions]) => ({ bandMin, bandMax: bandMin + bandSize, conversions }))
    .sort((a, b) => a.bandMin - b.bandMin);

  const best = buckets.reduce((max, b) => (b.conversions > max.conversions ? b : max), buckets[0]);

  return {
    bandMin: best.bandMin,
    bandMax: best.bandMax,
    reason: `Band harga ini memiliki konversi tertinggi dari data yang terkumpul (${best.conversions} konversi).`,
    buckets,
  };
}

export interface CompetitionInputs {
  demandScore: number; // 0-100
  activeAffiliateCount: number;
  contentSaturationScore: number; // 0-100, how saturated existing content is for this keyword/product
}

export interface CompetitionResult {
  demand: number;
  competition: number; // 0-100
  opportunity: number; // 0-100, demand-weighted, competition-penalized
}

/**
 * Affiliate Competition Score (Req #12). Deliberately rewards HIGH DEMAND + LOW COMPETITION
 * over raw demand — a product with demand=98/competition=97 should score lower than
 * demand=82/competition=31.
 */
export function computeCompetition(input: CompetitionInputs): CompetitionResult {
  const affiliateCompetitionScore = clamp(Math.log10(input.activeAffiliateCount + 1) * 35, 0, 100);
  const competition = clamp(
    round1(affiliateCompetitionScore * 0.6 + input.contentSaturationScore * 0.4),
    0,
    100
  );
  const demand = clamp(input.demandScore, 0, 100);
  const opportunity = clamp(round1(demand * (1 - competition / 130)), 0, 100);

  return { demand, competition, opportunity };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
