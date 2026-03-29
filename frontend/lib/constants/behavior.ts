/**
 * behavior.ts — Configurações de comportamento e formatação.
 * Centraliza locale, timezone, paginação e timeouts.
 */

export const LOCALE = "pt-BR";
export const TIMEZONE = "America/Sao_Paulo";

export const DATE_FORMAT = "dd/MM/yyyy";
export const DATETIME_FORMAT = "dd/MM/yyyy HH:mm";
export const TIME_FORMAT = "HH:mm";

export const CURRENCY = "BRL";
export const DECIMAL_SEPARATOR = ",";
export const THOUSAND_SEPARATOR = ".";

export const ITEMS_PER_PAGE = 20;
export const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

/** Tempo em minutos até a sessão JWT expirar (deve espelhar ACCESS_TOKEN_EXPIRE_MINUTES) */
export const SESSION_TIMEOUT_MINUTES = 60;

/** Timeout padrão para requests HTTP (ms) */
export const REQUEST_TIMEOUT_MS = 30_000;

/** Intervalo de auto-refresh do dashboard (ms). 0 = desabilitado */
export const DASHBOARD_REFRESH_INTERVAL_MS = 60_000;

/** Número máximo de alertas recentes exibidos no widget do dashboard */
export const RECENT_ALERTS_LIMIT = 10;

/** Número máximo de relatórios recentes na listagem */
export const RECENT_REPORTS_LIMIT = 15;
