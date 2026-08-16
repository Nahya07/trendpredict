# API Research (Req #55)

Investigated before any fallback/provider code was written, per the brief's instruction to
never build a scraper while an official API still works.

## Findings table

| API Name | URL | Official/3rd-party | Available? | Auth | Rate limit | Product data | Price data | Sales data | Affiliate data | Trend data | Region | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Shopee Affiliate Open API** | `open-api.affiliate.shopee.<region>/graphql` | Official (Shopee) | Yes, by application/approval | HMAC-SHA256 signed request, App ID + App Secret | Per-partner tier, not publicly published | Yes (`productOfferV2`, `shopOfferV2`, `brandOfferV2`) | Yes, current price only | No | Yes — your own click/conversion reports (`conversionReport`) | **No** | Multi-region (`.com.br`, `.com.my`, `.co.id`, `.sg`, ...) | This is the "Affiliate Open API Explorer" with App ID/Secret referenced in the brief. GraphQL, not REST. |
| **Shopee Open Platform** | `open.shopeemobile.com` | Official (Shopee) | Yes, seller/partner accounts | HMAC-SHA256, Partner ID + Partner Key | Documented per-endpoint | Yes, for your own shop's listings | Yes, for your own shop | Yes, for your own shop | No | No | Multi-region | Built for **sellers/ERPs** managing their own shop (orders, logistics, listings) — not for affiliate product discovery. Not the right fit for this product. |
| **Google Trends (public)** | `trends.google.com` | Unofficial when scraped; there is no public REST API with an API key | Partially | None for the public site; the *BigQuery public dataset* (`bigquery-public-data.google_trends`) is official but requires a billed GCP project | BigQuery query quotas | No | No | No | No | Yes — relative search interest | Global | We deliberately did **not** build against the unofficial scraped endpoint (would violate the "no bypassing platform mechanisms" rule). `GoogleTrendsProvider` is wired for the BigQuery path and stays disabled until a GCP project is configured. |
| **News APIs (licensed)** | vendor-specific | Third-party, licensed | Yes (paid tiers) | API key | Vendor-specific | No | No | No | No | Yes — article mention volume | Configurable | Generic `NewsProvider` written against a standard "search articles by keyword" shape; swap in whichever vendor you contract with. |
| **Social-listening APIs (licensed)** | vendor-specific | Third-party, licensed, or official platform Ads/Marketing APIs | Yes (paid tiers / partner access) | API key / OAuth | Vendor-specific | No | No | No | No | Yes — mention/engagement counts | Configurable | Never scrapes social platforms directly; only licensed aggregate-signal vendors. |

## What this means for the architecture

The Shopee Affiliate Open API is real, well-documented, and is exactly the "App ID / App
Secret / Affiliate Open API Explorer" setup described in the brief. It is genuinely useful
for:
- Current product listings, prices, and commission rates (`ShopeeAffiliateProvider.fetchProductOffers`)
- Your own affiliate click/conversion performance (Req #36 — not yet wired into a route in
  this build, see `docs/ROADMAP.md`)

It does **not** expose historical search-volume, category-wide trending signals, or
sales-velocity-over-time for arbitrary products — Shopee does not publish that data through
any official channel. That is exactly why the brief's own multi-provider fallback design
(Req #3) is load-bearing, not a fallback-of-last-resort: Google Trends / News / Social
providers are the *only* legitimate source of the "is this about to take off" signal this
product is built around.

## What we explicitly did not do

- Did not scrape `shopee.co.id` search/listing pages.
- Did not use any internal/undocumented Shopee endpoint.
- Did not scrape `trends.google.com` directly (used the BigQuery public dataset integration
  point instead, left disabled until credentials are supplied).
- Did not implement view/click/bot-traffic manipulation of any kind (explicitly out of scope
  per the brief, Req #35).
