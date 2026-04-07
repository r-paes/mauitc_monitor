/**
 * app.ts — Identidade e endpoints globais da aplicação.
 * Todos os valores sensíveis à URL ou ambiente vêm de variáveis NEXT_PUBLIC_*.
 */

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "SpaceCRM Monitor";
export const APP_TAGLINE = "Painel de controle multi-instâncias Mautic";
export const APP_LOGO_PATH = "logo-space.webp";

export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const API_V1_PREFIX = "/api/v1";

export const APP_ENV =
  (process.env.NEXT_PUBLIC_APP_ENV as "development" | "production") ??
  "development";

export const IS_PRODUCTION = APP_ENV === "production";

/**
 * URL base para chamadas à API FastAPI.
 *
 * Em produção: relativa ("/api/v1") — o browser chama o mesmo domínio,
 * e o Next.js faz proxy via rewrites para o backend interno.
 * Isso garante que cookies HTTP-only funcionem (mesma origem).
 *
 * Em desenvolvimento: URL completa ("http://localhost:8000/api/v1").
 */
export const API_URL = IS_PRODUCTION
  ? API_V1_PREFIX
  : `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${API_V1_PREFIX}`;
