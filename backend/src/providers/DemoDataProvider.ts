import {
  DataProvider,
  NewsMention,
  ProductQuery,
  ProviderResult,
  RawProductOffer,
  SocialMentionSignal,
  TrendSignalPoint,
} from './types';

/**
 * DEMO DATA MODE (Req #56). Every value this provider returns is synthetic and is always
 * tagged `isDemoData: true` + `confidence: 'SIMULATED'` all the way through the pipeline,
 * so the UI can render a persistent "DEMO DATA" badge and it can never be mistaken for a
 * real Shopee number (Req #47). Deterministic (seeded) so demo runs are reproducible.
 */
export class DemoDataProvider implements DataProvider {
  readonly name = 'demo_data' as const;
  readonly requiresCredentials = false;

  private seedProducts = [
    { keyword: 'mini fan portable', category: 'Elektronik', base: 32000 },
    { keyword: 'mini vacuum cleaner', category: 'Rumah Tangga', base: 45000 },
    { keyword: 'powerbank magnetik', category: 'Elektronik', base: 89000 },
    { keyword: 'lampu tidur karakter', category: 'Rumah Tangga', base: 27000 },
    { keyword: 'botol minum lipat', category: 'Lifestyle', base: 24000 },
    { keyword: 'organizer kabel magnetik', category: 'Elektronik', base: 19000 },
    { keyword: 'sunscreen stick', category: 'Kecantikan', base: 35000 },
    { keyword: 'tumbler self stirring', category: 'Rumah Tangga', base: 55000 },
    { keyword: 'holder hp mobil magnetik', category: 'Otomotif', base: 42000 },
    { keyword: 'kipas leher portable', category: 'Elektronik', base: 68000 },
  ];

  isConfigured(): boolean {
    return true;
  }

  async healthCheck() {
    return { healthy: true, detail: 'demo provider always available', lastSuccessAt: new Date().toISOString() };
  }

  private rng(seedStr: string): () => number {
    let seed = [...seedStr].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  async fetchProductOffers(query: ProductQuery): Promise<ProviderResult<RawProductOffer[]>> {
    const fetchedAt = new Date().toISOString();
    const matches = this.seedProducts.filter((p) =>
      query.keyword ? p.keyword.toLowerCase().includes(query.keyword.toLowerCase()) : true
    );
    const source = matches.length ? matches : this.seedProducts;

    const offers: RawProductOffer[] = source.slice(0, query.limit ?? 10).map((p, i) => {
      const r = this.rng(p.keyword);
      return {
        externalId: `DEMO-${p.keyword.replace(/\s+/g, '-')}-${i}`,
        name: `[DEMO] ${p.keyword[0].toUpperCase()}${p.keyword.slice(1)}`,
        imageUrl: null,
        price: Math.round((p.base * (0.85 + r() * 0.4)) / 100) * 100,
        currency: 'IDR',
        categoryHint: p.category,
        commissionRate: Math.round((3 + r() * 9) * 10) / 10,
        affiliateLink: null,
        shopName: '[DEMO] Toko Contoh',
        ratingAvg: Math.round((4 + r()) * 10) / 10,
        ratingCount: Math.round(50 + r() * 5000),
      };
    });

    return { ok: true, data: offers, source: this.name, confidence: 'SIMULATED', isDemoData: true, fetchedAt };
  }

  async fetchTrendSignal(keyword: string, days: number): Promise<ProviderResult<TrendSignalPoint[]>> {
    const fetchedAt = new Date().toISOString();
    const r = this.rng(keyword);
    // Some demo keywords get an "accelerating" shape, others flat/declining, so the
    // dashboard has a realistic mix to demonstrate every trend stage.
    const shape = r() > 0.6 ? 'accelerating' : r() > 0.3 ? 'flat' : 'declining';
    let value = 20 + r() * 30;
    const points: TrendSignalPoint[] = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (shape === 'accelerating') value *= 1.06 + r() * 0.08;
      else if (shape === 'declining') value *= 0.96 - r() * 0.03;
      else value *= 0.99 + r() * 0.02;
      points.push({ date: d.toISOString().slice(0, 10), keyword, value: Math.round(Math.max(1, value)) });
    }
    return { ok: true, data: points, source: this.name, confidence: 'SIMULATED', isDemoData: true, fetchedAt };
  }

  async fetchNewsMentions(keyword: string, days: number): Promise<ProviderResult<NewsMention[]>> {
    const fetchedAt = new Date().toISOString();
    const r = this.rng(keyword + 'news');
    const count = Math.round(r() * 6);
    const mentions: NewsMention[] = Array.from({ length: count }, (_, i) => ({
      title: `[DEMO] Artikel tren "${keyword}" #${i + 1}`,
      url: `https://example.invalid/demo-article-${i + 1}`,
      publishedAt: new Date(Date.now() - i * 86400000).toISOString(),
      extractedKeywords: [keyword],
      category: 'lifestyle',
    }));
    return { ok: true, data: mentions, source: this.name, confidence: 'SIMULATED', isDemoData: true, fetchedAt };
  }

  async fetchSocialMentions(keyword: string, days: number): Promise<ProviderResult<SocialMentionSignal[]>> {
    const fetchedAt = new Date().toISOString();
    const r = this.rng(keyword + 'social');
    const points: SocialMentionSignal[] = Array.from({ length: Math.min(days, 14) }, (_, i) => ({
      date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
      keyword,
      mentionCount: Math.round(r() * 200),
      platformHint: 'demo',
    }));
    return { ok: true, data: points, source: this.name, confidence: 'SIMULATED', isDemoData: true, fetchedAt };
  }
}
