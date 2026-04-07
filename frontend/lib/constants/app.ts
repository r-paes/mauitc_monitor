/**
 * app.ts — Identidade e endpoints globais da aplicação.
 *
 * A API_URL é SEMPRE relativa ("/api/v1"). O browser chama o mesmo domínio
 * do frontend, e o reverse proxy (Traefik/EasyPanel) roteia /api/* para o
 * backend. Isso garante:
 *   - Cookies HTTP-only funcionam (mesma origem, sem CORS)
 *   - Zero dependência de variáveis de build para URLs
 *   - Funciona em qualquer ambiente (dev, staging, prod)
 */

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "SpaceCRM Monitor";
export const APP_TAGLINE = "Painel de controle multi-instâncias Mautic";
export const APP_LOGO_PATH = "logo-space.webp";

export const APP_ENV =
  (process.env.NEXT_PUBLIC_APP_ENV as "development" | "production") ??
  "development";

export const IS_PRODUCTION = APP_ENV === "production";

export const API_V1_PREFIX = "/api/v1";

/** URL base para chamadas à API — sempre relativa (mesma origem). */
export const API_URL = API_V1_PREFIX;
