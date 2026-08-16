import { useEffect, useState } from 'react';
import { api } from '../api/client';

interface ProviderStatus {
  name: string;
  configured: boolean;
  healthy: boolean;
  detail: string;
  lastSuccessAt: string | null;
}

export function Health() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ providers: ProviderStatus[]; checkedAt: string }>('/health')
      .then((res) => {
        setProviders(res.providers);
        setCheckedAt(res.checkedAt);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">API Health Monitor</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Status setiap data provider. Provider yang belum dikonfigurasi otomatis fallback ke Demo Data.
        </p>
      </header>

      {error && <p className="text-sm text-signal-risk">{error}</p>}
      {checkedAt && <p className="mb-4 font-mono text-[11px] text-ink-faint">Dicek: {new Date(checkedAt).toLocaleString('id-ID')}</p>}

      <div className="flex flex-col gap-2">
        {providers.map((p) => (
          <div key={p.name} className="flex items-center justify-between rounded-lg border border-scope-line bg-scope-panel p-4">
            <div>
              <p className="text-sm font-medium text-ink">{p.name}</p>
              <p className="mt-0.5 text-xs text-ink-faint">{p.detail}</p>
            </div>
            <div className="flex items-center gap-2">
              {!p.configured && (
                <span className="rounded border border-signal-idle/40 px-2 py-0.5 font-mono text-[10px] uppercase text-ink-faint">
                  Not Configured
                </span>
              )}
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  p.healthy ? 'bg-signal-rising shadow-glow' : 'bg-signal-risk'
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
