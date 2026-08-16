import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './api/AuthContext';
import { Shell } from './components/Shell';
import { Dashboard } from './pages/Dashboard';
import { TrendRadar } from './pages/TrendRadar';
import { ProductDetail } from './pages/ProductDetail';
import { Search } from './pages/Search';
import { PromoteToday } from './pages/PromoteToday';
import { Watchlist } from './pages/Watchlist';
import { Health } from './pages/Health';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<Shell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/radar" element={<TrendRadar />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/search" element={<Search />} />
            <Route path="/promote-today" element={<PromoteToday />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/health" element={<Health />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
