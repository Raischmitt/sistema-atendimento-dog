import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // Rotas públicas liberadas
  const publicRoutes = ['/login', '/favicon.ico'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Se não estiver logado e tentar acessar uma rota protegida (ex: / ou /kanban)
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Se já estiver logado e tentar acessar o /login, redireciona para a home
  if (token && pathname === '/login') {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Aplica em todas as rotas exceto arquivos estáticos (_next, public, sounds)
     */
    '/((?!_next/static|_next/image|sounds|favicon.ico).*)',
  ],
};