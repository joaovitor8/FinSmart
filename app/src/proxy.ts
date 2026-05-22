import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/src/lib/auth";

// Rotas públicas (sem login)
const publicRoutes = ["/login", "/register", "/"];
// Rotas exclusivas de quem NÃO está logado
const authRoutes = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get("auth_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  const isAuthenticated = !!payload;

  // Rotas /api/* têm tratamento próprio — early return, não cai na lógica de páginas
  if (path.startsWith("/api/")) {
    // /api/auth/* (login, register, logout, me) é público
    if (path.startsWith("/api/auth")) {
      return NextResponse.next();
    }
    // Demais APIs exigem login — retorna 401 (NÃO redireciona, senão POST vira 307)
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.includes(path);
  const isAuthRoute = authRoutes.includes(path);

  // Página privada sem login → manda pro login (só atinge GET de páginas)
  if (!isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Login/register estando logado → manda pro dashboard
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/main/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Ignora assets estáticos e arquivos com extensão
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
