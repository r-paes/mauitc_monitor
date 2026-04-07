import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware de autenticação — protege rotas do dashboard.
 *
 * Verifica se o cookie refresh_token existe. Se não existe,
 * redireciona para /login. O cookie é HTTP-only (setado pelo backend),
 * então não pode ser falsificado via JavaScript.
 *
 * Nota: isso NÃO valida o token (seria necessário chamar o backend).
 * É apenas uma proteção de primeira camada — o backend rejeita
 * requests com token inválido/expirado (401), e o interceptor
 * do Axios redireciona para /login.
 */

const PUBLIC_PATHS = ["/login", "/api", "/webhooks", "/health", "/_next", "/favicon"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Não intercepta rotas públicas
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Permite arquivos estáticos
  if (pathname.includes(".")) {
    return NextResponse.next();
  }

  // Verifica presença do refresh_token cookie
  const refreshToken = request.cookies.get("refresh_token");

  if (!refreshToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
