import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { DashboardResponse } from '../types/api';
import { ProductCard } from '../components/ProductCard';
import { RadarScope } from '../components/RadarScope';

function KpiCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-lg border border-scope-line bg-scope-panel p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">{label}</p>
      <p className={`data-num mt-1.5 text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

export function Dashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<DashboardResponse>('/dashboard')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Ringkasan sinyal pasar hari ini — produk mana yang mulai bergerak sebelum ramai.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-signal-risk/40 bg-signal-risk/10 p-4 text-sm text-signal-risk">
          Gagal memuat data: {error}. Pastikan backend berjalan dan database sudah di-seed.
        </div>
      )}

      {data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard label="Emerging Products" value={data.kpis.emergingProducts} accent="text-signal-rising" />
            <KpiCard label="Accelerating Trends" value={data.kpis.acceleratingTrends} accent="text-signal-rising" />
            <KpiCard label="High Opportunity" value={data.kpis.highOpportunityProducts} accent="text-signal-hot" />
            <KpiCard label="Declining Categories" value={data.kpis.decliningCategories} accent="text-signal-risk" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <section className="lg:col-span-2 rounded-lg border border-scope-line bg-scope-panel p-5">
              <h2 className="mb-4 font-display text-sm font-semibold text-ink">Trend Radar</h2>
              <RadarScope items={data.topOpportunities} onSelect={(id) => navigate(`/products/${id}`)} />
              <p className="mt-4 text-center text-xs text-ink-faint">
                Titik dekat pusat = potensi masa depan tinggi. Klik titik untuk detail produk.
              </p>
            </section>

            <section className="lg:col-span-3 rounded-lg border border-scope-line bg-scope-panel p-5">
              <h2 className="mb-4 font-display text-sm font-semibold text-ink">Top Future Products</h2>
              <div className="flex flex-col gap-2">
                {data.topOpportunities.slice(0, 6).map((item) => (
                  <ProductCard key={item.product_id} item={item} />
                ))}
                {data.topOpportunities.length === 0 && (
                  <p className="text-sm text-ink-faint">
                    Belum ada produk yang di-score. Jalankan <code className="text-signal-rising">npm run seed</code> di
                    folder backend.
                  </p>
                )}
              </div>
            </section>
          </div>

          {data.hotCategories.length > 0 && (
            <section className="mt-6 rounded-lg border border-scope-line bg-scope-panel p-5">
              <h2 className="mb-4 font-display text-sm font-semibold text-ink">Hot Categories</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                {data.hotCategories.map((c) => (
                  <div key={c.name} className="rounded-md border border-scope-line bg-scope-panelAlt p-3">
                    <p className="truncate text-xs text-ink-muted">{c.name}</p>
                    <p className="data-num mt-1 text-lg font-semibold text-signal-rising">
                      {Math.round(Number(c.avg_fos))}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
