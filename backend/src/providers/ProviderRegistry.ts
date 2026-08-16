import { env } from '../config/env';
import { ShopeeAffiliateProvider } from './ShopeeAffiliateProvider';
import { DemoDataProvider } from './DemoDataProvider';
import { GoogleTrendsProvider, NewsProvider, SocialSignalProvider } from './FallbackProviders';
import { DataProvider, ProductQuery, ProviderResult, RawProductOffer, TrendSignalPoint } from './types';

/**
 * Central registry. Callers ask for "product offers" or "trend signal" without knowing
 * which concrete provider serves it — the registry tries providers in priority order
 * (Req #2 priority list) and returns the first successful result, always reporting which
 * source actually answered (Req #48 data source transparency).
 */
export class ProviderRegistry {
  readonly shopeeAffiliate: ShopeeAffiliateProvider;
  readonly googleTrends: GoogleTrendsProvider;
  readonly news: NewsProvider;
  readonly social: SocialSignalProvider;
  readonly demo: DemoDataProvider;

  constructor() {
    this.shopeeAffiliate = new ShopeeAffiliateProvider({
      appId: env.SHOPEE_APP_ID,
      appSecret: env.SHOPEE_APP_SECRET,
      region: env.SHOPEE_API_REGION,
      enabled: env.SHOPEE_API_ENABLED,
    });
    this.googleTrends = new GoogleTrendsProvider({
      enabled: env.GOOGLE_TRENDS_ENABLED,
      gcpProjectId: env.GCP_PROJECT_ID,
      gcpKeyJson: env.GCP_KEY_JSON,
    });
    this.news = new NewsProvider({ enabled: env.NEWS_ENABLED, apiKey: env.NEWS_API_KEY, apiBaseUrl: env.NEWS_API_BASE_URL });
    this.social = new SocialSignalProvider({ enabled: env.SOCIAL_SIGNAL_ENABLED, apiKey: env.SOCIAL_API_KEY, apiBaseUrl: env.SOCIAL_API_BASE_URL });
    this.demo = new DemoDataProvider();
  }

  /** Product offers: official Shopee Affiliate API first, demo data as the only fallback
   * (there is no legitimate non-Shopee source of Shopee product/price data — Req #2/#34). */
  async getProductOffers(query: ProductQuery): Promise<ProviderResult<RawProductOffer[]>> {
    if (this.shopeeAffiliate.isConfigured()) {
      const result = await this.shopeeAffiliate.fetchProductOffers!(query);
      if (result.ok) return result;
    }
    return this.demo.fetchProductOffers(query);
  }

  /** Trend signal: Google Trends first (if configured), else demo data, clearly labeled. */
  async getTrendSignal(keyword: string, days = 14): Promise<ProviderResult<TrendSignalPoint[]>> {
    if (this.googleTrends.isConfigured()) {
      const result = await this.googleTrends.fetchTrendSignal!(keyword, days);
      if (result.ok) return result;
    }
    return this.demo.fetchTrendSignal!(keyword, days);
  }

  async getNewsMentions(keyword: string, days = 14) {
    if (this.news.isConfigured()) {
      const result = await this.news.fetchNewsMentions!(keyword, days);
      if (result.ok) return result;
    }
    return this.demo.fetchNewsMentions!(keyword, days);
  }

  async getSocialMentions(keyword: string, days = 14) {
    if (this.social.isConfigured()) {
      const result = await this.social.fetchSocialMentions!(keyword, days);
      if (result.ok) return result;
    }
    return this.demo.fetchSocialMentions!(keyword, days);
  }

  private all(): DataProvider[] {
    return [this.shopeeAffiliate, this.googleTrends, this.news, this.social, this.demo];
  }

  /** Powers the API Health Monitor page (Req #41). */
  async healthReport() {
    const entries = await Promise.all(
      this.all().map(async (p) => ({ name: p.name, configured: p.isConfigured(), ...(await p.healthCheck()) }))
    );
    return entries;
  }
}

export const providerRegistry = new ProviderRegistry();
