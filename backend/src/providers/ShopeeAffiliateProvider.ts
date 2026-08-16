import crypto from 'crypto';
import { DataProvider, ProductQuery, ProviderResult, RawProductOffer } from './types';
import { CircuitBreaker, RateLimiter, withRetry } from './reliability';

/**
 * OFFICIAL Shopee Affiliate Open API (GraphQL, HMAC-SHA256 signed requests).
 *
 * Confirmed against publicly documented usage (Shopee's own Help Center article
 * "API Access", plus the public Affiliate Open API Explorer / GraphQL schema for
 * productOfferV2 / shopOfferV2 / conversionReport). See docs/API_RESEARCH.md for
 * the full findings table (Req #55).
 *
 * IMPORTANT — what this API can and cannot do for TrendPredict:
 *   CAN:  current price, commission rate, product/shop offer listings, short-link
 *         generation, and YOUR OWN affiliate click/conversion reports.
 *   CANNOT: historical time-series (search volume growth, sales-velocity-over-time),
 *           category-wide "what's trending" signals, or any data about products you
 *           are not already looking up by keyword/shop/item id.
 * That's exactly why sections 3/6-9 need the other providers as genuine complements,
 * not just a fallback for when this one is down.
 *
 * Credentials come from environment/Settings > API Configuration — never hard-coded,
 * never sent to the frontend (Req #2, #42).
 */
export class ShopeeAffiliateProvider implements DataProvider {
  readonly name = 'shopee_affiliate_api' as const;
  readonly requiresCredentials = true;

  private rateLimiter = new RateLimiter(5, 1); // 5 burst, 1 req/sec sustained — tune to your tier
  private circuitBreaker = new CircuitBreaker(5, 60_000);

  constructor(
    private config: {
      appId?: string;
      appSecret?: string;
      region?: string; // e.g. 'id', 'sg', 'my', 'br' — determines the GraphQL host
      enabled: boolean;
    }
  ) {}

  isConfigured(): boolean {
    return this.config.enabled && !!this.config.appId && !!this.config.appSecret;
  }

  private endpoint(): string {
    const region = this.config.region || 'id';
    return `https://open-api.affiliate.shopee.${region === 'id' ? 'co.id' : region}/graphql`;
  }

  /** Shopee's documented signing scheme: sha256(appId + timestamp + payload + appSecret),
   * sent as `Authorization: SHA256 Credential={appId},Timestamp={ts},Signature={sig}`. */
  private sign(payloadJson: string, timestamp: number): string {
    const factor = `${this.config.appId}${timestamp}${payloadJson}${this.config.appSecret}`;
    return crypto.createHash('sha256').update(factor).digest('hex');
  }

  private async graphqlRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('Shopee Affiliate API not configured (missing App ID/Secret or disabled).');
    }
    if (!this.circuitBreaker.canRequest()) {
      throw new Error('Shopee Affiliate API circuit breaker is open — skipping request.');
    }

    await this.rateLimiter.take();
    const body = JSON.stringify({ query, variables });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.sign(body, timestamp);

    try {
      const result = await withRetry(
        async () => {
          const res = await fetch(this.endpoint(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `SHA256 Credential=${this.config.appId},Timestamp=${timestamp},Signature=${signature}`,
            },
            body,
          });
          if (!res.ok) throw new Error(`Shopee Affiliate API HTTP ${res.status}`);
          const json = await res.json();
          if (json.errors?.length) throw new Error(json.errors[0]?.message ?? 'GraphQL error');
          return json.data as T;
        },
        { retries: 2, baseDelayMs: 500, timeoutMs: 8000 }
      );
      this.circuitBreaker.recordSuccess();
      return result;
    } catch (err) {
      this.circuitBreaker.recordFailure();
      throw err;
    }
  }

  async healthCheck() {
    const status = this.circuitBreaker.getStatus();
    return {
      healthy: this.isConfigured() && status.state !== 'open',
      detail: this.isConfigured() ? `circuit=${status.state}` : 'not configured',
      lastSuccessAt: status.lastSuccessAt,
    };
  }

  async fetchProductOffers(query: ProductQuery): Promise<ProviderResult<RawProductOffer[]>> {
    const fetchedAt = new Date().toISOString();
    try {
      const gql = `
        query Fetch($keyword: String, $page: Int, $limit: Int) {
          productOfferV2(keyword: $keyword, page: $page, limit: $limit) {
            nodes {
              itemId
              productName
              imageUrl
              price
              commissionRate
              offerLink
              shopName
              ratingStar
              priceMin
            }
          }
        }
      `;
      const data = await this.graphqlRequest<{
        productOfferV2: { nodes: any[] };
      }>(gql, { keyword: query.keyword ?? null, page: 0, limit: query.limit ?? 20 });

      const offers: RawProductOffer[] = (data.productOfferV2?.nodes ?? []).map((n) => ({
        externalId: String(n.itemId),
        name: n.productName,
        imageUrl: n.imageUrl ?? null,
        price: Number(n.price ?? n.priceMin ?? 0),
        currency: 'IDR',
        categoryHint: null,
        commissionRate: n.commissionRate != null ? Number(n.commissionRate) : null,
        affiliateLink: n.offerLink ?? null,
        shopName: n.shopName ?? null,
        ratingAvg: n.ratingStar != null ? Number(n.ratingStar) : null,
        ratingCount: null,
      }));

      return { ok: true, data: offers, source: this.name, confidence: 'HIGH', isDemoData: false, fetchedAt };
    } catch (err: any) {
      return {
        ok: false,
        data: null,
        source: this.name,
        confidence: 'UNAVAILABLE',
        isDemoData: false,
        error: err?.message ?? 'unknown error',
        fetchedAt,
      };
    }
  }
}
