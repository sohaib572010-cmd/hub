import { NextResponse, type NextRequest } from 'next/server';
import { classifyHost } from '@/lib/hosts';
import { db } from '@/lib/supabase/admin';

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|quora|whatsapp|telegram|discord|headless|lighthouse/i;
const COOKIE = 'hub_v';

/**
 * Counts a portfolio view. The slug comes from the Host header (never the
 * body), requests must be same-origin, bots are ignored, and a 12-hour
 * host-only cookie stops repeat visits from incrementing the counter.
 */
export async function POST(request: NextRequest) {
  const hostHeader = request.headers.get('host');
  const host = classifyHost(hostHeader, (process.env.ADMIN_SUBDOMAIN ?? 'admin').toLowerCase());
  if (host.kind !== 'site') return new NextResponse(null, { status: 404 });

  const done = new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

  const fetchSite = request.headers.get('sec-fetch-site');
  const origin = request.headers.get('origin');
  let sameOrigin = false;
  if (fetchSite) sameOrigin = fetchSite === 'same-origin';
  else if (origin) {
    try {
      sameOrigin = new URL(origin).host === hostHeader;
    } catch {
      sameOrigin = false;
    }
  }
  if (!sameOrigin) return done;
  if (BOT.test(request.headers.get('user-agent') ?? '')) return done;
  if (request.cookies.get(COOKIE)) return done;

  const { error } = await db().rpc('increment_profile_views', { p_slug: host.slug });
  if (error) console.error('[view]', error.message);

  done.cookies.set(COOKIE, '1', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 12,
    path: '/',
  });
  return done;
}
