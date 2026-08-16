import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../api/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '◈' },
  { to: '/radar', label: 'Trend Radar', icon: '◎' },
  { to: '/search', label: 'Product Explorer', icon: '⌕' },
  { to: '/promote-today', label: 'Promote Today', icon: '↗' },
  { to: '/watchlist', label: 'Watchlist', icon: '☆' },
  { to: '/health', label: 'API Health', icon: '⚡' },
];

export function Shell() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-scope-line bg-scope-panel/60 px-4 py-6">
        <div className="mb-8 px-2">
          <p className="font-display text-lg font-semibold tracking-tight text-ink">
            Trend<span className="text-signal-rising">Predict</span>
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            Shopee Future Product Intelligence
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition ${
                  isActive
                    ? 'bg-scope-panelAlt text-signal-rising'
                    : 'text-ink-muted hover:bg-scope-panelAlt hover:text-ink'
                }`
              }
            >
              <span className="w-4 text-center text-xs">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-scope-line pt-4">
          {user ? (
            <div className="flex items-center justify-between px-2">
              <div className="min-w-0">
                <p className="truncate text-xs text-ink-muted">{user.display_name || user.email}</p>
              </div>
              <button onClick={logout} className="font-mono text-[10px] uppercase text-ink-faint hover:text-signal-risk">
                Keluar
              </button>
            </div>
          ) : (
            <NavLink to="/login" className="block px-2 text-xs text-signal-rising hover:underline">
              Masuk / Daftar
            </NavLink>
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
