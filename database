-- TrendPredict database schema (PostgreSQL 15+)
-- Run via docker-compose (auto-mounted) or: psql $DATABASE_URL -f database/schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- =========================================================================
-- AUTH
-- =========================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- CATALOG
-- =========================================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT, -- Shopee item id, or DEMO-* for demo data
  name TEXT NOT NULL,
  image_url TEXT,
  category_id UUID REFERENCES categories(id),
  price NUMERIC(14, 2),
  currency TEXT NOT NULL DEFAULT 'IDR',
  shop_name TEXT,
  rating_avg NUMERIC(3, 2),
  rating_count INTEGER,
  affiliate_link TEXT,
  commission_rate NUMERIC(5, 2),
  source data_source_name_t, -- see enum below
  is_demo_data BOOLEAN NOT NULL DEFAULT false,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (external_id, source)
);

CREATE TABLE IF NOT EXISTS keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT UNIQUE NOT NULL,
  category_id UUID REFERENCES categories(id),
  first_detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag TEXT UNIQUE NOT NULL,
  hashtag_type TEXT NOT NULL DEFAULT 'BROAD'
    CHECK (hashtag_type IN ('BROAD', 'PRODUCT', 'PROBLEM', 'AUDIENCE', 'INTENT', 'EMERGING')),
  opportunity_score NUMERIC(5, 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- TREND SIGNALS (time series)
-- =========================================================================
DO $$ BEGIN
  CREATE TYPE data_source_name_t AS ENUM (
    'shopee_affiliate_api', 'shopee_official_api', 'google_trends',
    'news_provider', 'social_signal_provider', 'public_web_provider',
    'historical_db', 'demo_data'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id UUID UNIQUE REFERENCES keywords(id), -- one "current state" row per keyword; trend_history holds the full time series
  product_id UUID REFERENCES products(id),
  category_id UUID REFERENCES categories(id),
  stage TEXT NOT NULL DEFAULT 'UNKNOWN'
    CHECK (stage IN ('UNKNOWN','SEED','EARLY_SIGNAL','EMERGING','ACCELERATING','RISING','PEAK','SATURATED','DECLINING','DEAD')),
  current_popularity NUMERIC(5, 2),
  future_potential NUMERIC(5, 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trend_history (
  id BIGSERIAL PRIMARY KEY,
  keyword_id UUID REFERENCES keywords(id),
  product_id UUID REFERENCES products(id),
  metric TEXT NOT NULL, -- 'search_volume' | 'mention_count' | 'sales_estimate' | ...
  value NUMERIC(14, 4) NOT NULL,
  source data_source_name_t NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'MEDIUM',
  is_demo_data BOOLEAN NOT NULL DEFAULT false,
  observed_date DATE NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trend_history_keyword_date ON trend_history (keyword_id, observed_date);
CREATE INDEX IF NOT EXISTS idx_trend_history_product_date ON trend_history (product_id, observed_date);

CREATE TABLE IF NOT EXISTS product_scores (
  id BIGSERIAL PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id),
  fos_score NUMERIC(5, 2) NOT NULL,
  fos_label TEXT NOT NULL,
  current_popularity NUMERIC(5, 2) NOT NULL,
  future_potential NUMERIC(5, 2) NOT NULL,
  dual_classification TEXT NOT NULL,
  breakdown_json JSONB NOT NULL,
  weights_json JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_scores_product_time ON product_scores (product_id, computed_at DESC);

CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  category TEXT,
  published_at TIMESTAMPTZ,
  extracted_keywords TEXT[],
  sentiment TEXT,
  source data_source_name_t NOT NULL,
  is_demo_data BOOLEAN NOT NULL DEFAULT false,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_signals (
  id BIGSERIAL PRIMARY KEY,
  keyword_id UUID REFERENCES keywords(id),
  observed_date DATE NOT NULL,
  mention_count INTEGER NOT NULL,
  platform_hint TEXT,
  source data_source_name_t NOT NULL,
  is_demo_data BOOLEAN NOT NULL DEFAULT false,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id),
  price NUMERIC(14, 2) NOT NULL,
  observed_date DATE NOT NULL,
  source data_source_name_t NOT NULL,
  is_demo_data BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_price_history_product_date ON price_history (product_id, observed_date);

-- =========================================================================
-- USER FEATURES
-- =========================================================================
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  alert_type TEXT NOT NULL, -- 'FOS_THRESHOLD' | 'ACCELERATION' | 'NEW_EMERGING'
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- PREDICTIONS & BACKTESTING (Req #28-29)
-- =========================================================================
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  horizon_days INTEGER NOT NULL CHECK (horizon_days IN (3, 7, 14, 30)),
  predicted_score NUMERIC(5, 2) NOT NULL,
  confidence_pct NUMERIC(5, 2) NOT NULL,
  predicted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS prediction_results (
  id BIGSERIAL PRIMARY KEY,
  prediction_id UUID NOT NULL REFERENCES predictions(id),
  actual_popularity_change NUMERIC(6, 2),
  was_directionally_correct BOOLEAN,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- PLATFORM / ADMIN
-- =========================================================================
CREATE TABLE IF NOT EXISTS api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider data_source_name_t NOT NULL UNIQUE,
  -- Values are application-layer ENCRYPTED before insert; never store plaintext secrets here.
  encrypted_payload TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name data_source_name_t NOT NULL UNIQUE,
  is_configured BOOLEAN NOT NULL DEFAULT false,
  last_healthy_at TIMESTAMPTZ,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seasonal Event Calendar (Req #21) — admin-editable, not hard-coded
CREATE TABLE IF NOT EXISTS seasonal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  relevance_categories TEXT[],
  boost_weight NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scoring weight configuration (Req #4 — configurable, not static)
CREATE TABLE IF NOT EXISTS scoring_weight_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL DEFAULT 'default',
  weights_json JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Affiliate performance tracking (Req #36)
CREATE TABLE IF NOT EXISTS affiliate_performance (
  id BIGSERIAL PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id),
  observed_date DATE NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  orders INTEGER NOT NULL DEFAULT 0,
  commission_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  is_demo_data BOOLEAN NOT NULL DEFAULT false
);

COMMENT ON TABLE products IS 'Every row must carry source + is_demo_data (Req #47-48 — never let synthetic data look real).';
