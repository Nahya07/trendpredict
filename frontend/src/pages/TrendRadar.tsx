import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { OpportunityItem, TrendStage } from '../types/api';
import { RadarScope } from '../components/RadarScope';
import { ProductCard } from '../components/ProductCard';

const STAGE_FILTERS: TrendStage[] = ['EARLY_SIGNAL', 'EMERGING', 'ACCELERATING', 'RISING'];

export function TrendRadar() {
  const [items, setItems] = useState<OpportunityItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [filter, setFilter] = useState<TrendStage | 'ALL'>('ALL');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  function load() {
    api
      .get<{ items: OpportunityItem[]; updatedAt: string }>('/trend-radar')
      .then((res) => {
        setItems(res.items);
        setUpdatedAt(res.updatedAt);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000); // auto-update, per spec Req #18
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === 'ALL' ? items : items.filter((i) => i.stage === filter);

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">🚨 Trend Radar</h1>
          <p className="mt-1 text-sm text-ink-muted">Produk yang sinyalnya baru mulai menguat.</p>
        </div>
        {updatedAt && (
          <p className="font-mono text-[11px] text-ink-faint">
            Update terakhir: {new Date(updatedAt).toLocaleTimeString('id-ID')}
          </p>
        )}
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-signal-risk/40 bg-signal-risk/10 p-4 text-sm text-signal-risk">
          Gagal memuat data: {error}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {(['ALL', ...STAGE_FILTERS] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wide transition ${
              filter === s
                ? 'border-signal-rising/50 bg-signal-rising/10 text-signal-rising'
                : 'border-scope-line text-ink-faint hover:text-ink'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="lg:col-span-2 rounded-lg border border-scope-line bg-scope-panel p-6">
          <RadarScope items={filtered} onSelect={(id) => navigate(`/products/${id}`)} />
        </section>
        <section className="lg:col-span-3 flex flex-col gap-2">
          {filtered.map((item) => (
            <ProductCard key={item.product_id} item={item} />
          ))}
          {filtered.length === 0 && !error && (
            <p className="text-sm text-ink-faint">Tidak ada produk pada stage ini saat ini.</p>
          )}
        </section>
      </div>
    </div>
  );
}
