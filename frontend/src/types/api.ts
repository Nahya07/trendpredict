export type TrendStage =
  | 'UNKNOWN' | 'SEED' | 'EARLY_SIGNAL' | 'EMERGING' | 'ACCELERATING'
  | 'RISING' | 'PEAK' | 'SATURATED' | 'DECLINING' | 'DEAD';

export type OpportunityLabel =
  | 'EXTREME_OPPORTUNITY' | 'VERY_HIGH' | 'HIGH' | 'PROMISING' | 'NEUTRAL' | 'WEAK' | 'AVOID';

export interface OpportunityItem {
  product_id: string;
  name: string;
  image_url: string | null;
  is_demo_data: boolean;
  fos_score: number;
  fos_label: OpportunityLabel;
  current_popularity: number;
  future_potential: number;
  stage?: TrendStage;
}

export interface DashboardResponse {
  kpis: {
    emergingProducts: number;
    acceleratingTrends: number;
    highOpportunityProducts: number;
    decliningCategories: number;
  };
  topOpportunities: OpportunityItem[];
  hotCategories: { name: string; product_count: string; avg_fos: string }[];
}

export interface ScoreBreakdownLine {
  key: string;
  label: string;
  rawInput: number;
  weight: number;
  contribution: number;
}

export interface ProductDetailResponse {
  product: {
    id: string;
    name: string;
    image_url: string | null;
    price: number | null;
    shop_name: string | null;
    rating_avg: number | null;
    rating_count: number | null;
    category_name: string | null;
    is_demo_data: boolean;
    affiliate_link: string | null;
  };
  score: {
    fos_score: number;
    fos_label: OpportunityLabel;
    current_popularity: number;
    future_potential: number;
    dual_classification: string;
    breakdown_json: ScoreBreakdownLine[] | string;
  } | null;
  scoreHistory: { fos_score: number; current_popularity: number; future_potential: number; computed_at: string }[];
  priceHistory: { price: number; observed_date: string }[];
  trend: { stage: TrendStage } | null;
}

export interface PromoteTodayItem {
  productId: string;
  name: string;
  imageUrl: string | null;
  isDemoData: boolean;
  futureScore: number;
  label: OpportunityLabel;
  why: string[];
}
