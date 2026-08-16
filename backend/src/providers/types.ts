import { DataConfidence, DataSourceName } from '../types/domain';

export interface ProviderResult<T> {
  ok: boolean;
  data: T | null;
  source: DataSourceName;
  confidence: DataConfidence;
  isDemoData: boolean;
  error?: string;
  fetchedAt: string;
}

export interface ProductQuery {
  keyword?: string;
  categoryId?: string;
  itemId?: string;
  shopId?: string;
  limit?: number;
}

export interface RawProductOffer {
  externalId: string;
  name: string;
  imageUrl: string | null;
  price: number;
  currency: 'IDR';
  categoryHint: string | null;
  commissionRate: number | null;
  affiliateLink: string | null;
  shopName: string | null;
  ratingAvg: number | null;
  ratingCount: number | null;
}

export interface TrendSignalPoint {
  date: string;
  keyword: string;
  value: number; // relative search interest, 0-100 (Google-Trends-style) or raw mention count
}

export interface NewsMention {
  title: string;
  url: string;
  publishedAt: string;
  extractedKeywords: string[];
  category: string | null;
}

export interface SocialMentionSignal {
  date: string;
  keyword: string;
  mentionCount: number;
  platformHint: string | null;
}

/** Every provider — official or fallback — implements this same contract so the registry
 * can swap them without the caller knowing which one actually served the request. */
export interface DataProvider {
  readonly name: DataSourceName;
  readonly requiresCredentials: boolean;
  isConfigured(): boolean;
  healthCheck(): Promise<{ healthy: boolean; detail: string; lastSuccessAt: string | null }>;

  fetchProductOffers?(query: ProductQuery): Promise<ProviderResult<RawProductOffer[]>>;
  fetchTrendSignal?(keyword: string, days: number): Promise<ProviderResult<TrendSignalPoint[]>>;
  fetchNewsMentions?(keyword: string, days: number): Promise<ProviderResult<NewsMention[]>>;
  fetchSocialMentions?(keyword: string, days: number): Promise<ProviderResult<SocialMentionSignal[]>>;
}
