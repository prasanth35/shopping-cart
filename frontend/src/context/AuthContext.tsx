import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  setupRequired: boolean;
  login: (email: string, password: string) => Promise<void>;
  setup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.get<User>("/auth/me");
        setUser(me);
      } catch {
        try {
          const { setupRequired } = await api.get<{ setupRequired: boolean }>("/auth/setup-required");
          setSetupRequired(setupRequired);
        } catch {
          // ignore — API may be unreachable; login screen will surface errors on submit
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const me = await api.post<User>("/auth/login", { email, password });
    setUser(me);
  }

  async function setup(email: string, password: string) {
    const me = await api.post<User>("/auth/setup", { email, password });
    setUser(me);
    setSetupRequired(false);
  }

  async function logout() {
    await api.post("/auth/logout");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, setupRequired, login, setup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiError };
