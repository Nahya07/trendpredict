import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../api/AuthContext';

interface WatchlistItem {
  watchlist_id: string;
  id: string;
  name: string;
  price: number | null;
  is_demo_data: boolean;
  latest_fos_score: number | null;
  added_at: string;
}

export function Watchlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api
      .get<{ items: WatchlistItem[] }>('/watchlist')
      .then((res) => setItems(res.items))
      .catch((e) => setError(e.message));
  }, [user]);

  if (!user) {
    return (
      <div className="p-8">
        <p className="text-sm text-ink-muted">
          Silakan{' '}
          <Link to="/login" className="text-signal-rising hover:underline">
            masuk
          </Link>{' '}
          untuk melihat watchlist Anda.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Watchlist</h1>
        <p className="mt-1 text-sm text-ink-muted">Produk yang Anda pantau perkembangan skornya.</p>
      </header>

      {error && <p className="text-sm text-signal-risk">{error}</p>}

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <Link
            key={item.watchlist_id}
            to={`/products/${item.id}`}
            className="flex items-center justify-between rounded-lg border border-scope-line bg-scope-panel p-4 hover:border-signal-rising/40"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink">{item.name}</span>
              {item.is_demo_data && (
                <span className="rounded border border-signal-idle/40 px-1 py-0.5 font-mono text-[9px] text-ink-faint">
                  Demo
                </span>
              )}
            </div>
            <span className="data-num text-sm text-signal-rising">
              {item.latest_fos_score != null ? Math.round(item.latest_fos_score) : 'N/A'}
            </span>
          </Link>
        ))}
        {items.length === 0 && !error && (
          <p className="text-sm text-ink-faint">Belum ada produk di watchlist. Tambahkan dari halaman detail produk.</p>
        )}
      </div>
    </div>
  );
}
