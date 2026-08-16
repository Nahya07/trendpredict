import { Router } from 'express';
import { getTopOpportunities } from '../db/repositories/trendsRepo';
import { providerRegistry } from '../providers/ProviderRegistry';

export const promoteTodayRouter = Router();

promoteTodayRouter.get('/', async (_req, res, next) => {
  try {
    const top = await getTopOpportunities(10);
    const withReasons = top.map((row: any) => ({
      productId: row.product_id,
      name: row.name,
      imageUrl: row.image_url,
      isDemoData: row.is_demo_data,
      futureScore: row.fos_score,
      label: row.fos_label,
      why: summarizeBreakdown(row.breakdown_json),
    }));
    res.json({ items: withReasons, generatedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

function summarizeBreakdown(breakdownJson: any): string[] {
  try {
    const lines = typeof breakdownJson === 'string' ? JSON.parse(breakdownJson) : breakdownJson;
    return [...lines]
      .sort((a: any, b: any) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 3)
      .map((l: any) => `${l.label}: ${l.rawInput}/100`);
  } catch {
    return [];
  }
}

export const healthRouter = Router();

healthRouter.get('/', async (_req, res, next) => {
  try {
    const report = await providerRegistry.healthReport();
    res.json({ providers: report, checkedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});
