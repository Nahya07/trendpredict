import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

interface SearchProduct {
  id: string;
  name: string;
  image_url: string | null;
  price: number | null;
  category_name: string | null;
  is_demo_data: boolean;
}

export function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get<{ items: SearchProduct[] }>(`/products?q=${encodeURIComponent(query)}`);
      setResults(res.items);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Product Explorer</h1>
        <p className="mt-1 text-sm text-ink-muted">Cari produk, keyword, atau kategori yang sudah terekam sistem.</p>
      </header>

      <form onSubmit={onSubmit} className="mb-6 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="mis. kipas mini, powerbank..."
          className="flex-1 rounded-md border border-scope-line bg-scope-panel px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-signal-rising/50"
        />
        <button
          type="submit"
          className="rounded-md bg-signal-rising px-4 py-2 text-sm font-medium text-scope-bg hover:opacity-90"
        >
          Cari
        </button>
      </form>

      {loading && <p className="text-sm text-ink-faint">Mencari...</p>}

      {!loading && searched && results.length === 0 && (
        <p className="text-sm text-ink-faint">Tidak ada hasil untuk "{query}".</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((p) => (
          <Link
            key={p.id}
            to={`/products/${p.id}`}
            className="rounded-lg border border-scope-line bg-scope-panel p-4 transition hover:border-signal-rising/40"
          >
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-ink">{p.name}</p>
              {p.is_demo_data && (
                <span className="rounded border border-signal-idle/40 px-1 py-0.5 font-mono text-[9px] text-ink-faint">
                  Demo
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-ink-muted">{p.category_name ?? 'Tanpa kategori'}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
