import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../api/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ token: string; user: any }>('/auth/login', { email, password });
      login(res.token, res.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg border border-scope-line bg-scope-panel p-6">
        <h1 className="mb-1 font-display text-xl font-semibold text-ink">Masuk</h1>
        <p className="mb-5 text-sm text-ink-muted">Lanjutkan ke TrendPredict.</p>

        {error && <p className="mb-3 text-sm text-signal-risk">{error}</p>}

        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-ink-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-scope-line bg-scope-panelAlt px-3 py-2 text-ink focus:border-signal-rising/50"
          />
        </label>
        <label className="mb-5 block text-sm">
          <span className="mb-1 block text-ink-muted">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-scope-line bg-scope-panelAlt px-3 py-2 text-ink focus:border-signal-rising/50"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-signal-rising py-2 text-sm font-medium text-scope-bg hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
        <p className="mt-4 text-center text-xs text-ink-faint">
          Belum punya akun?{' '}
          <Link to="/register" className="text-signal-rising hover:underline">
            Daftar
          </Link>
        </p>
      </form>
    </div>
  );
}
