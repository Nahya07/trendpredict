import 'dotenv/config';

function bool(v: string | undefined, fallback = false): boolean {
  if (v === undefined) return fallback;
  return v.toLowerCase() === 'true' || v === '1';
}

function required(name: string, v: string | undefined): string {
  if (!v && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v ?? '';
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '4000', 10),

  DATABASE_URL: required('DATABASE_URL', process.env.DATABASE_URL),
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',

  JWT_SECRET: required('JWT_SECRET', process.env.JWT_SECRET) || 'dev-only-insecure-secret-change-me',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? 'dev-only-insecure-key-change-me-32b',

  // --- Provider toggles (Req #3) ---
  SHOPEE_API_ENABLED: bool(process.env.SHOPEE_API_ENABLED, false),
  SHOPEE_APP_ID: process.env.SHOPEE_APP_ID,
  SHOPEE_APP_SECRET: process.env.SHOPEE_APP_SECRET,
  SHOPEE_AFFILIATE_ID: process.env.SHOPEE_AFFILIATE_ID,
  SHOPEE_ACCESS_TOKEN: process.env.SHOPEE_ACCESS_TOKEN,
  SHOPEE_REFRESH_TOKEN: process.env.SHOPEE_REFRESH_TOKEN,
  SHOPEE_API_REGION: process.env.SHOPEE_API_REGION ?? 'id',
  SHOPEE_API_ENVIRONMENT: process.env.SHOPEE_API_ENVIRONMENT ?? 'production',
  SHOPEE_WEBHOOK_SECRET: process.env.SHOPEE_WEBHOOK_SECRET,

  GOOGLE_TRENDS_ENABLED: bool(process.env.GOOGLE_TRENDS_ENABLED, false),
  GCP_PROJECT_ID: process.env.GCP_PROJECT_ID,
  GCP_KEY_JSON: process.env.GCP_KEY_JSON,

  NEWS_ENABLED: bool(process.env.NEWS_ENABLED, false),
  NEWS_API_KEY: process.env.NEWS_API_KEY,
  NEWS_API_BASE_URL: process.env.NEWS_API_BASE_URL,

  SOCIAL_SIGNAL_ENABLED: bool(process.env.SOCIAL_SIGNAL_ENABLED, false),
  SOCIAL_API_KEY: process.env.SOCIAL_API_KEY,
  SOCIAL_API_BASE_URL: process.env.SOCIAL_API_BASE_URL,

  // --- App behavior ---
  DEMO_MODE_BANNER: bool(process.env.DEMO_MODE_BANNER, true),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};
