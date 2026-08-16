import { Link } from 'react-router-dom';
import { OpportunityItem } from '../types/api';
import { ScoreBadge } from './ScoreBadge';
import { StageTag } from './StageTag';

export function ProductCard({ item }: { item: OpportunityItem }) {
  return (
    <Link
      to={`/products/${item.product_id}`}
      className="group flex items-center gap-3 rounded-lg border border-scope-line bg-scope-panel p-3 transition hover:border-signal-rising/40 hover:bg-scope-panelAlt"
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-scope-panelAlt text-ink-faint">
        {item.image_url ? (
          <img src={item.image_url} alt="" className="h-full w-full rounded-md object-cover" />
        ) : (
          <span className="font-mono text-[10px]">IMG</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-ink group-hover:text-signal-rising">{item.name}</p>
          {item.is_demo_data && (
            <span className="flex-shrink-0 rounded border border-signal-idle/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-ink-faint">
              Demo
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <StageTag stage={item.stage} />
        </div>
      </div>
      <ScoreBadge score={item.fos_score} label={item.fos_label} />
    </Link>
  );
}
