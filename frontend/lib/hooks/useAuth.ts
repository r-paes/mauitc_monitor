"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authApi, type Me } from "@/lib/api/auth";
import { setAccessToken, getAccessToken } from "@/lib/api/client";

interface AuthState {
  user: Me | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // Inicializa sessão a partir do refresh_token salvo
  useEffect(() => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      setState({ user: null, loading: false, error: null });
      return;
    }

    authApi
      .refresh(refreshToken)
      .then(({ access_token, refresh_token }) => {
        setAccessToken(access_token);
        localStorage.setItem("refresh_token", refresh_token);
        return authApi.me();
      })
      .then((user) => setState({ user, loading: false, error: null }))
      .catch(() => {
        localStorage.removeItem("refresh_token");
        setState({ user: null, loading: false, error: null });
      });
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const tokens = await authApi.login({ username, password });
        setAccessToken(tokens.access_token);
        localStorage.setItem("refresh_token", tokens.refresh_token);
        const user = await authApi.me();
        setState({ user, loading: false, error: null });
        router.push("/dashboard");
      } catch {
        setState({ user: null, loading: false, error: "Credenciais inválidas." });
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    setAccessToken(null);
    localStorage.removeItem("refresh_token");
    setState({ user: null, loading: false, error: null });
    router.push("/login");
  }, [router]);

  return { ...state, login, logout };
}
