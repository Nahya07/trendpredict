import { OpportunityLabel } from '../types/api';

const STYLES: Record<OpportunityLabel, string> = {
  EXTREME_OPPORTUNITY: 'bg-signal-rising/15 text-signal-rising border-signal-rising/40',
  VERY_HIGH: 'bg-signal-rising/15 text-signal-rising border-signal-rising/30',
  HIGH: 'bg-signal-hot/15 text-signal-hot border-signal-hot/30',
  PROMISING: 'bg-signal-hot/10 text-signal-hot/90 border-signal-hot/20',
  NEUTRAL: 'bg-scope-panelAlt text-ink-muted border-scope-line',
  WEAK: 'bg-signal-idle/10 text-ink-faint border-scope-line',
  AVOID: 'bg-signal-risk/15 text-signal-risk border-signal-risk/30',
};

const LABEL_TEXT: Record<OpportunityLabel, string> = {
  EXTREME_OPPORTUNITY: 'Extreme Opportunity',
  VERY_HIGH: 'Very High',
  HIGH: 'High',
  PROMISING: 'Promising',
  NEUTRAL: 'Neutral',
  WEAK: 'Weak',
  AVOID: 'Avoid',
};

export function ScoreBadge({ score, label }: { score: number; label: OpportunityLabel }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${STYLES[label]}`}>
      <span className="data-num font-semibold">{Math.round(score)}</span>
      <span>{LABEL_TEXT[label]}</span>
    </span>
  );
}
