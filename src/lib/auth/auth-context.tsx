"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import type { AuthUser } from "@/lib/auth/types";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

type AuthProviderProps = PropsWithChildren<{
  initialUser?: AuthUser | null;
}>;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ initialUser = null, children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [isLoading, setIsLoading] = useState(false);
  const hasInitialUser = useRef(initialUser !== null);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/me", { credentials: "include" });
      if (!response.ok) {
        setUser(null);
        return;
      }

      const data = (await response.json()) as { user: AuthUser };
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasInitialUser.current) return;
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      refresh,
    }),
    [isLoading, refresh, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
