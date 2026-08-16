import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { PromoteTodayItem } from '../types/api';

export function PromoteToday() {
  const [items, setItems] = useState<PromoteTodayItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ items: PromoteTodayItem[] }>('/promote-today')
      .then((res) => setItems(res.items))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Apa yang harus saya promosikan hari ini?</h1>
        <p className="mt-1 text-sm text-ink-muted">10 peluang teratas berdasarkan Future Opportunity Score.</p>
      </header>

      {error && (
        <div className="rounded-lg border border-signal-risk/40 bg-signal-risk/10 p-4 text-sm text-signal-risk">
          Gagal memuat data: {error}
        </div>
      )}

      <ol className="flex flex-col gap-3">
        {items.map((item, i) => (
          <li key={item.productId} className="rounded-lg border border-scope-line bg-scope-panel p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="data-num text-lg font-semibold text-ink-faint">#{i + 1}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/products/${item.productId}`} className="text-sm font-medium text-ink hover:text-signal-rising">
                      {item.name}
                    </Link>
                    {item.isDemoData && (
                      <span className="rounded border border-signal-idle/40 px-1 py-0.5 font-mono text-[9px] text-ink-faint">
                        Demo
                      </span>
                    )}
                  </div>
                  <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-muted">
                    {item.why.map((reason, idx) => (
                      <li key={idx}>· {reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <span className="data-num text-xl font-semibold text-signal-rising">{Math.round(item.futureScore)}</span>
            </div>
          </li>
        ))}
        {items.length === 0 && !error && <p className="text-sm text-ink-faint">Belum ada data untuk direkomendasikan.</p>}
      </ol>
    </div>
  );
}
