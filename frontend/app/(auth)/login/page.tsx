"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { APP_LOGO_PATH, APP_NAME, APP_TAGLINE } from "@/lib/constants/app";
import { MESSAGES } from "@/lib/constants/ui";
import { useAuth } from "@/lib/hooks/useAuth";

export default function LoginPage() {
  const { login, loading, error } = useAuth();

  const [username, setUsername]       = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await login(username, password);
  }

  return (
    <div className="w-full max-w-sm">
      {/* Card */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-nav-border)",
          boxShadow: "var(--shadow-xl, 0 20px 60px rgba(0,0,0,0.4))",
        }}
      >
        {/* Header com logo */}
        <div
          className="px-8 pt-8 pb-6 text-center border-b"
          style={{
            background: "var(--color-topnav-bg)",
            borderColor: "var(--color-nav-border)",
          }}
        >
          <img
            src={APP_LOGO_PATH}
            alt={APP_NAME}
            className="h-10 w-auto object-contain mx-auto mb-3"
          />
          <p
            className="text-xs"
            style={{ color: "var(--color-sidebar-muted)" }}
          >
            {APP_TAGLINE}
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
          {/* Erro de autenticação */}
          {error && (
            <div
              className="px-4 py-3 rounded-lg text-sm"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "var(--color-critical)",
              }}
            >
              {error}
            </div>
          )}

          {/* E-mail / Usuário */}
          <div className="space-y-1.5">
            <label
              htmlFor="username"
              className="block text-xs font-medium"
              style={{ color: "var(--color-text-muted)" }}
            >
              E-mail
            </label>
            <input
              id="username"
              type="email"
              autoComplete="email"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={MESSAGES.placeholders.email}
              disabled={loading}
              className="w-full h-10 px-3 text-sm rounded-lg border transition-colors outline-none"
              style={{
                background: "var(--color-surface-2)",
                borderColor: "var(--color-border)",
                color: "var(--color-text)",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-primary)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-border)")
              }
            />
          </div>

          {/* Senha */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-medium"
              style={{ color: "var(--color-text-muted)" }}
            >
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={MESSAGES.placeholders.password}
                disabled={loading}
                className="w-full h-10 px-3 pr-10 text-sm rounded-lg border transition-colors outline-none"
                style={{
                  background: "var(--color-surface-2)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text)",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "var(--color-primary)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "var(--color-border)")
                }
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5"
                style={{ color: "var(--color-text-muted)" }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full h-10 rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 mt-2"
            style={{
              background: loading ? "var(--color-primary)" : "var(--color-primary)",
              opacity: loading || !username || !password ? 0.65 : 1,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Entrando...
              </>
            ) : (
              MESSAGES.buttons.login
            )}
          </button>
        </form>
      </div>

      {/* Rodapé discreto */}
      <p
        className="text-center text-xs mt-5"
        style={{ color: "var(--color-sidebar-muted)" }}
      >
        {APP_NAME} · Acesso restrito
      </p>
    </div>
  );
}
