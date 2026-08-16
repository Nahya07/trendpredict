import { createContext, useContext, useState, ReactNode } from 'react';
import { clearToken, setToken } from '../api/client';

interface User {
  id: string;
  email: string;
  display_name: string | null;
  role: 'ADMIN' | 'USER';
}

interface AuthContextValue {
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('trendpredict.user');
    return raw ? JSON.parse(raw) : null;
  });

  const login = (token: string, u: User) => {
    setToken(token);
    localStorage.setItem('trendpredict.user', JSON.stringify(u));
    setUser(u);
  };
  const logout = () => {
    clearToken();
    localStorage.removeItem('trendpredict.user');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
