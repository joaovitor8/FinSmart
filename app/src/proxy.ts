import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/src/lib/auth";

// Rotas públicas (sem login)
const publicRoutes = ["/login", "/register", "/", "/forgot-password", "/reset-password"];
// Rotas exclusivas de quem NÃO está logado
const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];

const isProd = process.env.NODE_ENV === "production";

// CSP com nonce por request. 'strict-dynamic' permite que os scripts assinados
// com nonce carreguem chunks adicionais do Next sem precisar listar URLs.
// 'unsafe-inline' fica só em style-src (React 19/Next 16 ainda emite estilos
// inline em animações/transições — remover quebra UI).
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get("auth_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  const isAuthenticated = !!payload;

  // /api/*: sem CSP (não retorna HTML)
  if (path.startsWith("/api/")) {
    if (path.startsWith("/api/auth")) {
      return NextResponse.next();
    }
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.includes(path);
  const isAuthRoute = authRoutes.includes(path);

  if (!isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/main/dashboard", request.url));
  }

  // Em dev: sem CSP (HMR do Next precisa de eval e inline scripts)
  if (!isProd) return NextResponse.next();

  // Em prod: gera nonce e injeta na request (Next propaga pros próprios scripts)
  // e na response (browser enforça).
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Ignora assets estáticos e arquivos com extensão
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
