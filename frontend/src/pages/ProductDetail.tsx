import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { ProductDetailResponse, ScoreBreakdownLine } from '../types/api';
import { ScoreBadge } from '../components/ScoreBadge';
import { StageTag } from '../components/StageTag';
import { ScoreHistoryChart } from '../components/ScoreHistoryChart';
import { useAuth } from '../api/AuthContext';

function parseBreakdown(raw: ScoreBreakdownLine[] | string | undefined): ScoreBreakdownLine[] {
  if (!raw) return [];
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return [];
  }
}

function formatIDR(n: number | null) {
  if (n == null) return 'N/A';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ProductDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watchlisted, setWatchlisted] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!id) return;
    api
      .get<ProductDetailResponse>(`/products/${id}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-signal-risk/40 bg-signal-risk/10 p-4 text-sm text-signal-risk">
          Gagal memuat produk: {error}
        </div>
        <Link to="/" className="mt-4 inline-block text-sm text-signal-rising hover:underline">
          &larr; Kembali ke Dashboard
        </Link>
      </div>
    );
  }
  if (!data) return <div className="p-8 text-sm text-ink-faint">Memuat...</div>;

  const { product, score, scoreHistory, priceHistory, trend } = data;
  const breakdown = parseBreakdown(score?.breakdown_json).sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
  );
  const positives = breakdown.filter((b) => b.contribution >= 0).slice(0, 5);
  const negatives = breakdown.filter((b) => b.contribution < 0).slice(0, 3);

  async function toggleWatchlist() {
    if (!user) return;
    try {
      if (watchlisted) {
        await api.del(`/watchlist/${id}`);
      } else {
        await api.post(`/watchlist/${id}`);
      }
      setWatchlisted(!watchlisted);
    } catch {
      /* non-fatal for MVP */
    }
  }

  return (
    <div className="p-8">
      <Link to="/radar" className="mb-4 inline-block text-xs text-ink-faint hover:text-signal-rising">
        &larr; Trend Radar
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold text-ink">{product.name}</h1>
            {product.is_demo_data && (
              <span className="rounded border border-signal-idle/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-faint">
                Demo Data
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {product.category_name ?? 'Tanpa kategori'} · {product.shop_name ?? 'Toko tidak diketahui'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {score && <ScoreBadge score={score.fos_score} label={score.fos_label} />}
          <StageTag stage={trend?.stage} />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <section className="rounded-lg border border-scope-line bg-scope-panel p-5">
            <h2 className="mb-3 font-display text-sm font-semibold text-ink">Current vs Future</h2>
            {score && (
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Current Popularity</p>
                  <p className="data-num text-2xl font-semibold text-signal-hot">{Math.round(score.current_popularity)}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Future Potential</p>
                  <p className="data-num text-2xl font-semibold text-signal-rising">{Math.round(score.future_potential)}</p>
                </div>
              </div>
            )}
            <ScoreHistoryChart data={scoreHistory} />
          </section>

          <section className="rounded-lg border border-scope-line bg-scope-panel p-5">
            <h2 className="mb-3 font-display text-sm font-semibold text-ink">Mengapa Produk Ini Berpotensi Naik</h2>
            {positives.length === 0 ? (
              <p className="text-sm text-ink-faint">Belum ada breakdown skor untuk produk ini.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {positives.map((line) => (
                  <li key={line.key} className="flex items-center justify-between rounded-md bg-scope-panelAlt px-3 py-2">
                    <span className="text-sm text-ink">{line.label}</span>
                    <span className="data-num text-sm text-signal-rising">{line.rawInput}/100</span>
                  </li>
                ))}
              </ul>
            )}
            {negatives.length > 0 && (
              <>
                <h3 className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                  Faktor Risiko
                </h3>
                <ul className="flex flex-col gap-2">
                  {negatives.map((line) => (
                    <li key={line.key} className="flex items-center justify-between rounded-md bg-scope-panelAlt px-3 py-2">
                      <span className="text-sm text-ink">{line.label}</span>
                      <span className="data-num text-sm text-signal-risk">{line.rawInput}/100</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="rounded-lg border border-scope-line bg-scope-panel p-5">
            <h2 className="mb-3 font-display text-sm font-semibold text-ink">Detail Produk</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-faint">Harga</dt>
                <dd className="data-num text-ink">{formatIDR(product.price)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-faint">Rating</dt>
                <dd className="data-num text-ink">{product.rating_avg ?? 'N/A'} ({product.rating_count ?? 0})</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-faint">Klasifikasi</dt>
                <dd className="text-ink">{score?.dual_classification ?? 'N/A'}</dd>
              </div>
            </dl>
            {user && (
              <button
                onClick={toggleWatchlist}
                className="mt-4 w-full rounded-md border border-signal-rising/40 py-2 text-sm text-signal-rising hover:bg-signal-rising/10"
              >
                {watchlisted ? '✓ Di Watchlist' : '+ Tambah ke Watchlist'}
              </button>
            )}
            {product.affiliate_link && (
              <a
                href={product.affiliate_link}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block w-full rounded-md bg-signal-rising py-2 text-center text-sm font-medium text-scope-bg hover:opacity-90"
              >
                Buka Link Affiliate
              </a>
            )}
          </section>

          {priceHistory.length > 1 && (
            <section className="rounded-lg border border-scope-line bg-scope-panel p-5">
              <h2 className="mb-3 font-display text-sm font-semibold text-ink">Histori Harga</h2>
              <ul className="flex flex-col gap-1 text-xs">
                {priceHistory.slice(-8).map((p, i) => (
                  <li key={i} className="flex justify-between text-ink-muted">
                    <span>{new Date(p.observed_date).toLocaleDateString('id-ID')}</span>
                    <span className="data-num">{formatIDR(p.price)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
