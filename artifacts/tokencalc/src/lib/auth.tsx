import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function apiUrl(path: string): string {
  return `${basePath}/api${path}`;
}

async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch(apiUrl("/auth/me"), {
    credentials: "include",
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Failed to fetch session (${res.status})`);
  const data = (await res.json()) as { user: AuthUser };
  return data.user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  const setUser = useCallback(
    (next: AuthUser | null) => {
      setUserState(next);
    },
    [setUserState],
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await fetchMe();
      setUserState(next);
    } catch {
      setUserState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch(apiUrl("/auth/logout"), {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUserState(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const id = user?.id ?? null;
    if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== id) {
      qc.clear();
    }
    prevUserIdRef.current = id;
  }, [user, qc]);

  return (
    <AuthContext.Provider value={{ user, isLoading, refresh, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export async function requestOtpCode(email: string): Promise<void> {
  const res = await fetch(apiUrl("/auth/request-otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(data?.error ?? `Request failed (${res.status})`);
  }
}

export async function verifyOtpCode(
  email: string,
  code: string,
): Promise<AuthUser> {
  const res = await fetch(apiUrl("/auth/verify-otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, code }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(data?.error ?? `Verification failed (${res.status})`);
  }
  const data = (await res.json()) as { user: AuthUser };
  return data.user;
}
