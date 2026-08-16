import { TrendStage } from '../types/api';

const STAGE_META: Record<TrendStage, { label: string; className: string }> = {
  UNKNOWN: { label: 'Unknown', className: 'text-ink-faint border-scope-line' },
  SEED: { label: 'Seed', className: 'text-ink-muted border-scope-line' },
  EARLY_SIGNAL: { label: 'Early Signal', className: 'text-signal-rising border-signal-rising/40' },
  EMERGING: { label: 'Emerging', className: 'text-signal-rising border-signal-rising/40' },
  ACCELERATING: { label: 'Accelerating', className: 'text-signal-rising border-signal-rising/50 shadow-glow' },
  RISING: { label: 'Rising', className: 'text-signal-hot border-signal-hot/40' },
  PEAK: { label: 'Peak', className: 'text-signal-hot border-signal-hot/40' },
  SATURATED: { label: 'Saturated', className: 'text-signal-idle border-scope-line' },
  DECLINING: { label: 'Declining', className: 'text-signal-risk border-signal-risk/40' },
  DEAD: { label: 'Dead', className: 'text-signal-risk/70 border-signal-risk/20' },
};

export function StageTag({ stage }: { stage: TrendStage | undefined }) {
  const meta = STAGE_META[stage ?? 'UNKNOWN'];
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-[11px] font-mono uppercase tracking-wide ${meta.className}`}>
      {meta.label}
    </span>
  );
}
