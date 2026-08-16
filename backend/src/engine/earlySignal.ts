import { EarlySignalIndicator, EarlySignalResult } from '../types/domain';

export interface EarlySignalRawInputs {
  searchGrowthPct: number; // e.g. +34
  articleMentionGrowthPct: number; // e.g. +71
  videoMentionGrowthPct: number; // e.g. +48
  newKeywordCount: number; // count of newly-appearing related keywords this week
  similarProductGrowthPct: number; // average growth of adjacent/similar products
  priceStabilityPct: number; // 0-100, higher = more stable pricing (less discount volatility)
  affiliateCompetitionCount: number; // how many affiliates already actively promoting (lower is better)
}

const THRESHOLDS = {
  searchGrowthPct: 15,
  articleMentionGrowthPct: 20,
  videoMentionGrowthPct: 20,
  newKeywordCount: 2,
  similarProductGrowthPct: 10,
  priceStabilityPct: 60,
  affiliateCompetitionCount: 8, // triggered when BELOW this
};

/**
 * Detects "EARLY SIGNAL" by checking whether several *small* indicators are moving together,
 * even when absolute sales/popularity is still low. Requires >= 4 of 7 indicators to trigger
 * before declaring the signal detected (single-metric spikes are noise, not signal).
 */
export function detectEarlySignal(input: EarlySignalRawInputs): EarlySignalResult {
  const indicators: EarlySignalIndicator[] = [
    {
      key: 'search_growth',
      label: 'Pencarian mulai naik',
      triggered: input.searchGrowthPct >= THRESHOLDS.searchGrowthPct,
      detail: `${input.searchGrowthPct >= 0 ? '+' : ''}${input.searchGrowthPct}% pertumbuhan pencarian`,
    },
    {
      key: 'article_mentions',
      label: 'Artikel mulai bertambah',
      triggered: input.articleMentionGrowthPct >= THRESHOLDS.articleMentionGrowthPct,
      detail: `${input.articleMentionGrowthPct >= 0 ? '+' : ''}${input.articleMentionGrowthPct}% mention artikel`,
    },
    {
      key: 'video_mentions',
      label: 'Video pembahasan bertambah',
      triggered: input.videoMentionGrowthPct >= THRESHOLDS.videoMentionGrowthPct,
      detail: `${input.videoMentionGrowthPct >= 0 ? '+' : ''}${input.videoMentionGrowthPct}% mention video/sosial`,
    },
    {
      key: 'new_keywords',
      label: 'Keyword baru bermunculan',
      triggered: input.newKeywordCount >= THRESHOLDS.newKeywordCount,
      detail: `${input.newKeywordCount} keyword baru terdeteksi minggu ini`,
    },
    {
      key: 'similar_products',
      label: 'Produk serupa mulai meningkat',
      triggered: input.similarProductGrowthPct >= THRESHOLDS.similarProductGrowthPct,
      detail: `Rata-rata produk sejenis naik ${input.similarProductGrowthPct}%`,
    },
    {
      key: 'price_stability',
      label: 'Harga kompetitif & stabil',
      triggered: input.priceStabilityPct >= THRESHOLDS.priceStabilityPct,
      detail: `Skor stabilitas harga: ${input.priceStabilityPct}/100`,
    },
    {
      key: 'low_affiliate_competition',
      label: 'Kompetitor affiliate masih sedikit',
      triggered: input.affiliateCompetitionCount < THRESHOLDS.affiliateCompetitionCount,
      detail: `${input.affiliateCompetitionCount} affiliate aktif terdeteksi mempromosikan`,
    },
  ];

  const triggeredCount = indicators.filter((i) => i.triggered).length;

  return {
    detected: triggeredCount >= 4,
    triggeredCount,
    totalChecked: indicators.length,
    indicators,
  };
}
