import { DataProvider, NewsMention, ProviderResult, SocialMentionSignal, TrendSignalPoint } from './types';
import { CircuitBreaker, RateLimiter, withRetry } from './reliability';

/**
 * Google Trends does not have a stable, ToS-compliant public REST API with an official
 * API key — Google's own "Trends" data is exposed either through the limited BigQuery
 * public dataset or through unofficial reverse-engineered endpoints. This provider is
 * written against the BigQuery public dataset path (official, quota-limited) as the
 * "real" mode, and is disabled unless a GCP service-account key is configured — it never
 * falls back to scraping trends.google.com (Req #34 — no bypassing platform mechanisms).
 */
export class GoogleTrendsProvider implements DataProvider {
  readonly name = 'google_trends' as const;
  readonly requiresCredentials = true;
  private circuitBreaker = new CircuitBreaker(5, 120_000);
  private rateLimiter = new RateLimiter(3, 0.5);

  constructor(private config: { enabled: boolean; gcpProjectId?: string; gcpKeyJson?: string }) {}

  isConfigured(): boolean {
    return this.config.enabled && !!this.config.gcpProjectId && !!this.config.gcpKeyJson;
  }

  async healthCheck() {
    const s = this.circuitBreaker.getStatus();
    return { healthy: this.isConfigured() && s.state !== 'open', detail: this.isConfigured() ? `circuit=${s.state}` : 'not configured', lastSuccessAt: s.lastSuccessAt };
  }

  async fetchTrendSignal(keyword: string, days: number): Promise<ProviderResult<TrendSignalPoint[]>> {
    const fetchedAt = new Date().toISOString();
    if (!this.isConfigured() || !this.circuitBreaker.canRequest()) {
      return { ok: false, data: null, source: this.name, confidence: 'UNAVAILABLE', isDemoData: false, error: 'not configured or circuit open', fetchedAt };
    }
    try {
      await this.rateLimiter.take();
      // Placeholder for the actual BigQuery `bigquery-public-data.google_trends` query —
      // left as an integration point since it requires a billed GCP project. See
      // docs/API_RESEARCH.md for the exact table/query to wire in.
      throw new Error('BigQuery Google Trends integration not wired up in this build — see docs/API_RESEARCH.md');
    } catch (err: any) {
      this.circuitBreaker.recordFailure();
      return { ok: false, data: null, source: this.name, confidence: 'UNAVAILABLE', isDemoData: false, error: err.message, fetchedAt };
    }
  }
}

/**
 * Generic news provider — written against a standard "news search API" shape (e.g. a
 * licensed news aggregation API). Swap `apiBaseUrl` for whichever provider you contract
 * with; the important part is the NLP extraction step downstream (Req #9) doesn't care
 * which vendor supplied the raw articles.
 */
export class NewsProvider implements DataProvider {
  readonly name = 'news_provider' as const;
  readonly requiresCredentials = true;
  private circuitBreaker = new CircuitBreaker(5, 60_000);
  private rateLimiter = new RateLimiter(5, 1);

  constructor(private config: { enabled: boolean; apiKey?: string; apiBaseUrl?: string }) {}

  isConfigured(): boolean {
    return this.config.enabled && !!this.config.apiKey && !!this.config.apiBaseUrl;
  }

  async healthCheck() {
    const s = this.circuitBreaker.getStatus();
    return { healthy: this.isConfigured() && s.state !== 'open', detail: this.isConfigured() ? `circuit=${s.state}` : 'not configured', lastSuccessAt: s.lastSuccessAt };
  }

  async fetchNewsMentions(keyword: string, days: number): Promise<ProviderResult<NewsMention[]>> {
    const fetchedAt = new Date().toISOString();
    if (!this.isConfigured() || !this.circuitBreaker.canRequest()) {
      return { ok: false, data: null, source: this.name, confidence: 'UNAVAILABLE', isDemoData: false, error: 'not configured or circuit open', fetchedAt };
    }
    try {
      const data = await withRetry(async () => {
        await this.rateLimiter.take();
        const url = `${this.config.apiBaseUrl}/search?q=${encodeURIComponent(keyword)}&days=${days}&apiKey=${this.config.apiKey}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`News provider HTTP ${res.status}`);
        return res.json();
      });
      const mentions: NewsMention[] = (data.articles ?? []).map((a: any) => ({
        title: a.title,
        url: a.url,
        publishedAt: a.publishedAt,
        extractedKeywords: [],
        category: a.category ?? null,
      }));
      this.circuitBreaker.recordSuccess();
      return { ok: true, data: mentions, source: this.name, confidence: 'HIGH', isDemoData: false, fetchedAt };
    } catch (err: any) {
      this.circuitBreaker.recordFailure();
      return { ok: false, data: null, source: this.name, confidence: 'UNAVAILABLE', isDemoData: false, error: err.message, fetchedAt };
    }
  }
}

/**
 * Social signal provider — intended for a licensed social-listening API (e.g. an official
 * platform Marketing/Ads API, or a paid social-listening vendor) that is explicitly
 * permitted to serve aggregate mention/engagement counts. This module never scrapes
 * social platforms directly and never touches individual users' private engagement data.
 */
export class SocialSignalProvider implements DataProvider {
  readonly name = 'social_signal_provider' as const;
  readonly requiresCredentials = true;
  private circuitBreaker = new CircuitBreaker(5, 60_000);

  constructor(private config: { enabled: boolean; apiKey?: string; apiBaseUrl?: string }) {}

  isConfigured(): boolean {
    return this.config.enabled && !!this.config.apiKey && !!this.config.apiBaseUrl;
  }

  async healthCheck() {
    const s = this.circuitBreaker.getStatus();
    return { healthy: this.isConfigured() && s.state !== 'open', detail: this.isConfigured() ? `circuit=${s.state}` : 'not configured', lastSuccessAt: s.lastSuccessAt };
  }

  async fetchSocialMentions(keyword: string, days: number): Promise<ProviderResult<SocialMentionSignal[]>> {
    const fetchedAt = new Date().toISOString();
    if (!this.isConfigured() || !this.circuitBreaker.canRequest()) {
      return { ok: false, data: null, source: this.name, confidence: 'UNAVAILABLE', isDemoData: false, error: 'not configured or circuit open', fetchedAt };
    }
    return { ok: false, data: null, source: this.name, confidence: 'UNAVAILABLE', isDemoData: false, error: 'Vendor integration not selected yet — configure apiBaseUrl for your licensed social-listening vendor.', fetchedAt };
  }
}
