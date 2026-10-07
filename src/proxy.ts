import { NextResponse, type NextRequest } from 'next/server';
import { classifyHost } from '@/lib/hosts';
import { refreshSession } from '@/lib/supabase/proxy';

const ADMIN_SUBDOMAIN = (process.env.ADMIN_SUBDOMAIN ?? 'admin').toLowerCase();

// Internal route trees. They are only reachable through host-based rewrites.
const INTERNAL_PREFIXES = ['/console', '/site'];

function notFound(request: NextRequest) {
  return NextResponse.rewrite(new URL('/__not-found', request.url), { status: 404 });
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (INTERNAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return notFound(request);
  }

  const host = classifyHost(request.headers.get('host'), ADMIN_SUBDOMAIN);

  switch (host.kind) {
    case 'invalid':
      return notFound(request);

    case 'root':
      // Platform API routes live on tenant hosts only.
      if (pathname.startsWith('/api/')) return notFound(request);
      return NextResponse.next();

    case 'site': {
      if (pathname.startsWith('/api/')) {
        return pathname === '/api/view' ? NextResponse.next() : notFound(request);
      }
      const target = new URL(`/site/${host.slug}${pathname === '/' ? '' : pathname}${search}`, request.url);
      return NextResponse.rewrite(target);
    }

    case 'admin': {
      if (pathname.startsWith('/api/')) return notFound(request);

      const isLogin = pathname === '/login';
      // Membership in the admins table is verified by every console page and action;
      // here we only bounce requests that have no session at all.
      const target = new URL(`/console${pathname === '/' ? '' : pathname}${search}`, request.url);
      const { response, signedIn } = await refreshSession(request, () =>
        NextResponse.rewrite(target, { request }),
      );

      if (!signedIn && !isLogin && pathname !== '/robots.txt') {
        const login = new URL('/login', request.url);
        if (pathname !== '/') login.searchParams.set('next', pathname);
        return withCookies(NextResponse.redirect(login), response);
      }
      response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }
  }
}

/** Carry refreshed session cookies onto a redirect. */
function withCookies(target: NextResponse, source: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie);
  target.headers.set('Cache-Control', 'private, no-store');
  return target;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|apple-icon\\.png|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2)$).*)',
  ],
};
