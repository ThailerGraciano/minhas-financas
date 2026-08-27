import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthRoute = req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/register";
  const isApiAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");

  // Não interferir nas rotas da API do NextAuth
  if (isApiAuthRoute) {
    return;
  }

  // Lógica para rotas de autenticação (login/register)
  if (isAuthRoute) {
    if (isLoggedIn) {
      // Redireciona para o Dashboard se já estiver logado
      return Response.redirect(new URL("/", req.nextUrl));
    }
    // Permite o acesso à página de login/registro se não estiver logado
    return;
  }

  // Lógica para rotas protegidas (todas as outras que passarem pelo matcher)
  if (!isLoggedIn) {
    // Redireciona para login e pode manter a URL de origem como callback
    return Response.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  // Protege todas as rotas, exceto rotas de API, arquivos do _next, favicon e rotas internas do turbopack
  matcher: ["/((?!api|_next/|__turbopack|favicon.ico).*)"],
};
